import type {RecordRow} from './provider';
// Rules master refinement (BuLLM Rules Master SOP, approved 2026-11-26 on WhatsApp):
// five families, the doc template fields, draft -> review -> active -> retired lifecycle,
// versioning, review dates, duplicates and hygiene. Template-only fields (Intent, structured
// Condition/Action, Source link, Review date, Family/Category overrides) have no workbook
// column yet, so they live in this browser (localStorage), keyed by the stable Rule ID.

export type CondRow={join:'IF'|'AND'|'OR';field:string;op:string;value:string};
export type RuleTpl={intent:string;condition:CondRow[];action:string;source:string;reviewDate:string;family:string;category:string;retiredReason:string};
export type HistoryEntry={at:string;from:string;to:string;note:string};

const TPL_KEY='bullm-rule-template-v1';
const HIST_KEY='bullm-rule-history-v1';
const DUP_DISMISS_KEY='bullm-rule-dup-dismiss-v1';

export const FAMILIES=[
 {key:'Business',colors:{bg:'#e8f0fd',fg:'#2f6fdc',bd:'#8fb2f0'}},
 {key:'Policy and access',colors:{bg:'#f0eafb',fg:'#7a4fd0',bd:'#b7a0e8'}},
 {key:'Validation',colors:{bg:'#e4f6ee',fg:'#0f8a5f',bd:'#7fcfb0'}},
 {key:'Optimization',colors:{bg:'#fdf1df',fg:'#c9780a',bd:'#eab96a'}},
 {key:'Runtime',colors:{bg:'#fbe9e7',fg:'#c0392b',bd:'#e59a92'}},
] as const;
export type FamilyKey=typeof FAMILIES[number]['key'];
export const familyColors=(f:string)=>FAMILIES.find(x=>x.key===f)?.colors||FAMILIES[0].colors;

// The workbook Type's trailing word maps to a doc family (her answer, 2026-11-26: map the
// existing rule Types to the five families, Review date blank at first).
const TYPE_TO_FAMILY:Record<string,FamilyKey>={
 'policy':'Policy and access','policy test case':'Policy and access','validation':'Validation',
 'prompt':'Runtime','estimation':'Business','calculation':'Business','decision/routing':'Business',
 'optimization':'Optimization',
};
// Rows whose type cell does not follow the "Type: X / Y; Description:" shape get an explicit
// family + category, read from the row's own content.
const ROW_OVERRIDES:Record<string,{family:FamilyKey;category:string}>={
 'RULE-DOMAIN-PCBA-COSTING':{family:'Business',category:'PCBA costing'},
 'RULE-POLICY-BOM':{family:'Business',category:'BOM scrub'},
 'RULE-POLICY-OFFER':{family:'Business',category:'Offer conversion'},
 'RULE-POLICY-EXCESS':{family:'Business',category:'Excess inventory'},
 'RULE-POLICY-REPORT-02':{family:'Business',category:'Analytics and NRE'},
 'RULE-POLICY-CORE':{family:'Business',category:'Manufacturing core'},
 'RULE-CHECKLIST-BOM-VALIDATION':{family:'Validation',category:'BOM validation'},
 'RULE-POLICY-QUOTE-APPROVAL':{family:'Policy and access',category:'Quote approval'},
};

