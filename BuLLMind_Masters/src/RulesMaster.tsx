import {useEffect,useMemo,useRef,useState} from 'react';
import {loadRows,saveRows,type RecordRow} from './provider';
import {nextRuleId,skillRefs} from './orgRuleData';
import {newId} from './id';
import {FAMILIES,familyColors,familyOf,categoryOf,normalizedStatus,parseRuleText,writeRuleText,parseOwnerVersion,bumpOwnerVersion,loadTpl,saveTpl,loadHistory,pushHistory,dismissedDups,dismissDup,dupKey,bestMatch,dupPairs,diffWords,ruleSimText,reviewMeta,type RuleTpl,type RuleStatus,type CondRow,type HistoryEntry} from './rulesTemplate';

type Props={revision:number;importNotice:{count:number;ids:string[];files:string[]}|null;onDismissImport:()=>void;onChanged:()=>void;onSkill:(id:string)=>void;notify:(text:string,bad?:boolean)=>void};
type Enriched={row:RecordRow;ruleId:string;name:string;desc:string;type:string;shape:'A'|'B'|'C';tpl:RuleTpl;family:string;category:string;status:RuleStatus;owner:string;version:string;skills:string[]};
type Editing={row:RecordRow;values:string[];tpl:RuleTpl;isNew:boolean};
type Menu={x:number;y:number;row?:RecordRow};

const COND_OPS=['<','<=','=','>=','>','!=','contains'];
const emptyTpl=():RuleTpl=>({intent:'',condition:[],action:'',source:'',reviewDate:'',family:'',category:'',retiredReason:''});

// Condition as structured IF / AND / OR rows (doc template). More than two rows earns the
// "split this rule" warning from the SOP's one-decision-per-rule writing rule.
function ConditionEditor({rows,onCommit}:{rows:CondRow[];onCommit:(next:CondRow[])=>void}){
 const set=(i:number,patch:Partial<CondRow>)=>onCommit(rows.map((r,k)=>k===i?{...r,...patch}:r));
 return <div className="rm-cond">
  {rows.map((r,i)=><div className="rm-cond-row" key={i}>
   {i===0?<span className="rm-cond-if">IF</span>:<select aria-label={`Condition ${i+1} join`} value={r.join} onChange={e=>set(i,{join:e.target.value as CondRow['join']})}>{['AND','OR'].map(j=><option key={j}>{j}</option>)}</select>}
   <input aria-label={`Condition ${i+1} field`} placeholder="field" defaultValue={r.field} onBlur={e=>{if(e.target.value!==r.field)set(i,{field:e.target.value})}}/>
   <select aria-label={`Condition ${i+1} operator`} value={r.op} onChange={e=>set(i,{op:e.target.value})}>{COND_OPS.map(o=><option key={o}>{o}</option>)}</select>
   <input aria-label={`Condition ${i+1} value`} placeholder="value" defaultValue={r.value} onBlur={e=>{if(e.target.value!==r.value)set(i,{value:e.target.value})}}/>
   <button className="rm-cond-x" aria-label={`Remove condition ${i+1}`} onClick={()=>onCommit(rows.filter((_,k)=>k!==i))}>×</button>
  </div>)}
  <button type="button" className="rm-linklike" onClick={()=>onCommit([...rows,{join:rows.length?'AND':'IF',field:'',op:'=',value:''}])}>+ Add condition row</button>
  {rows.length>2&&<span className="rm-warn">⚠ Long condition: split this rule</span>}
 </div>;
}
function CondView({rows}:{rows:CondRow[]}){
 if(!rows.length)return <span className="rm-dash">—</span>;
 return <>{rows.map((r,i)=><div className="rm-cr" key={i}><b>{i===0?'IF':r.join}</b> {r.field} <b>{r.op}</b> {r.value}</div>)}</>;
}
// Highlight words that differ between two texts (near-duplicate compare).
function DiffText({text,other}:{text:string;other:string}){
 const diff=diffWords(text,other);
 return <>{text.split(/(\s+)/).map((w,i)=>diff.has(w.toLowerCase().replace(/[^a-z0-9%]/g,''))?<span key={i} className="rm-diff">{w}</span>:<span key={i}>{w}</span>)}</>;
}

