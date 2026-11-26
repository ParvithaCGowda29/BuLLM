import {useEffect,useState} from 'react';
import Uppy from '@uppy/core';
import Dashboard from '@uppy/react/dashboard';
import '@uppy/core/css/style.min.css';
import '@uppy/dashboard/css/style.min.css';
import {unzipSync} from 'fflate';
import {autoMap,detectHeader,importDataRows,mappedRows,readImportFile,sheetKey,templateInRows,type ImportSheet,type MasterTarget} from './bulkImport';
import {newId} from './id';

export type ExtractScope={type:'all'}|{type:'tab';tab:string};
type Props={dark:boolean;scope:ExtractScope;masters:MasterTarget[];initialFiles:File[];onClose:()=>void;onImport:(entries:{master:string;values:string[][];files?:string[]}[])=>Promise<void>};

// At or above this header-match percent a fully resolved table is imported by Apply.
// A high percentage alone is never enough: every source column with content must be
// mapped or auto-ignored, and the master's ID column must be mapped.
const MATCH_OK=60;
const ACCEPT=['.xlsx','.csv','.zip','.pdf','.dxf','.dwg','.step','.stp','.docx','.md','.txt','.eml','.msg'];

// Intake takes any project document. Only tabular master data (.xlsx/.csv) is read and
// mapped; drawings, SOPs and client emails are never opened in this version.
const isTable=(name:string)=>/\.(xlsx|csv)$/i.test(name);
const isDoc=(name:string)=>/\.(pdf|dxf|dwg|step|stp|docx|md|txt|eml|msg)$/i.test(name);

type Picked={file:File;allowed:boolean;kind:'table'|'doc'};
type TablePlan={id:string;file:string;sheet:string;rows:string[][];headerRow:number;master:string;mapping:number[];ignored:number[];content:boolean[];included:boolean;blocked:string|null};

