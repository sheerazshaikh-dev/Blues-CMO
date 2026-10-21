"use strict";
const $=id=>document.getElementById(id);
const state={page:0,total:0,rows:[],search:"",decision:"",loading:false,abort:null,returnFocus:null};
const PAGE_SIZE=100;
const known=new Set(["id","owner","business","email","phone","decision","followUp","notes","date","seat","city","trade","techs","adspend","channels","software","marketingBy","knowsJobCost","recordsCalls","pain","topFeatures","ratings","featureIdeas","concerns","pBargain","pTooExpensive","priceReaction","pricePref","planFit","guarantee","priceComment","revealed"]);
const friendly={techs:"Technicians / employees",trade:"Trades / services",adspend:"Monthly advertising spend",channels:"Advertising channels",software:"Business software",marketingBy:"Marketing managed by",knowsJobCost:"Job cost tracking",recordsCalls:"Call recording",pain:"Biggest marketing problem",pBargain:"Bargain price",pTooExpensive:"Too-expensive price",pricePref:"Preferred billing",priceReaction:"Pricing reaction",planFit:"Preferred plan",priceComment:"Pricing comments",featureIdeas:"Suggested features",topFeatures:"Top feature choices",concerns:"Concerns",followUp:"Follow-up / best time to reach",guarantee:"Guarantee feedback",date:"Session date",seat:"Seat number",created_at:"Submitted"};
const decisions={"Yes, sign me up":{text:"Yes, sign me up",cls:"join"},"Needs to think":{text:"Needs to think",cls:"think"},"Not right now":{text:"Not right now",cls:"no"}};
function isEmpty(v){return v===null||v===undefined||v===""||(Array.isArray(v)&&v.length===0)||(typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===0)}
function readable(v){if(typeof v==="boolean")return v?"Yes":"No";if(Array.isArray(v))return v.map(readable).join(", ");if(isEmpty(v))return "Not provided";return String(v)}
function label(k){return friendly[k]||String(k).replace(/([a-z])([A-Z])/g,"$1 $2").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}
function dateText(v){if(!v)return "—";const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"})}
function currency(v){if(isEmpty(v))return "Not provided";let n=String(v).trim().replace(/[$,\s]/g,"");return /^\d+(\.\d+)?$/.test(n)?"$"+Number(n).toLocaleString("en-US",{maximumFractionDigits:2}):String(v)}
function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n}
function valueNode(value){return node("span","",readable(value))}
function statusNode(v){const d=decisions[v]||{text:v||"No decision",cls:""};return node("span","status "+d.cls,d.text)}
function ratingStyle(v){const s=String(v||"").toLowerCase();if(s.includes("must"))return {cls:"must",order:0,group:"Must have"};if(s.includes("nice"))return {cls:"nice",order:1,group:"Nice to have"};if(s.includes("don't")||s.includes("dont")||s.includes("not need"))return {cls:"skip",order:2,group:"Not needed"};return {cls:"",order:3,group:"Other responses"}}
function showMessage(text,error=false){$("msg").textContent=text;$("msg").classList.toggle("error",error)}
function contactLink(text,type){const a=node("a","entry-link",text);a.href=(type==="phone"?"tel:":"mailto:")+(type==="phone"?String(text).replace(/[^+\d]/g,""):text);a.addEventListener("click",e=>e.stopPropagation());return a}
function tableRow(s){
 const tr=node("tr","entry");const submitted=node("td");submitted.textContent=dateText(s.created_at);
 const business=node("td");business.append(node("div","entry-name",s.business||s.owner||"Unnamed session"));if(s.business&&s.owner)business.append(node("div","entry-sub",s.owner));
 const contact=node("td");if(s.email)contact.append(contactLink(s.email,"email"));if(s.phone){const line=node("div","entry-sub");line.append(contactLink(s.phone,"phone"));contact.append(line)}if(!s.email&&!s.phone)contact.textContent="—";
 const decision=node("td");decision.append(statusNode(s.decision));
 const follow=node("td");const f=s.follow_up||"—";follow.textContent=f.length>90?f.slice(0,87)+"…":f;
 const view=node("td");const b=node("button","details-link","View details →");b.type="button";b.setAttribute("aria-label","View details for "+(s.business||s.owner||"session"));b.addEventListener("click",()=>openDetail(s));view.append(b);
 tr.append(submitted,business,contact,decision,follow,view);return tr
}
function renderTable(){
 const tbody=$("entries");tbody.replaceChildren();
 if(!state.rows.length){const tr=node("tr");const td=node("td");td.colSpan=6;const empty=node("div","empty-state");empty.append(node("strong","",state.search||state.decision?"No matching sessions":"No submissions yet"),node("p","",state.search||state.decision?"Try a different search or filter.":"Newly saved interviews will appear here."));td.append(empty);tr.append(td);tbody.append(tr)}
 else state.rows.forEach(s=>tbody.append(tableRow(s)));
 const from=state.total?state.page*PAGE_SIZE+1:0,to=Math.min((state.page+1)*PAGE_SIZE,state.total);
 $("resultCount").textContent=state.total===0?"":state.total+" matching session"+(state.total===1?"":"s");
 $("pageLabel").textContent=state.total?("Showing "+from+"–"+to+" of "+state.total):"No results";
 $("prev").disabled=state.loading||state.page===0;
 $("next").disabled=state.loading||to>=state.total
}
function setBusy(v){state.loading=v;$("refresh").disabled=v;renderTable()}
async function getPage(n,search=state.search,decision=state.decision,signal){
 const params=new URLSearchParams({page:String(n)});if(search)params.set("search",search);if(decision)params.set("decision",decision);
 const response=await fetch("/api/admin-entries?"+params,{cache:"no-store",signal});
 if(response.status===401){location.replace("/admin/login");throw new Error("Please sign in to continue")}
 if(!response.ok)throw new Error("Unable to load entries. Please refresh.");
 return response.json()
}
async function load(){
 if(state.abort)state.abort.abort();state.abort=new AbortController();
 const signal=state.abort.signal;setBusy(true);showMessage("Loading sessions…");
 try{
  const r=await getPage(state.page,state.search,state.decision,signal);
  if(signal.aborted)return;
  state.total=Number(r.total)||0;state.rows=Array.isArray(r.entries)?r.entries:[];
  if(r.summary){$("count").textContent=r.summary.total??"—";$("yes").textContent=r.summary.joined??"—";$("think").textContent=r.summary.followUp??"—"}
  else{$("count").textContent=r.total??"—";$("yes").textContent="—";$("think").textContent="—"}
  showMessage("")
 }catch(err){if(!signal.aborted){showMessage(err.message,true);state.rows=[];state.total=0}}
 finally{if(!signal.aborted)setBusy(false)}
}
function createSection(title,subtitle){
 const sec=node("section","section-block");const heading=node("div","block-top");heading.append(node("h3","",title));if(subtitle)heading.append(node("span","muted",subtitle));sec.append(heading);return sec
}
function appendField(grid,key,value,opts={}){
 if(isEmpty(value)&&!opts.always)return;
 const cell=node("div","info-cell"+(opts.wide?" wide":""));
 cell.append(node("span","info-label",opts.title||label(key)));
 const content=node("p","info-value"+(opts.price?" price":""));
 if(opts.price)content.textContent=currency(value);
 else if(opts.email&&value)content.append(contactLink(String(value),"email"));
 else if(opts.phone&&value)content.append(contactLink(String(value),"phone"));
 else if(Array.isArray(value)&&value.length){const tags=node("div","tagline");for(const item of value)tags.append(node("span","tag",readable(item)));content.append(tags)}
 else content.textContent=readable(value);
 cell.append(content);grid.append(cell)
}
function addGridSection(parent,title,fields,subtitle){
 const existing=fields.filter(f=>!isEmpty(f[2])||f[3]?.always);if(!existing.length)return;
 const sec=createSection(title,subtitle),grid=node("div","info-grid");
 for(const [key,labelText,value,options] of existing)appendField(grid,key,value,{...options,title:labelText});
 sec.append(grid);parent.append(sec)
}
function addTextSection(parent,title,value){
 if(isEmpty(value))return;const sec=createSection(title);sec.append(node("div","note-box",readable(value)));parent.append(sec)
}
function addRatings(parent,ratings){
 if(!ratings||typeof ratings!=="object"||Array.isArray(ratings)||!Object.keys(ratings).length)return;
 const pairs=Object.entries(ratings).filter(([k,v])=>k&&!isEmpty(v)).sort((a,b)=>ratingStyle(a[1]).order-ratingStyle(b[1]).order||a[0].localeCompare(b[0]));
 if(!pairs.length)return;
 const sec=createSection("Feature ratings",pairs.length+" recorded votes");const totals=node("div","vote-stats");
 const groups=new Map();
 for(const [name,response] of pairs){const type=ratingStyle(response);if(!groups.has(type.group))groups.set(type.group,[]);groups.get(type.group).push([name,response,type])}
 for(const [group,items] of groups){const summary=node("span","vote-stat");summary.append(node("b","",items.length+" "),document.createTextNode(group.toLowerCase()));totals.append(summary)}
 sec.append(totals);
 for(const [group,items] of groups){const box=node("div","rating-group");box.append(node("h4","",group));const list=node("div","rating-list");
 for(const [name,response,type] of items){const row=node("div","rating-item");row.append(node("div","rating-name",name),node("span","status "+type.cls,readable(response)));list.append(row)}
 box.append(list);sec.append(box)}
 parent.append(sec)
}
function addExtras(parent,record){
 const entries=Object.entries(record).filter(([key,val])=>!known.has(key)&&!isEmpty(val));
 if(!entries.length)return;const sec=createSection("Additional responses"),grid=node("div","info-grid");
 for(const [k,v] of entries){if(typeof v==="object"&&!Array.isArray(v)){const items=Object.entries(v);for(const [child,val] of items)appendField(grid,k+"."+child,val,{title:label(k)+" · "+label(child)});}
 else appendField(grid,k,v)}
 sec.append(grid);parent.append(sec)
}
function openDetail(s){
 state.returnFocus=document.activeElement;
 const p=s.payload&&typeof s.payload==="object"&&!Array.isArray(s.payload)?s.payload:{};
 const content=$("detailContent");content.replaceChildren();$("detailTitle").textContent=s.business||s.owner||"Session details";
 const description=[s.owner,s.payload?.city,dateText(s.created_at)].filter(Boolean).join(" · ");$("detailSubtitle").textContent=description;
 const top=node("div","detail-topline");top.append(statusNode(s.decision));top.append(node("span","date-inline","Submitted "+dateText(s.created_at)));content.append(top);
 addGridSection(content,"Owner & contact",[
  ["owner","Owner name",s.owner||p.owner],["business","Business",s.business||p.business],
  ["email","Email",s.email||p.email,{email:true}],["phone","Phone",s.phone||p.phone,{phone:true}],
  ["city","City / area",p.city],["seat","Founding member seat",p.seat],["date","Session date",p.date]
 ]);
 addGridSection(content,"Business & marketing",[
  ["trade","Trades / services",p.trade,{wide:true}],["techs","Technicians / employees",p.techs],
  ["adspend","Monthly ad spend",p.adspend],["software","Business software",p.software],
  ["marketingBy","Marketing managed by",p.marketingBy],
  ["channels","Advertising channels",p.channels,{wide:true}],
  ["knowsJobCost","Job cost tracking",p.knowsJobCost],["recordsCalls","Call recording",p.recordsCalls]
 ]);
 addTextSection(content,"Main marketing challenge",p.pain);
 addRatings(content,p.ratings);
 addGridSection(content,"Top priorities & ideas",[
  ["topFeatures","Most wanted features",p.topFeatures,{wide:true}],
  ["featureIdeas","Additional feature ideas",p.featureIdeas,{wide:true}],
  ["concerns","Concerns",p.concerns,{wide:true}]
 ]);
 addGridSection(content,"Pricing feedback",[
  ["pBargain","Price that feels like a bargain",p.pBargain,{price:true}],
  ["pTooExpensive","Price that feels too expensive",p.pTooExpensive,{price:true}],
  ["priceReaction","Price reaction",p.priceReaction],["pricePref","Preferred billing",p.pricePref],
  ["planFit","Preferred plan",p.planFit],["guarantee","Guarantee feedback",p.guarantee]
 ]);
 addTextSection(content,"Additional pricing comments",p.priceComment);
 addGridSection(content,"Decision & follow-up",[
  ["decision","Decision",s.decision||p.decision,{wide:true}],
  ["followUp","Follow-up / best time to reach",s.follow_up||p.followUp,{wide:true}]
 ]);
 addTextSection(content,"Presenter notes",s.notes||p.notes);
 addExtras(content,p);
 const drawer=$("drawer");drawer.classList.add("open");drawer.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";content.scrollTop=0;$("close").focus()
}
function closeDetail(){
 const drawer=$("drawer");drawer.classList.remove("open");drawer.setAttribute("aria-hidden","true");document.body.style.overflow="";
 if(state.returnFocus&&document.contains(state.returnFocus))state.returnFocus.focus()
}
function csvCell(v){let str=v===undefined||v===null?"":Array.isArray(v)?v.map(readable).join("; "):typeof v==="object"?JSON.stringify(v):String(v);
 if(/^[\s]*[=+\-@]/.test(str))str="'"+str;
 return '"'+str.replace(/"/g,'""')+'"'
}
function exportCsv(rows){
 const cols=[["created_at","Submitted"],["owner","Owner"],["business","Business"],["email","Email"],["phone","Phone"],["decision","Decision"],["session_date","Session date"],["seat","Seat"],["follow_up","Follow-up"],["notes","Notes"]];
 const fields=["city","trade","techs","adspend","channels","software","marketingBy","knowsJobCost","recordsCalls","pain","topFeatures","featureIdeas","concerns","pBargain","pTooExpensive","priceReaction","pricePref","planFit","guarantee","priceComment"];
 const ratingKeys=[...new Set(rows.flatMap(r=>Object.keys(r.payload?.ratings||{})))].sort();
 const headings=[...cols.map(c=>c[1]),...fields.map(label),...ratingKeys.map(k=>"Feature: "+k)];
 const lines=[headings.map(csvCell).join(",")];
 for(const s of rows){const p=s.payload||{};const values=[...cols.map(([k])=>s[k]),...fields.map(k=>p[k]),...ratingKeys.map(k=>p.ratings?.[k])];lines.push(values.map(csvCell).join(","))}
 const blob=new Blob(["\ufeff"+lines.join("\r\n")],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=node("a");a.href=url;a.download="blues-cmo-founding-entries.csv";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
let searchTimer;
$("search").addEventListener("input",e=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{state.search=e.target.value.trim();state.page=0;load()},280)});
$("decisionFilter").addEventListener("change",e=>{state.decision=e.target.value;state.page=0;load()});
$("refresh").addEventListener("click",load);
$("prev").addEventListener("click",()=>{if(state.page>0){state.page--;load()}});
$("next").addEventListener("click",()=>{if((state.page+1)*PAGE_SIZE<state.total){state.page++;load()}});
$("close").addEventListener("click",closeDetail);
$("closeBottom").addEventListener("click",closeDetail);
$("drawer").addEventListener("click",e=>{if(e.target.closest('[data-dismiss="true"]'))closeDetail()});
document.addEventListener("keydown",e=>{
 const open=$("drawer").classList.contains("open");if(!open)return;
 if(e.key==="Escape"){e.preventDefault();closeDetail();return}
 if(e.key==="Tab"){const els=[...$("drawer").querySelectorAll('button:not([disabled]),a[href],input:not([disabled])')].filter(x=>x.offsetParent!==null);
 if(!els.length)return;const first=els[0],last=els[els.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
});
$("logout").addEventListener("click",async()=>{try{await fetch("/api/logout",{method:"POST"})}finally{location.replace("/admin/login")}});
$("export").addEventListener("click",async()=>{
 const button=$("export");button.disabled=true;button.textContent="Preparing export…";
 try{
  const first=await getPage(0,state.search,state.decision);let rows=[...(first.entries||[])],totalRows=Number(first.total)||rows.length;
  for(let p=1;p<Math.ceil(totalRows/PAGE_SIZE);p++){const next=await getPage(p,state.search,state.decision);rows.push(...(next.entries||[]))}
  if(!rows.length){showMessage("No entries to export.");return}
  exportCsv(rows);showMessage("Downloaded "+rows.length+" entries.")
 }catch(err){showMessage(err.message,true)}
 finally{button.disabled=false;button.textContent="↓ Export CSV"}
});
load();