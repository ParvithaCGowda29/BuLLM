import {useEffect,useRef,useState,type KeyboardEvent,type ReactElement} from 'react';
import {IconFolder,IconFiles,IconFileZip,IconCloudUp,IconPlus} from './icons';

// The Add files entry point, matching BAM's Upload screen: the sidebar button opens a small
// menu anchored under it (Choose folder / Bulk upload / Upload zip); each option opens the same
// upload modal (drop zone or browse, allowed types stated inside). Files picked here continue
// into the extraction flow at the Permission step.
type Mode='folder'|'files'|'zip';
type Opt={mode:Mode;label:string;icon:(p:{size?:number})=>ReactElement};
const OPTIONS:Opt[]=[
 {mode:'folder',label:'Choose folder',icon:IconFolder},
 {mode:'files',label:'Bulk upload',icon:IconFiles},
 {mode:'zip',label:'Upload zip',icon:IconFileZip},
];
const ACCEPT=['.xlsx','.csv','.zip','.pdf','.dxf','.dwg','.step','.stp','.docx','.md','.txt','.eml','.msg'];
const HELPER=`${ACCEPT.filter(t=>t!=='.zip').map(t=>t.slice(1).toUpperCase()).join(', ')} and ZIP archives`;

function openPicker(mode:Mode,onPick:(files:File[])=>void){
 const input=document.createElement('input');
 input.type='file';
 if(mode==='folder'){
  (input as HTMLInputElement&{webkitdirectory:boolean}).webkitdirectory=true;
 }else{
  input.accept=mode==='zip'?'.zip':ACCEPT.join(',');
  input.multiple=mode!=='zip';
 }
 input.onchange=()=>{const files=Array.from(input.files??[]);if(files.length)onPick(files);};
 input.click();
}

export function AddFilesMenu({onPick}:{onPick:(files:File[])=>void}){
 const[open,setOpen]=useState(false);
 const[modal,setModal]=useState<Mode|null>(null);
 const btn=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null);
 const close=(focus=true)=>{setOpen(false);if(focus)btn.current?.focus();};
 useEffect(()=>{
  if(!open)return;
  menu.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
  const outside=(e:PointerEvent)=>{if(!menu.current?.contains(e.target as Node)&&!btn.current?.contains(e.target as Node))close(false);};
  document.addEventListener('pointerdown',outside);
  return()=>document.removeEventListener('pointerdown',outside);
 },[open]);
 const onKey=(e:KeyboardEvent)=>{
  const items=Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')??[]);
  const i=items.indexOf(document.activeElement as HTMLButtonElement);
  if(e.key==='ArrowDown'){e.preventDefault();items[(i+1)%items.length]?.focus();}
  else if(e.key==='ArrowUp'){e.preventDefault();items[(i-1+items.length)%items.length]?.focus();}
  else if(e.key==='Escape'){e.preventDefault();close();}
 };
 return <div className="af-wrap">
  <button ref={btn} className="nav-upload" aria-haspopup="menu" aria-expanded={open} aria-controls="af-menu" onClick={()=>setOpen(o=>!o)}><IconPlus size={14}/> <span>Add files</span></button>
  {open&&<div ref={menu} id="af-menu" className="af-menu" role="menu" aria-label="Add files" onKeyDown={onKey}>
   {OPTIONS.map(o=><button key={o.mode} role="menuitem" className="af-item" onClick={()=>{close();setModal(o.mode);}}><o.icon size={16}/>{o.label}</button>)}
  </div>}
  <UploadModal mode={modal??'files'} open={modal!==null} onClose={()=>setModal(null)} onPick={onPick}/>
 </div>;
}

function UploadModal({mode,open,onClose,onPick}:{mode:Mode;open:boolean;onClose:()=>void;onPick:(files:File[])=>void}){
 const[over,setOver]=useState(false);
 const opt=OPTIONS.find(o=>o.mode===mode)??OPTIONS[1];
 const browse=()=>{onClose();openPicker(mode,onPick);};
 const drop=(list:FileList)=>{
  const files=mode==='zip'?Array.from(list).filter(f=>/\.zip$/i.test(f.name)):Array.from(list);
  if(files.length){onClose();onPick(files);}
 };
 return <dialog ref={el=>{if(!el)return;if(open&&!el.open)el.showModal();else if(!open&&el.open)el.close();}} className="af-dialog" aria-labelledby="af-title"
  onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
  <h2 id="af-title">{opt.label}</h2>
  <div className="af-body">
   <div className={'af-drop'+(over?' on':'')} role="button" tabIndex={0} aria-label="Drag and drop files here, or browse"
    onDragOver={e=>{e.preventDefault();setOver(true);}} onDragLeave={()=>setOver(false)}
    onDrop={e=>{e.preventDefault();setOver(false);drop(e.dataTransfer.files);}}
    onClick={browse} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();browse();}}}>
    <IconCloudUp size={20}/>
    <strong>{over?'Release to add files':'Drag and drop files here'}</strong>
    <span className="af-muted">or click to browse</span>
   </div>
   <p className="af-muted">Allowed file types: {mode==='zip'?'ZIP archives':HELPER}</p>
  </div>
  <div className="af-foot">
   <button type="button" className="af-btn-sec" onClick={onClose}>Cancel</button>
   <button type="button" className="af-btn-pri" onClick={browse}><opt.icon size={14}/>{mode==='folder'?'Browse folders':'Browse files'}</button>
  </div>
 </dialog>;
}