// Split the workbook rule cell into name/type/description for the three shapes in the data:
// A: "Rule / Type: RBAC / Policy; Description: ..."  B: "Material Pricing · Calculation; ..."
// C: "Rule / Type: <free text>; <rest>" (no Description marker).
export function parseRuleText(text:string):{name:string;type:string;desc:string;shape:'A'|'B'|'C'}{
 const a=text.match(/^Rule\s*\/\s*Type:\s*([^;]+);\s*Description:\s*([\s\S]*)$/);
 if(a)return{name:a[2].trim(),type:a[1].trim(),desc:a[2].trim(),shape:'A'};
 const b=text.match(/^([^;]+);\s*([\s\S]+)$/);
 if(b&&!/^Rule\s*\/\s*Type:/.test(text))return{name:b[1].trim(),type:(b[1].split('·').pop()||'').trim(),desc:b[2].trim(),shape:'B'};
 const c=text.match(/^Rule\s*\/\s*Type:\s*([\s\S]*)$/);
 if(c){const rest=c[1];const i=rest.indexOf(';');const head=(i<0?rest:rest.slice(0,i)).trim();return{name:head,type:'',desc:(i<0?'':rest.slice(i+1)).trim(),shape:'C'}}
 return{name:text,type:'',desc:'',shape:'C'};
}
export function writeRuleText(shape:'A'|'B'|'C',type:string,name:string,rest:string):string{
 if(shape==='A')return`Rule / Type: ${type}; Description: ${name}`;
 if(shape==='B')return`${name}; ${rest}`.replace(/;\s*$/,'');
 return`Rule / Type: ${name}${rest?'; '+rest:''}`;
}
export function familyOf(row:RecordRow,tpl?:RuleTpl):string{
 if(tpl?.family)return tpl.family;
 const o=ROW_OVERRIDES[row.values[0]];if(o)return o.family;
 const t=parseRuleText(row.values[1]||'').type;
 const last=(t.split('/').pop()||'').trim().toLowerCase();
 return TYPE_TO_FAMILY[last]||'Business';
}
export function categoryOf(row:RecordRow,tpl?:RuleTpl):string{
 if(tpl?.category)return tpl.category;
 const o=ROW_OVERRIDES[row.values[0]];if(o)return o.category;
 const p=parseRuleText(row.values[1]||'');
 if(p.shape==='B')return(p.name.split('·')[0]||'').trim()||'General';
 const parts=p.type.split('/').map(x=>x.trim()).filter(Boolean);
 return parts.slice(0,-1).join(' / ')||'General';
}
export type RuleStatus='Draft'|'Active'|'Retired';
// The doc lifecycle is draft / active / retired; the workbook's "Proposed ..." statuses and
// blank cells are drafts (proposed is not approved), Archived reads as Retired.
export function normalizedStatus(status:string):RuleStatus{
 const s=(status||'').trim().toLowerCase();
 if(/^active/.test(s))return'Active';
 if(/^(retired|archived)/.test(s))return'Retired';
 return'Draft';
}
export function parseOwnerVersion(text:string):{owner:string;version:string}{
 const segs=(text||'').split(';').map(x=>x.trim()).filter(Boolean);
 let owner='',version='';
 for(const s of segs){const m=s.match(/^([^:]*owner):\s*(.*)$/i);if(m){owner=m[2].trim();continue}
  const v=s.match(/^version:\s*(.*)$/i);if(v)version=v[1].trim()}
 return{owner,version};
}
// Edits save as a new version: keep the owner wording, bump the trailing version number
// (draft-1 -> draft-2); rows without a version gain "; Version: v2".
export function bumpOwnerVersion(text:string,newOwner?:string):string{
 const segs=(text||'').split(';').map(x=>x.trim());
 const out:string[]=[];let sawOwner=false,sawVersion=false;
 for(const s of segs.filter(Boolean)){
  const o=s.match(/^([^:]*owner:)\s*(.*)$/i);
  if(o){out.push(newOwner!==undefined?`${o[1]} ${newOwner}`:s);sawOwner=true;continue}
  const v=s.match(/^(version:\s*[^\d]*?)(\d+)$/i);
  if(v){out.push(`${v[1]}${parseInt(v[2],10)+1}`);sawVersion=true;continue}
  out.push(s);
 }
 if(newOwner!==undefined&&!sawOwner)out.unshift(`Owner: ${newOwner}`);
 if(!sawVersion)out.push('Version: v2');
 return out.join('; ');
}