export function ExtractFlow({dark,scope,masters,initialFiles,onClose,onImport}:Props){
 const[busy,setBusy]=useState(false);
 const[error,setError]=useState('');
 const[pickError,setPickError]=useState('');
 const[count,setCount]=useState(0);
 // The Uppy dashboard is the whole intake (BAM review style): files picked in the Add files
 // menu are seeded here; removing one leaves it out, and its own browse adds more. It never
 // uploads anywhere: Apply reads its file list and hands the File objects to the same
 // processing the typed inputs used before (zip expansion, type classification).
 const[uppy]=useState(()=>new Uppy({autoProceed:false,restrictions:{maxNumberOfFiles:null,allowedFileTypes:ACCEPT}}));
 useEffect(()=>{
  const update=()=>setCount(uppy.getFiles().length);
  uppy.on('file-added',update);uppy.on('file-removed',update);
  // Skip files already in the dashboard (StrictMode runs this twice): adding a duplicate
  // would pop Uppy's duplicate-file notice.
  for(const f of initialFiles){if(uppy.getFiles().some(x=>x.name===f.name&&x.size===f.size))continue;try{uppy.addFile({name:f.name,type:f.type,data:f});}catch{/* unreadable file */}}
  update();
  // No uppy.destroy() here: StrictMode's setup/cleanup/setup cycle would kill the instance the
  // second setup still uses. The dialog is short-lived; Dashboard uninstalls its plugin on unmount.
  return()=>{uppy.off('file-added',update);uppy.off('file-removed',update);};
 },[uppy]);

 const headersOf=(name:string)=>masters.find(m=>m.name===name)?.headers||[];
 const mappedCount=(p:TablePlan)=>p.mapping.filter(i=>i>=0).length;
 const matchPct=(p:TablePlan)=>{const total=headersOf(p.master).length;return total?Math.round(mappedCount(p)/total*100):0;};
 const idMapped=(p:TablePlan)=>p.mapping.includes(0);
 // Columns that match no master field are ignored automatically (the user asked for
 // auto-ignore instead of a per-row Map columns step), so a table is safe to import
 // once something maps and the ID column is mapped. Ignored data is never imported.
 const resolvable=(p:TablePlan)=>!p.blocked&&mappedCount(p)>0&&idMapped(p);
 const autoIgnored=(a:Pick<TablePlan,'mapping'|'content'>)=>a.mapping.map((v,i)=>v<0&&a.content[i]?i:-1).filter(i=>i>=0);

 function analyze(file:string,sheet:ImportSheet,master:string):Pick<TablePlan,'headerRow'|'mapping'|'content'>{
  const headers=headersOf(master);
  const headerRow=headers.length?detectHeader(sheet.rows,headers):0;
  const width=sheet.rows.length?Math.max(...sheet.rows.map(r=>r.length)):0;
  const data=importDataRows(sheet.rows,headerRow);
  const content=Array.from({length:width},(_,i)=>!!(sheet.rows[headerRow]?.[i]||'').trim()||data.some(r=>(r[i]||'').trim()));
  const mapping=headers.length?autoMap(Array.from({length:width},(_,i)=>sheet.rows[headerRow]?.[i]||''),headers):[];
  return {headerRow,mapping,content};
 }
 function suggestMaster(sheet:ImportSheet,file:string):string{
  if(scope.type==='tab')return scope.tab;
  // A CSV carries one table, so the tab suggestion comes from the file name.
  const named=masters.find(m=>sheetKey(m.name)===sheetKey(sheet.name==='CSV'?file.replace(/\.csv$/i,''):sheet.name));
  if(named)return named.name;
  // No sheet-name match: offer the master whose fixed columns match this sheet best.
  let best=masters[0]?.name||'',bestMapped=0;
  for(const master of masters){
   const {mapping}=analyze(file,sheet,master.name);
   const mapped=mapping.filter(i=>i>=0).length;
   if(mapped>bestMapped){bestMapped=mapped;best=master.name;}
  }
  return best;
 }
 function planFor(file:string,sheet:ImportSheet):TablePlan{
  const template=templateInRows(sheet.rows);
  const blocked=template?`${template} template - filled template lists are uploaded under Add templates in the sidebar, not imported into Masters`:null;
  const master=suggestMaster(sheet,file);
  const found=analyze(file,sheet,master);
  const plan:TablePlan={id:newId(),file,sheet:sheet.name,rows:sheet.rows,master,ignored:autoIgnored(found),included:false,blocked,...found};
  plan.included=resolvable(plan)&&matchPct(plan)>=MATCH_OK;
  return plan;
 }

 async function addFiles(list:File[]):Promise<Picked[]>{
  setPickError('');
  const out:Picked[]=[];const skipped:string[]=[];
  for(const f of list){
   if(/\.zip$/i.test(f.name)){
    try{
     const entries=unzipSync(new Uint8Array(await f.arrayBuffer()));
     const inner=Object.entries(entries).filter(([path])=>/\.(xlsx|csv)$/i.test(path)&&!path.split('/').some(part=>part.startsWith('.')||part==='__MACOSX'));
     if(!inner.length){skipped.push(`${f.name} (no .xlsx or .csv inside)`);continue;}
     for(const [path,data] of inner)out.push({file:new File([data.buffer as ArrayBuffer],path.split('/').pop()||path),allowed:true,kind:'table'});
    }catch{skipped.push(`${f.name} (could not be read)`);}
    continue;
   }
   if(isTable(f.name)){out.push({file:f,allowed:true,kind:'table'});continue;}
   if(isDoc(f.name)){out.push({file:f,allowed:false,kind:'doc'});continue;}
   skipped.push(`${f.name} (not a project document type)`);
  }
  if(skipped.length)setPickError(`Skipped: ${skipped.join('; ')}.`);
  // Duplicates inside one batch are kept once.
  const seen=new Set<string>();
  return out.filter(p=>!seen.has(p.file.name)&&(seen.add(p.file.name),true));
 }

 // Apply: read the dashboard's table files, auto-map every sheet and import the tables
 // that resolve on their own. There is no review step (26 Nov 2026, per user).
 async function apply(){
  setBusy(true);setError('');
  try{
   const picked=await addFiles(uppy.getFiles().map(f=>new File([f.data as Blob],f.name,{type:f.type||undefined})));
   const tables=picked.filter(p=>p.kind==='table'&&p.allowed);
   const plans:TablePlan[]=[];const failed:string[]=[];
   for(const p of tables){
    try{
     const sheets=await readImportFile(p.file);
     for(const sheet of sheets){
      const nm=sheet.name.trim();
      // README sheets are documentation (their content lives on each tab's info icon) and the
      // Filetype tab is gone from Masters, so neither enters the import.
      if(/^read\s*me\b/i.test(nm)||/^filetype$/i.test(nm))continue;
      plans.push(planFor(p.file.name,sheet));
     }
    }catch(err){failed.push(`${p.file.name} (${err instanceof Error?err.message:'could not be read'})`);}
   }
   const ready=plans.filter(p=>p.included&&resolvable(p));
   if(!ready.length){
    setError(failed.length?`Nothing to import: ${failed.join('; ')}.`:'Nothing to import: no sheet in these files maps a master\'s ID column and enough of its columns.');
    setBusy(false);return;
   }
   const byMaster=new Map<string,string[][]>();
   const filesByMaster=new Map<string,string[]>();
   for(const p of ready){
    const rows=mappedRows(p.rows,p.headerRow,p.mapping,headersOf(p.master).length);
    byMaster.set(p.master,[...(byMaster.get(p.master)||[]),...rows]);
    filesByMaster.set(p.master,[...new Set([...(filesByMaster.get(p.master)||[]),p.file])]);
   }
   await onImport([...byMaster].filter(([,values])=>values.length).map(([master,values])=>({master,values,files:filesByMaster.get(master)||[]})));
   onClose();
  }catch(err){setError(err instanceof Error?err.message:String(err));setBusy(false);}
 }

 return <dialog ref={el=>{if(el&&!el.open)el.showModal();}} className="bulk-dialog ex-dialog" aria-labelledby="ex-title" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
  <div className="bulk-heading">
   <div>
    <h2 id="ex-title">Add files</h2>
   </div>
   <button aria-label="Close add files" disabled={busy} onClick={onClose}>×</button>
  </div>
  <div className="bulk-body">
   {pickError&&<p role="alert" className="bulk-error">{pickError}</p>}
   {error&&<p role="alert" className="bulk-error">{error}</p>}
   <Dashboard uppy={uppy} className="bm-uppy" width="100%" height={340} theme={dark?'dark':'light'} hideUploadButton disableStatusBar hideProgressDetails proudlyDisplayPoweredByUppy={false} showSelectedFiles fileManagerSelectionType="both" note="XLSX, CSV, PDF, DXF, DWG, STEP, STP, DOCX, MD, TXT, EML, MSG and ZIP archives · remove a file to leave it out"/>
  </div>
  <div className="bulk-footer">
   <span>{count?`${count} file${count===1?'':'s'} ready`:'Pick files to continue'}</span>
   <button disabled={busy} onClick={onClose}>Cancel</button>
   <button className="primary" disabled={busy||!count} onClick={()=>void apply()}>{busy?'Applying...':'Apply'}</button>
  </div>
 </dialog>;
}