export function RulesMaster({revision,importNotice,onDismissImport,onChanged,onSkill,notify}:Props){
 const[rows,setRows]=useState<RecordRow[]>(()=>loadRows('Rules'));
 const[tpls,setTpls]=useState(()=>loadTpl());
 const[history,setHistory]=useState(()=>loadHistory());
 const[tab,setTab]=useState<'rules'|'review'|'hygiene'>('rules');
 const[chip,setChip]=useState<RuleStatus|'All'|null>(null); // null until first enrichment decides the default
 const[query,setQuery]=useState('');
 const[showRetired,setShowRetired]=useState(true);
 const[collapsed,setCollapsed]=useState<Record<string,boolean>>({});
 const[selection,setSelection]=useState<Set<string>>(new Set());
 const[menu,setMenu]=useState<Menu|null>(null);
 const[editing,setEditing]=useState<Editing|null>(null);
 const[selDraft,setSelDraft]=useState<string|null>(null);
 const[rejectFor,setRejectFor]=useState<string|null>(null);
 const[rejectReason,setRejectReason]=useState('');
 const[gateTicks,setGateTicks]=useState<Record<string,{value:boolean;recurs:boolean;determinism:boolean}>>({});
 const[dismissed,setDismissed]=useState<string[]>(()=>dismissedDups());
 const[hlCard,setHlCard]=useState<string|null>(null);
 const nameFocus=useRef<HTMLTextAreaElement|null>(null);

 useEffect(()=>{setRows(loadRows('Rules'))},[revision]);
 useEffect(()=>{if(!menu&&!editing)return;const close=()=>setMenu(null);const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setMenu(null);setEditing(null)}};window.addEventListener('click',close);window.addEventListener('keydown',key);return()=>{window.removeEventListener('click',close);window.removeEventListener('keydown',key)}},[menu,editing]);

 const skillsMaster=useMemo(()=>loadRows('Skills'),[revision]);
 const skillName=(id:string)=>skillsMaster.find(s=>s.values[0]===id)?.values[1]||'';

 const enriched=useMemo<Enriched[]>(()=>rows.map(row=>{const p=parseRuleText(row.values[1]||'');const tpl={...emptyTpl(),...(tpls[row.values[0]]||{})};const ov=parseOwnerVersion(row.values[5]||'');return{row,ruleId:row.values[0],name:p.name,desc:p.desc,type:p.type,shape:p.shape,tpl,family:familyOf(row,tpl),category:categoryOf(row,tpl),status:normalizedStatus(row.values[6]||''),owner:ov.owner,version:ov.version,skills:skillRefs(row.values[8]||'')}}),[rows,tpls]);
 const drafts=useMemo(()=>enriched.filter(e=>e.status==='Draft'),[enriched]);
 const counts=useMemo(()=>({Draft:drafts.length,Active:enriched.filter(e=>e.status==='Active').length,Retired:enriched.filter(e=>e.status==='Retired').length,All:enriched.length}),[enriched,drafts]);
 // Design default is Active; with every rule still a draft the grid opens on All instead of an empty page.
 const activeChip=chip??(counts.Active>0?'Active':'All');

 const activeRows=useMemo(()=>enriched.filter(e=>e.status!=='Retired'),[enriched]);
 const pairs=useMemo(()=>dupPairs(activeRows.map(e=>e.row)).filter(p=>!dismissed.includes(dupKey(p.a.values[0],p.b.values[0]))),[activeRows,dismissed]);
 const bestByRow=useMemo(()=>{const m=new Map<string,{row:RecordRow;pct:number}>();for(const p of pairs){const ka=p.a.values[0],kb=p.b.values[0];if(!m.has(ka)||m.get(ka)!.pct<p.pct)m.set(ka,{row:p.b,pct:p.pct});if(!m.has(kb)||m.get(kb)!.pct<p.pct)m.set(kb,{row:p.a,pct:p.pct})}return m},[pairs]);

 const hygiene=useMemo(()=>{
  const due=enriched.filter(e=>{const m=reviewMeta(e.tpl.reviewDate);return m&&(m.cls==='over'||m.cls==='soon')}).sort((a,b)=>a.tpl.reviewDate.localeCompare(b.tpl.reviewDate));
  const unused=enriched.filter(e=>!e.skills.length);
  const orphans=enriched.filter(e=>{const noSrc=!e.tpl.source.trim()&&!(e.row.values[2]||'').trim();const noOwner=!e.owner.trim();return noSrc||noOwner});
  return{due,unused,orphans,overdueN:due.filter(e=>reviewMeta(e.tpl.reviewDate)?.cls==='over').length,soonN:due.filter(e=>reviewMeta(e.tpl.reviewDate)?.cls==='soon').length};
 },[enriched]);
 const hygieneIssues=hygiene.due.length+hygiene.unused.length+pairs.length+hygiene.orphans.length;

 const importDups=useMemo(()=>{if(!importNotice)return 0;const fresh=new Set(importNotice.ids);const others=rows.filter(r=>!fresh.has(r.id));let n=0;for(const id of importNotice.ids){const row=rows.find(r=>r.id===id);if(!row)continue;const bm=bestMatch(row,others);if(bm&&bm.pct>=0.8)n++}return n},[importNotice,rows]);

 // One save path: every edit (inline, bench, drawer, approve, reject) bumps the version and
 // records history, so a rule's past versions stay recoverable. Browser-only, like the rest.
 function commit(rowId:string,nextValues:string[],nextTpl:RuleTpl,note:string){
  const current=loadRows('Rules');const row=current.find(r=>r.id===rowId);if(!row)return;
  const ruleId=row.values[0];
  const valuesChanged=JSON.stringify(nextValues)!==JSON.stringify(row.values);
  const tplChanged=JSON.stringify(nextTpl)!==JSON.stringify({...emptyTpl(),...(loadTpl()[ruleId]||{})});
  if(!valuesChanged&&!tplChanged)return;
  const from=parseOwnerVersion(row.values[5]||'').version||'v1';
  const bumped=[...nextValues];bumped[5]=bumpOwnerVersion(nextValues[5]);
  const to=parseOwnerVersion(bumped[5]).version;
  saveRows('Rules',current.map(r=>r.id===rowId?{...r,values:bumped}:r));
  saveTpl(ruleId,nextTpl);
  pushHistory(ruleId,{at:new Date().toISOString(),from,to,note});
  setRows(loadRows('Rules'));setTpls(loadTpl());setHistory(loadHistory());
  onChanged();
 }
 const commitEnriched=(e:Enriched,values:string[],tpl:RuleTpl,note:string)=>commit(e.row.id,values,tpl,note);
 function setStatus(e:Enriched,status:'Active'|'Retired',note:string,tplPatch:Partial<RuleTpl>={}){
  const values=[...e.row.values];values[6]=status;
  commitEnriched(e,values,{...e.tpl,...tplPatch},note);
 }
 function approve(e:Enriched){
  setStatus(e,'Active','Approved in Review');
  const rest=drafts.filter(d=>d.row.id!==e.row.id);
  setSelDraft(rest[0]?.row.id??null);setRejectFor(null);
  notify(`${e.ruleId} is now Active in the Rules grid.`);
 }
 function reject(e:Enriched){
  if(!rejectReason.trim()){setRejectFor(e.row.id);return}
  setStatus(e,'Retired',`Rejected in Review: ${rejectReason.trim()}`,{retiredReason:rejectReason.trim()});
  const rest=drafts.filter(d=>d.row.id!==e.row.id);
  setSelDraft(rest[0]?.row.id??null);setRejectFor(null);setRejectReason('');
  notify(`${e.ruleId} rejected and kept as Retired, with the reason.`);
 }
 function mergePair(draft:Enriched,canonical:RecordRow){
  const canonEn=enriched.find(x=>x.row.id===canonical.id);
  setStatus(draft,'Retired',`Merged into ${canonical.values[0]}`,{retiredReason:`Merged into ${canonical.values[0]}`});
  if(canonEn)commitEnriched(canonEn,canonEn.row.values,canonEn.tpl,`Merged ${draft.ruleId} in as a named exception`);
  const rest=drafts.filter(d=>d.row.id!==draft.row.id);
  setSelDraft(rest[0]?.row.id??null);
  notify(`${draft.ruleId} merged into ${canonical.values[0]}. The canonical rule keeps its ID.`);
 }
 function addRule(){
  setMenu(null);
  const values=Array(9).fill('');values[0]=nextRuleId(loadRows('Rules'));values[6]='Draft';
  const row={id:newId(),values};
  saveRows('Rules',[...loadRows('Rules'),row]);
  setRows(loadRows('Rules'));onChanged();
  notify(`${values[0]} added as a draft. Fill it in; it waits in Review until approved.`);
  openEditor(row,true);
 }
 function deleteRows(ids:Set<string>){
  setMenu(null);
  saveRows('Rules',loadRows('Rules').filter(r=>!ids.has(r.id)));
  setRows(loadRows('Rules'));setSelection(new Set());onChanged();
  notify(`${ids.size} rule${ids.size>1?'s':''} deleted.`);
 }
 function openEditor(row:RecordRow,isNew=false){
  const e=enriched.find(x=>x.row.id===row.id);
  setEditing({row,values:[...row.values],tpl:e?{...e.tpl,condition:e.tpl.condition.map(c=>({...c}))}:emptyTpl(),isNew});
 }
 function saveEditor(){
  if(!editing)return;
  const e=enriched.find(x=>x.row.id===editing.row.id);if(!e){setEditing(null);return}
  const p=parseRuleText(editing.values[1]||'');
  if(!p.name.trim()){notify('Enter the rule name before saving.',true);return}
  if(JSON.stringify(editing.values)===JSON.stringify(e.row.values)&&JSON.stringify(editing.tpl)===JSON.stringify(e.tpl)){setEditing(null);return}
  const detail:string[]=[];
  if(editing.values[1]!==e.row.values[1])detail.push('Name');
  if(editing.values[5]!==e.row.values[5])detail.push('Owner');
  if(editing.values[6]!==e.row.values[6])detail.push('Status');
  if(editing.values[8]!==e.row.values[8])detail.push('Skills');
  if(JSON.stringify(editing.tpl)!==JSON.stringify(e.tpl))detail.push('Template');
  commit(editing.row.id,editing.values,editing.tpl,`Edited: ${detail.join(', ')}`);
  setEditing(null);
  notify(`${e.ruleId} saved as a new version. The previous version stays in history.`);
 }
 function openSkillRef(ref:string){
  if(skillsMaster.some(s=>s.values[0]===ref))onSkill(ref);
  else notify(`Skill ${ref} is referenced by this rule but is not present in the current Skills master. Its link is preserved.`);
 }

 // Screen A rows: chip filter + search + show-retired, grouped family then category.
 const visible=useMemo(()=>{
  let list=enriched;
  if(activeChip!=='All')list=list.filter(e=>e.status===activeChip);
  if(!showRetired&&activeChip!=='Retired')list=list.filter(e=>e.status!=='Retired');
  const q=query.trim().toLowerCase();
  if(q)list=list.filter(e=>(e.row.values.join(' ')+' '+JSON.stringify(e.tpl)).toLowerCase().includes(q));
  return list;
 },[enriched,activeChip,showRetired,query]);
 const grouped=useMemo(()=>{
  const out:{family:string;count:number;cats:{name:string;rows:Enriched[]}[]}[]=[];
  for(const f of FAMILIES){
   const inFam=visible.filter(e=>e.family===f.key);if(!inFam.length)continue;
   const catNames=[...new Set(inFam.map(e=>e.category))].sort((a,b)=>a.localeCompare(b));
   out.push({family:f.key,count:inFam.length,cats:catNames.map(name=>({name,rows:inFam.filter(e=>e.category===name)}))});
  }
  return out;
 },[visible]);
 const allGroupKeys=useMemo(()=>grouped.flatMap(g=>[g.family,...g.cats.map(c=>g.family+'/'+c.name)]),[grouped]);

 const selDraftE=drafts.find(d=>d.row.id===selDraft)??null;
 useEffect(()=>{if(tab==='review'&&!selDraftE&&drafts.length)setSelDraft(drafts[0].row.id)},[tab,selDraftE,drafts]);
 const selDup=selDraftE?bestByRow.get(selDraftE.ruleId):undefined;
 const gate=selDraftE?(gateTicks[selDraftE.ruleId]||{value:false,recurs:false,determinism:false}):{value:false,recurs:false,determinism:false};

 const historyList=(id:string):HistoryEntry[]=>history[id]||[];
 const newIds=new Set(importNotice?.ids||[]);

 const statusPill=(e:Enriched)=><span className={`rm-pill rm-pill-${e.status.toLowerCase()}`} title={e.status==='Retired'&&e.tpl.retiredReason?`Retired: ${e.tpl.retiredReason}`:e.row.values[6]}>{e.status}</span>;
 const familyChip=(f:string)=>{const c=familyColors(f);return <span className="rm-fchip" style={{background:c.bg,color:c.fg,borderColor:c.bd}}>{f}</span>};

 function inlineCommit(e:Enriched,patch:{values?:string[];tpl?:Partial<RuleTpl>},note:string){
  commitEnriched(e,patch.values??e.row.values,{...e.tpl,...(patch.tpl||{})},note);
 }
 const sourceCell=(e:Enriched)=>{
  const link=e.tpl.source.trim();
  if(link)return /^https?:\/\//i.test(link)?<a className="rm-src" href={link} target="_blank" rel="noreferrer" onClick={ev=>ev.stopPropagation()}>⎘ {link.replace(/^https?:\/\//i,'').split('/').pop()||link}</a>:<span className="rm-src" title={link}>⎘ {link}</span>;
  const text=(e.row.values[2]||'').trim();
  if(text)return <span className="rm-mut2" title={text}>{text.length>42?text.slice(0,42)+'…':text}</span>;
  return <span className="rm-orphan">⚠ No source</span>;
 };

 return <div className="rm" onContextMenu={e=>{if(tab!=='rules')return;const rowEl=(e.target as HTMLElement).closest('.rm-r');const rowId=rowEl?.getAttribute('data-row');e.preventDefault();setMenu({x:Math.min(e.clientX,window.innerWidth-230),y:Math.min(e.clientY,window.innerHeight-140),row:rowId?rows.find(r=>r.id===rowId):undefined})}}>
  {importNotice&&<div className="rm-banner"><div className="rm-banner-ic">✦</div><div className="rm-banner-t"><b>{importNotice.count} rule candidate{importNotice.count===1?'':'s'} extracted</b><div>From {importNotice.files.length?importNotice.files.join(', '):'the last Add files import'}. {importDups?`${importDups} look${importDups===1?'s':''} like duplicate${importDups===1?'':'s'} of existing rules. `:''}Nothing is active until you approve it.</div></div><div className="rm-banner-sp"><button className="rm-btn rm-btn-pri" onClick={()=>setTab('review')}>Review drafts</button><button className="rm-btn" onClick={()=>{setTab('rules');setChip('Draft')}}>View in grid</button><button className="rm-banner-x" aria-label="Dismiss candidates banner" onClick={onDismissImport}>×</button></div></div>}

  <div className="rm-tabs"><div className="rm-seg">
   <button type="button" className={tab==='rules'?'on':''} onClick={()=>setTab('rules')}>Rules <i>{counts.All}</i></button>
   <button type="button" className={tab==='review'?'on':''} onClick={()=>setTab('review')}>Review {counts.Draft>0?<span className="rm-cnt2">{counts.Draft}</span>:<i>0</i>}</button>
   <button type="button" className={tab==='hygiene'?'on':''} onClick={()=>setTab('hygiene')}>Hygiene <i>{hygieneIssues}</i></button>
  </div><div className="rm-right">{tab==='rules'?'Saved in this browser only · No backend connected':tab==='review'?(counts.Draft?`${counts.Draft} draft${counts.Draft===1?'':'s'} waiting · nothing is active until you approve it`:'No drafts waiting'):'Updated just now · counts only, no rules are changed automatically'}</div></div>

  {tab==='rules'&&<>
   <div className="rm-wrow">
    <div className="rm-seg">{(['Draft','Active','Retired','All'] as const).map(s=><button type="button" key={s} className={activeChip===s?'on':''} onClick={()=>setChip(s)}>{s} <i>{counts[s]}</i></button>)}</div>
    <label className="rm-check"><input type="checkbox" checked={showRetired} onChange={e=>setShowRetired(e.target.checked)}/> Show retired (greyed)</label>
    <div className="rm-opts"><span>Group by: <b>Family</b> › <b>Category</b></span><button type="button" className="rm-linklike" onClick={()=>setCollapsed({})}>Expand all</button><button type="button" className="rm-linklike" onClick={()=>setCollapsed(Object.fromEntries(allGroupKeys.map(k=>[k,true])))}>Collapse all</button>
     <span className="rm-search"><input type="search" aria-label="Search rules" placeholder="Search rules" value={query} onChange={e=>setQuery(e.target.value)}/></span></div>
   </div>
   <div className="rm-note"><span>✎ Double-click to edit · Edits save as a new version · Right-click to add rows</span><span>10 fixed columns · Family and Category are the groups{selection.size>0&&<> · <button type="button" className="rm-linklike rm-danger" onClick={()=>{if(confirm(`Delete ${selection.size} selected rule${selection.size>1?'s':''}?`))deleteRows(selection)}}>Delete selected ({selection.size})</button></>}</span></div>
   <div className="rm-wg"><div className="rm-scroll"><div className="rm-inner">
    <div className="rm-hd"><div className="rm-c rm-w0"><input type="checkbox" aria-label="Select all visible rules" checked={visible.length>0&&visible.every(e=>selection.has(e.row.id))} onChange={ev=>setSelection(ev.target.checked?new Set(visible.map(e=>e.row.id)):new Set())}/></div><div className="rm-c rm-w1">Rule ID</div><div className="rm-c rm-w2">Name</div><div className="rm-c rm-w10">Status</div><div className="rm-c rm-w3">Intent</div><div className="rm-c rm-w4">Condition</div><div className="rm-c rm-w5">Action</div><div className="rm-c rm-w6">Source</div><div className="rm-c rm-w7">Owner / version</div><div className="rm-c rm-w8">Review date</div><div className="rm-c rm-w9">Used by</div></div>
    {grouped.map(g=><div key={g.family}>
     <div className="rm-g1" onClick={()=>setCollapsed(c=>({...c,[g.family]:!c[g.family]}))}><span className="rm-car">{collapsed[g.family]?'▸':'▾'}</span>{familyChip(g.family)}<span className="rm-cnt">{g.count} rule{g.count===1?'':'s'}</span></div>
     {!collapsed[g.family]&&g.cats.map(cat=><div key={cat.name}>
      <div className="rm-g2" onClick={()=>setCollapsed(c=>({...c,[g.family+'/'+cat.name]:!c[g.family+'/'+cat.name]}))}><span className="rm-car">{collapsed[g.family+'/'+cat.name]?'▸':'▾'}</span>{cat.name}<span className="rm-cnt">{cat.rows.length}</span></div>
      {!collapsed[g.family+'/'+cat.name]&&cat.rows.map(e=>{const rv=reviewMeta(e.tpl.reviewDate);const hist=historyList(e.ruleId);
       return <div key={e.row.id} data-row={e.row.id} className={'rm-r'+(e.status==='Retired'?' rm-ret':'')+(newIds.has(e.row.id)?' rm-hl':'')}>
        <div className="rm-c rm-w0"><input type="checkbox" aria-label={`Select ${e.ruleId}`} checked={selection.has(e.row.id)} onChange={ev=>{const n=new Set(selection);ev.target.checked?n.add(e.row.id):n.delete(e.row.id);setSelection(n)}}/></div>
        <div className="rm-c rm-w1"><button type="button" className="rm-mono rm-rule-open" title="Open rule editor" onClick={()=>openEditor(e.row)}>{e.ruleId}</button></div>
        <div className="rm-c rm-w2" onDoubleClick={()=>openEditor(e.row)}><b>{e.name}</b>{newIds.has(e.row.id)&&<span className="rm-nw">NEW</span>}</div>
        <div className="rm-c rm-w10">{statusPill(e)}</div>
        <div className="rm-c rm-w3 rm-mut2" title={e.tpl.intent} onDoubleClick={()=>openEditor(e.row)}>{e.tpl.intent||<span className="rm-dash">—</span>}</div>
        <div className="rm-c rm-w4" onDoubleClick={()=>openEditor(e.row)}><CondView rows={e.tpl.condition}/>{e.tpl.condition.length>2&&<span className="rm-warn">⚠ Long condition: split this rule</span>}</div>
        <div className="rm-c rm-w5" onDoubleClick={()=>openEditor(e.row)}>{e.tpl.action?<span className="rm-act">{e.tpl.action}</span>:<span className="rm-dash">—</span>}</div>
        <div className="rm-c rm-w6" onDoubleClick={()=>openEditor(e.row)}>{sourceCell(e)}</div>
        <div className="rm-c rm-w7" onDoubleClick={()=>openEditor(e.row)}>{e.owner?e.owner:<span className="rm-orphan">⚠ No owner</span>}<br/><span className="rm-mut" title={hist.length?`Previous versions: ${hist.map(h=>h.from).join(', ')}`:'No previous versions'}>{e.version||'v1'} ⟲{hist.length?` ${hist.length+1}`:''}</span></div>
        <div className="rm-c rm-w8" onDoubleClick={()=>openEditor(e.row)}>{rv?<span className={rv.cls==='over'?'rm-over':rv.cls==='soon'?'rm-soon':''}>{rv.label}<br/><span className="rm-rl">{rv.sub}</span></span>:<span className="rm-dash">—</span>}</div>
        <div className="rm-c rm-w9">{e.skills.map(ref=><button type="button" key={ref} className="rm-sk" title={skillName(ref)?`${ref} · ${skillName(ref)}`:ref} onClick={()=>openSkillRef(ref)}>{ref}</button>)}</div>
       </div>})}
     </div>)}
    </div>)}
    {!visible.length&&<p className="rm-empty">{query.trim()?'No matching rules.':activeChip==='All'?'No rules yet. Right-click to add one.':`No ${activeChip.toLowerCase()} rules${activeChip==='Active'&&counts.Draft?` - ${counts.Draft} draft${counts.Draft===1?'':'s'} wait in Review`:''}.`}</p>}
   </div></div></div>
  </>}

  {tab==='review'&&(selDraftE?<div className="rm-panes" key={selDraftE.row.id}>
   <div className="rm-pane"><div className="rm-ph">Draft queue<small>{drafts.length} waiting</small></div>
    {drafts.map(d=>{const dup=bestByRow.get(d.ruleId);return <div key={d.row.id} className={'rm-qi'+(d.row.id===selDraftE.row.id?' sel':'')} onClick={()=>{setSelDraft(d.row.id);setRejectFor(null)}}><b>{d.name||d.ruleId}</b><div className="rm-m">{familyChip(d.family)}{dup&&<span className="rm-dup">possible duplicate</span>}</div><div className="rm-m rm-mt3">{d.category}</div></div>})}
   </div>
   <div className="rm-pane"><div className="rm-ph">Draft rule<small>{selDraftE.ruleId}{(selDraftE.row.values[2]||'').trim()?` · ${(selDraftE.row.values[2]||'').split(';')[0].slice(0,60)}`:''}</small></div>
    <div className="rm-form">
     <div className="rm-fl">Name (the decision)</div><textarea className="rm-fv" rows={2} ref={nameFocus} defaultValue={selDraftE.name} onBlur={ev=>{if(ev.target.value!==selDraftE.name){const values=[...selDraftE.row.values];values[1]=writeRuleText(selDraftE.shape,selDraftE.type,ev.target.value,selDraftE.desc);inlineCommit(selDraftE,{values},'Name edited in Review')}}}/>
     <div className="rm-fl">Intent</div><input className="rm-fv" defaultValue={selDraftE.tpl.intent} placeholder="One line of prose: why this rule exists" onBlur={ev=>{if(ev.target.value!==selDraftE.tpl.intent)inlineCommit(selDraftE,{tpl:{intent:ev.target.value}},'Intent edited')}}/>
     <div className="rm-fl">Condition</div><ConditionEditor rows={selDraftE.tpl.condition} onCommit={next=>inlineCommit(selDraftE,{tpl:{condition:next}},'Condition edited')}/>
     <div className="rm-fl">Action</div><input className="rm-fv" defaultValue={selDraftE.tpl.action} placeholder="What happens when it fires" onBlur={ev=>{if(ev.target.value!==selDraftE.tpl.action)inlineCommit(selDraftE,{tpl:{action:ev.target.value}},'Action edited')}}/>
     <div className="rm-fgrid">
      <div><div className="rm-fl">Family</div><select className="rm-fv" value={selDraftE.family} onChange={ev=>inlineCommit(selDraftE,{tpl:{family:ev.target.value===familyOf(selDraftE.row)?'':ev.target.value}},'Family changed')}>{FAMILIES.map(f=><option key={f.key}>{f.key}</option>)}</select></div>
      <div><div className="rm-fl">Category</div><input className="rm-fv" defaultValue={selDraftE.category} onBlur={ev=>{if(ev.target.value!==selDraftE.category)inlineCommit(selDraftE,{tpl:{category:ev.target.value}},'Category changed')}}/></div>
      <div><div className="rm-fl">Owner</div><input className="rm-fv" defaultValue={selDraftE.owner} placeholder="Accountable owner" onBlur={ev=>{if(ev.target.value!==selDraftE.owner){const values=[...selDraftE.row.values];values[5]=/owner:/i.test(values[5])?values[5].replace(/([^:]*owner):\s*[^;]*/i,`$1 ${ev.target.value}`):`Owner: ${ev.target.value}${values[5]?'; '+values[5]:''}`;inlineCommit(selDraftE,{values},'Owner changed')}}}/></div>
     </div>
     <div className="rm-fgrid">
      <div><div className="rm-fl">Review date</div><input className="rm-fv" type="date" defaultValue={selDraftE.tpl.reviewDate} onChange={ev=>inlineCommit(selDraftE,{tpl:{reviewDate:ev.target.value}},'Review date set')}/></div>
      <div><div className="rm-fl">Source link</div><input className="rm-fv" defaultValue={selDraftE.tpl.source} placeholder="Link to the source document" onBlur={ev=>{if(ev.target.value!==selDraftE.tpl.source)inlineCommit(selDraftE,{tpl:{source:ev.target.value}},'Source edited')}}/></div>
     </div>
     {(selDraftE.row.values[2]||'').trim()&&<><div className="rm-fl">Where it came from (source / approval / evidence)</div><div className="rm-exc">"{selDraftE.row.values[2]}"</div></>}
    </div>
   </div>
   <div className="rm-pane"><div className="rm-ph">Decide</div>
    <div className="rm-gate"><b className="rm-gate-h">Does it earn a place?</b>
     {(['value','recurs','determinism'] as const).map(k=>{const label=k==='value'?'Value: changes a decision':k==='recurs'?'Recurs: the situation repeats':'Deterministic: yes / no test';return <label key={k} className="rm-gate-item"><input type="checkbox" checked={gate[k]} onChange={ev=>setGateTicks(g=>({...g,[selDraftE.ruleId]:{...gate,[k]:ev.target.checked}}))}/>{label}</label>})}
     <div className="rm-gate-item">{(selDraftE.row.values[2]||'').trim()||selDraftE.tpl.source.trim()?<span className="rm-ok">✓</span>:<span className="rm-no">!</span>}Has a source</div>
     <div className="rm-gate-item">{selDraftE.tpl.reviewDate?<span className="rm-ok">✓</span>:<span className="rm-no">!</span>}Upkeep: {selDraftE.tpl.reviewDate?'has a review date':'no review date yet'}</div>
    </div>
    {selDup&&selDup.pct>=0.8&&<div className="rm-cmp"><div className="rm-cmp-h">Near-duplicate <span className="rm-pct">{Math.round(selDup.pct*100)}% match</span></div>
     <div className="rm-col"><h6>This draft</h6><DiffText text={selDraftE.name||selDraftE.desc} other={ruleSimText(selDup.row)}/></div>
     <div className="rm-col"><h6>{selDup.row.values[0]} · {normalizedStatus(selDup.row.values[6]||'')}</h6><DiffText text={ruleSimText(selDup.row)} other={selDraftE.name||selDraftE.desc}/></div>
     <div className="rm-cmp-btns"><button className="rm-btn rm-btn-sm" onClick={()=>mergePair(selDraftE,selDup.row)}>Merge into {selDup.row.values[0]}</button><button className="rm-btn rm-btn-sm" onClick={()=>{dismissDup(dupKey(selDraftE.ruleId,selDup.row.values[0]));setDismissed(dismissedDups())}}>Keep both</button></div></div>}
    <div className="rm-acts">
     <button className="rm-btn rm-btn-pri" onClick={()=>approve(selDraftE)}>Approve and next</button>
     <button className="rm-btn" onClick={()=>nameFocus.current?.focus()}>Edit</button>
     {rejectFor===selDraftE.row.id?<div className="rm-reject"><input aria-label="Reject reason" placeholder="Short reason (kept with the retired rule)" value={rejectReason} onChange={e=>setRejectReason(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')reject(selDraftE)}} autoFocus/><div className="rm-reject-btns"><button className="rm-btn rm-btn-dng rm-btn-sm" onClick={()=>reject(selDraftE)}>Confirm reject</button><button className="rm-btn rm-btn-sm" onClick={()=>{setRejectFor(null);setRejectReason('')}}>Cancel</button></div></div>
     :<button className="rm-btn rm-btn-dng" onClick={()=>setRejectFor(selDraftE.row.id)}>Reject…</button>}
     <div className="rm-hint">Approved rules become Active in the Rules grid. Rejected rules are kept as Retired with a reason.</div>
    </div>
   </div>
  </div>:<div className="rm-pane rm-empty-pane"><p className="rm-empty">No drafts waiting. New rules from Add files or right-click land here for review before they go Active.</p></div>)}

  {tab==='hygiene'&&<>
   <div className="rm-cards">
    <div className={'rm-card red'+(hlCard==='due'?' on':'')} onClick={()=>setHlCard(hlCard==='due'?null:'due')}><div className="rm-n">{hygiene.due.length}</div><div className="rm-l">Due for review</div><div className="rm-s">{hygiene.overdueN} overdue, {hygiene.soonN} within 30 days</div></div>
    <div className={'rm-card amb'+(hlCard==='unused'?' on':'')} onClick={()=>setHlCard(hlCard==='unused'?null:'unused')}><div className="rm-n">{hygiene.unused.length}</div><div className="rm-l">Never used</div><div className="rm-s">No skill uses these rules</div></div>
    <div className={'rm-card amb'+(hlCard==='dups'?' on':'')} onClick={()=>setHlCard(hlCard==='dups'?null:'dups')}><div className="rm-n">{pairs.length}</div><div className="rm-l">Possible duplicates</div><div className="rm-s">{pairs.length} pair{pairs.length===1?'':'s'} above 80% match</div></div>
    <div className={'rm-card blu'+(hlCard==='orphans'?' on':'')} onClick={()=>setHlCard(hlCard==='orphans'?null:'orphans')}><div className="rm-n">{hygiene.orphans.length}</div><div className="rm-l">No source or owner</div><div className="rm-s">Cannot be trusted yet</div></div>
   </div>
   <div className={'rm-lists'+(hlCard?' rm-single':'')}>
    {(!hlCard||hlCard==='due')&&<div className="rm-pane rm-lst"><div className="rm-ph">Due for review<small>oldest first</small></div>
     {hygiene.due.map(e=>{const rv=reviewMeta(e.tpl.reviewDate)!;return <div className="rm-row" key={e.row.id}><div><b>{e.ruleId} {e.name.slice(0,60)}</b><div className="rm-mut2">{e.family} · {e.owner||'no owner'}</div></div><div className={'rm-mut '+(rv.cls==='over'?'rm-over':'rm-soon')} style={{fontWeight:600}}>{rv.label} · {rv.sub}</div><button className="rm-btn rm-btn-sm" onClick={()=>openEditor(e.row)}>Review</button></div>})}
     {!hygiene.due.length&&<p className="rm-empty">No rules due for review. Review dates are blank until set on a rule.</p>}</div>}
    {(!hlCard||hlCard==='dups')&&<div className="rm-pane rm-lst"><div className="rm-ph">Possible duplicates<small>compare opens the Review screen</small></div>
     {pairs.map(p=>{const pick=normalizedStatus(p.b.values[6]||'')==='Draft'?p.b:p.a;return <div className="rm-row" key={dupKey(p.a.values[0],p.b.values[0])}><div><b>{p.a.values[0]} ↔ {p.b.values[0]}</b><div className="rm-mut2">{parseRuleText(p.a.values[1]||'').name.slice(0,60)}</div></div><span className="rm-pct" style={{marginLeft:'auto'}}>{Math.round(p.pct*100)}%</span><button className="rm-btn rm-btn-sm" onClick={()=>{setSelDraft(pick.id);setHlCard(null);setTab('review')}}>Compare</button></div>})}
     {!pairs.length&&<p className="rm-empty">No pairs above 80% match.</p>}</div>}
    {(!hlCard||hlCard==='unused')&&<div className="rm-pane rm-lst"><div className="rm-ph">Never used<small>link to a skill or retire</small></div>
     {hygiene.unused.map(e=><div className="rm-row" key={e.row.id}><div><b>{e.ruleId} {e.name.slice(0,60)}</b><div className="rm-mut2">{e.family}{e.status==='Retired'?' · Retired':''}</div></div><button className="rm-btn rm-btn-sm" onClick={()=>openEditor(e.row)}>Review</button></div>)}
     {!hygiene.unused.length&&<p className="rm-empty">Every rule is linked to at least one skill.</p>}</div>}
    {(!hlCard||hlCard==='orphans')&&<div className="rm-pane rm-lst"><div className="rm-ph">No source or owner<small>add a link or an owner</small></div>
     {hygiene.orphans.map(e=>{const noSrc=!e.tpl.source.trim()&&!(e.row.values[2]||'').trim();const noOwner=!e.owner.trim();return <div className="rm-row" key={e.row.id}><div><b>{e.ruleId} {e.name.slice(0,60)}</b><div className="rm-mut2">{noSrc&&noOwner?'Missing source and owner':noSrc?'Missing source':'Missing owner'}</div></div><button className="rm-btn rm-btn-sm" onClick={()=>openEditor(e.row)}>Fix</button></div>})}
     {!hygiene.orphans.length&&<p className="rm-empty">Every rule has a source and an owner.</p>}</div>}
   </div>
  </>}

  {menu&&<div className="pop-menu context-menu" role="menu" style={{left:menu.x,top:menu.y}} onClick={e=>e.stopPropagation()}><button role="menuitem" className="primary" onClick={addRule}>Add rule</button>{menu.row&&<button role="menuitem" onClick={()=>{setMenu(null);openEditor(menu.row!)}}>Open rule</button>}{menu.row&&<button role="menuitem" className="danger" onClick={()=>{if(confirm(`Delete "${menu.row!.values[0]}" from Rules?`))deleteRows(new Set([menu.row!.id]))}}>Delete row</button>}</div>}

  {editing&&<div className="rm-shade" onMouseDown={()=>setEditing(null)}><section className="rm-drawer" role="dialog" aria-modal="true" aria-label="Rule editor" onMouseDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}>
   <header><div><h3>{editing.values[0]}</h3><small>{editing.isNew?'New rule. The ID is assigned and locked.':'ID locked. Edits save as a new version; the previous one stays in history.'}</small></div><button aria-label="Close rule editor" onClick={()=>setEditing(null)}>×</button></header>
   <div className="rm-drawer-form">
    <div className="rm-fl">Name (the decision)</div><textarea rows={3} value={parseRuleText(editing.values[1]).name} onChange={e=>{const p=parseRuleText(editing.values[1]);const values=[...editing.values];values[1]=writeRuleText(p.shape,p.type,e.target.value,p.desc);setEditing({...editing,values})}}/>
    <div className="rm-fl">Intent</div><input value={editing.tpl.intent} placeholder="One line of prose: why this rule exists" onChange={e=>setEditing({...editing,tpl:{...editing.tpl,intent:e.target.value}})}/>
    <div className="rm-fl">Condition</div><ConditionEditor rows={editing.tpl.condition} onCommit={next=>setEditing({...editing,tpl:{...editing.tpl,condition:next}})}/>
    <div className="rm-fl">Action</div><input value={editing.tpl.action} placeholder="What happens when it fires" onChange={e=>setEditing({...editing,tpl:{...editing.tpl,action:e.target.value}})}/>
    <div className="rm-fgrid">
     <div><div className="rm-fl">Family</div><select value={familyOf(editing.row,editing.tpl)} onChange={e=>setEditing({...editing,tpl:{...editing.tpl,family:e.target.value===familyOf(editing.row)?'':e.target.value}})}>{FAMILIES.map(f=><option key={f.key}>{f.key}</option>)}</select></div>
     <div><div className="rm-fl">Category</div><input value={categoryOf(editing.row,editing.tpl)} onChange={e=>setEditing({...editing,tpl:{...editing.tpl,category:e.target.value}})}/></div>
     <div><div className="rm-fl">Owner</div><input value={parseOwnerVersion(editing.values[5]).owner} onChange={e=>{const cur=editing.values[5];const values=[...editing.values];values[5]=/owner:/i.test(cur)?cur.replace(/([^:]*owner):\s*[^;]*/i,`$1 ${e.target.value}`):`Owner: ${e.target.value}${cur?'; '+cur:''}`;setEditing({...editing,values})}}/></div>
    </div>
    <div className="rm-fgrid">
     <div><div className="rm-fl">Review date</div><input type="date" value={editing.tpl.reviewDate} onChange={e=>setEditing({...editing,tpl:{...editing.tpl,reviewDate:e.target.value}})}/></div>
     <div><div className="rm-fl">Source link</div><input value={editing.tpl.source} placeholder="Link to the source document" onChange={e=>setEditing({...editing,tpl:{...editing.tpl,source:e.target.value}})}/></div>
     <div><div className="rm-fl">Status</div><select value={normalizedStatus(editing.values[6]||'')} onChange={e=>{const values=[...editing.values];values[6]=e.target.value;setEditing({...editing,values})}}><option>Draft</option><option>Active</option><option>Retired</option></select></div>
    </div>
    {normalizedStatus(editing.values[6]||'')==='Retired'&&<><div className="rm-fl">Retired reason</div><input value={editing.tpl.retiredReason} placeholder="Why this rule was retired" onChange={e=>setEditing({...editing,tpl:{...editing.tpl,retiredReason:e.target.value}})}/></>}
    <div className="rm-fl">Used by (linked skills)</div>
    <div className="rm-chips">{skillRefs(editing.values[8]).map(id=><span className="rm-linked" key={id}><button type="button" onClick={()=>openSkillRef(id)} title={skillName(id)?`${id} · ${skillName(id)}`:id}>{id}</button><button aria-label={`Remove skill ${id}`} onClick={()=>{const values=[...editing.values];values[8]=skillRefs(values[8]).filter(x=>x!==id).join('; ');setEditing({...editing,values})}}>×</button></span>)}</div>
    <select aria-label="Link skill" value="" onChange={e=>{if(e.target.value){const values=[...editing.values];values[8]=[...skillRefs(values[8]),e.target.value].join('; ');setEditing({...editing,values})}}}><option value="">+ Link skill</option>{skillsMaster.filter(s=>!skillRefs(editing.values[8]).includes(s.values[0])).map(s=><option key={s.id} value={s.values[0]}>{s.values[1]||s.values[0]} ({s.values[0]})</option>)}</select>
    <div className="rm-fl">Version</div>
    <div className="rm-ver"><b>{parseOwnerVersion(editing.values[5]).version||'v1'}</b> <span className="rm-mut">current</span>{historyList(editing.values[0]).map((h,i)=><div key={i} className="rm-ver-row"><span>{h.from}</span><span className="rm-mut">{new Date(h.at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</span><span className="rm-mut">{h.note}</span></div>)}</div>
    <details className="rm-details"><summary>Original workbook fields (preserved)</summary>
     <p><b>Type:</b> {parseRuleText(editing.values[1]).type||'Not set'}</p>
     <p><b>Stop / review condition:</b> {editing.values[4]||'Not set'}</p>
     <p><b>Org / enforcement:</b> {editing.values[3]||'Not set'}</p>
     <p><b>Effective / expiry:</b> {editing.values[7]||'Not set'}</p>
     <p><b>Source / approval / evidence:</b> {editing.values[2]||'Not set'}</p>
    </details>
   </div>
   <footer><button aria-label="Cancel (Esc)" onClick={()=>setEditing(null)}><span>Cancel</span><span className="shortcut-hint">(Esc)</span></button><button className="primary" aria-label="Save (new version)" onClick={saveEditor}><span>Save</span></button></footer>
  </section></div>}
 </div>;
}