const EMPTY_TPL:RuleTpl={intent:'',condition:[],action:'',source:'',reviewDate:'',family:'',category:'',retiredReason:''};
export function loadTpl():Record<string,Partial<RuleTpl>>{try{return JSON.parse(localStorage.getItem(TPL_KEY)||'{}')}catch{return {}}}
export function tplOf(id:string):RuleTpl{return{...EMPTY_TPL,...(loadTpl()[id]||{})}}
export function saveTpl(id:string,tpl:RuleTpl){localStorage.setItem(TPL_KEY,JSON.stringify({...loadTpl(),[id]:tpl}))}

export function loadHistory():Record<string,HistoryEntry[]>{try{return JSON.parse(localStorage.getItem(HIST_KEY)||'{}')}catch{return {}}}
export function historyOf(id:string):HistoryEntry[]{return loadHistory()[id]||[]}
export function pushHistory(id:string,entry:HistoryEntry){const h=loadHistory();h[id]=[entry,...(h[id]||[])].slice(0,49);localStorage.setItem(HIST_KEY,JSON.stringify(h))}

export function dismissedDups():string[]{try{return JSON.parse(localStorage.getItem(DUP_DISMISS_KEY)||'[]')}catch{return []}}
export function dismissDup(key:string){localStorage.setItem(DUP_DISMISS_KEY,JSON.stringify([...dismissedDups(),key]))}
export const dupKey=(a:string,b:string)=>[a,b].sort().join('|');

const STOP=new Set(['the','a','an','of','for','and','or','to','in','on','with','per','be','is','are','it','its','this','that','from','by','at','as','no','not','any','all','each','when','if','then','only','must']);
export function simTokens(text:string):Set<string>{return new Set(text.toLowerCase().replace(/[^a-z0-9%\s]/g,' ').split(/\s+/).filter(w=>w&&!STOP.has(w)))}
export function similarity(a:Set<string>,b:Set<string>):number{if(!a.size||!b.size)return 0;let n=0;for(const w of a)if(b.has(w))n++;return n/(a.size+b.size-n)}
export function ruleSimText(row:RecordRow):string{const p=parseRuleText(row.values[1]||'');return `${p.type} ${p.name} ${p.desc} ${row.values[4]||''}`}
export function bestMatch(row:RecordRow,others:RecordRow[]):{row:RecordRow;pct:number}|null{
 const t=simTokens(ruleSimText(row));let best:{row:RecordRow;pct:number}|null=null;
 for(const o of others){if(o.id===row.id)continue;const pct=similarity(t,simTokens(ruleSimText(o)));if(!best||pct>best.pct)best={row:o,pct}}
 return best;
}
export function dupPairs(rows:RecordRow[],min=0.8):{a:RecordRow;b:RecordRow;pct:number}[]{
 const toks=rows.map(r=>simTokens(ruleSimText(r)));const out:{a:RecordRow;b:RecordRow;pct:number}[]=[];
 for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){const pct=similarity(toks[i],toks[j]);if(pct>=min)out.push({a:rows[i],b:rows[j],pct})}
 return out.sort((x,y)=>y.pct-x.pct);
}
// Words present in one text but not the other, for the side-by-side diff highlight.
export function diffWords(a:string,b:string):Set<string>{const ta=simTokens(a),tb=simTokens(b);const out=new Set<string>();for(const w of ta)if(!tb.has(w))out.add(w);return out}

export function reviewMeta(dateStr:string,today=new Date()):{label:string;cls:string;sub:string}|null{
 const d=new Date(dateStr+'T00:00:00');if(!dateStr||isNaN(d.getTime()))return null;
 const label=d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
 const days=Math.floor((d.getTime()-new Date(today.getFullYear(),today.getMonth(),today.getDate()).getTime())/86400000);
 if(days<0)return{label,cls:'over',sub:'overdue'};
 if(days<=30)return{label,cls:'soon',sub:days===0?'due today':`due in ${days} day${days===1?'':'s'}`};
 return{label,cls:'',sub:''};
}
