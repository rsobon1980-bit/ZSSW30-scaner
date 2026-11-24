(() => {
"use strict";
const APP_VERSION="41";
const CATS=["BZZ-01","BZ-05","KWN-01","DES-40","PSU-01.D","PSU-01.O"];
const DB_NAME="serial-scanner-zssw30", DB_VERSION=1, STORE="vehicles";
let editAnswerOpen=new Set(), addChildOpen=new Set(), db=null, vehicles=[], openVehicles=new Set(), openNodes=new Set(), openComments=new Set(), openSerialComments=new Set(), worker=null;
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const stamp=()=>new Date().toISOString();
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:"id"});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function all(){return new Promise((resolve,reject)=>{const r=db.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error);});}
function put(v){return new Promise((resolve,reject)=>{const t=db.transaction(STORE,"readwrite");t.objectStore(STORE).put(v);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});}
function remove(id){return new Promise((resolve,reject)=>{const t=db.transaction(STORE,"readwrite");t.objectStore(STORE).delete(id);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});}
function newNode(name){return{id:crypto.randomUUID(),name,comment:"",answer:null,createdAt:stamp(),serials:[],children:[]};}
function freshVehicle(reg){return{id:crypto.randomUUID(),reg:reg.trim(),comment:"",createdAt:stamp(),categories:CATS.map(newNode)};}
function normalizeNode(n){return{id:n.id||crypto.randomUUID(),name:n.name||"Podkategoria",comment:n.comment||"",answer:n.answer??null,createdAt:n.createdAt||null,serials:Array.isArray(n.serials)?n.serials:[],children:Array.isArray(n.children)?n.children.map(normalizeNode):[]};}
function migrateBzzNames(v){
 const root=(v.categories||[]).find(n=>n.name==="BZZ-01");
 if(!root)return false;
 let changed=false;
 for(const child of root.children||[]){
  const old=String(child.name||"");
  const next=old.replace(/^DIO01\s*-\s*(stara|nowa)$/i,(_,version)=>`DIO01-1 - ${version.toLowerCase()}`)
                .replace(/^DIO01$/i,"DIO01-1");
  if(next!==old){child.name=next;changed=true;}
 }
 return changed;
}
function normalizeVehicle(v){v.categories=(v.categories||[]).map(normalizeNode);for(const name of CATS){if(!v.categories.some(n=>n.name===name))v.categories.push(newNode(name));}migrateBzzNames(v);return v;}
async function refresh(){vehicles=(await all()).map(normalizeVehicle).sort((a,b)=>a.reg.localeCompare(b.reg,"pl",{numeric:true}));render();}
function countSerials(nodes){return nodes.reduce((sum,n)=>sum+(n.serials?.length||0)+countSerials(n.children||[]),0);}
function findNode(v,id,nodes=v.categories){for(const n of nodes){if(n.id===id)return n;const found=findNode(v,id,n.children||[]);if(found)return found;}return null;}
function uiIcon(name){const paths={pencil:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z"/>',trash:'<path d="M3 6h18M8 6V4h8v2M5 6l1 14h12l1-14M10 10v7M14 10v7"/>',plus:'<path d="M12 5v14M5 12h14"/>',camera:'<path d="M14 4h-4l-2 3H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-4Z"/><circle cx="12" cy="13" r="3"/>',comment:'<path d="M20 11.5a8 8 0 0 1-8 8 9 9 0 0 1-4-.9L3 20l1.4-5A8.5 8.5 0 1 1 20 11.5Z"/><path d="M8 11.5h8"/>',chevron:'<path d="m6 9 6 6 6-6"/>',check:'<path d="m5 12 4 4L19 6"/>'};return `<svg class="ui-svg" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||''}</svg>`;}
function iconBtn(icon,kind,action,attrs,label){return `<button type="button" class="icon-action icon-${kind}" data-action="${action}" ${attrs} title="${label}" aria-label="${label}">${uiIcon(icon)}</button>`;}
function commentButton(id,nodeId,comment){const nodeAttr=nodeId?` data-node="${esc(nodeId)}"`:"";return `<button type="button" class="comment-icon ${comment?.trim()?"has-comment":""}" data-action="toggle-comment" data-id="${esc(id)}"${nodeAttr} aria-label="${comment?.trim()?"Otwórz zapisany komentarz":"Dodaj komentarz"}" title="${comment?.trim()?"Zapisany komentarz":"Dodaj komentarz"}">${uiIcon("comment")}</button>`;}
function commentPanel(v,n){const nodeId=n?.id, k=v.id+"|"+(nodeId||"vehicle");if(!openComments.has(k))return "";const action=nodeId?"node-comment":"vehicle-comment",fieldId="comment-"+(nodeId||v.id),nodeAttr=nodeId?` data-node="${esc(nodeId)}"`:"";return `<div class="comment-panel"><label class="comment-label" for="${fieldId}">Komentarz ${nodeId?"do podkategorii":"do wozu"} (opcjonalnie)</label><textarea id="${fieldId}" data-action="${action}" data-id="${esc(v.id)}"${nodeAttr} placeholder="Wpisz komentarz...">${esc(nodeId?n.comment:v.comment)}</textarea><button type="button" class="secondary small comment-done" data-action="close-comment" data-id="${esc(v.id)}"${nodeAttr}>Gotowe</button></div>`;}
function childPicker(v,n){const key=v.id+"|"+n.id;if(!addChildOpen.has(key))return "";
const bz=n.name==="BZ-05",bzz=n.name==="BZZ-01",kw=n.name==="KWN-01",des=n.name==="DES-40",psu=n.name==="PSU-01.D"||n.name==="PSU-01.O";
const choices=bz?["Master","Slave","Własna"]:bzz?["DIO01-1","DIO01-2","Własna"]:kw?["J1","J2","J3","J4","J5","J6","J7","PCB","Własna"]:psu?["Podkładki","Własne"]:["Wymiana dźwigni","Dokręcenie nakrętki wieńcowej 50 Nm","Ustawienie luzu serwo ręczny 30 Nm","Własna"];
const first=choices[0],versions=bz?["stara","nowa"]:["nowa","stara"];
return `<div class="child-picker" data-picker="${esc(key)}" data-category="${esc(n.name)}"><label for="child-choice-${esc(n.id)}">1. Wybierz podkategorię</label><select class="input child-choice" id="child-choice-${esc(n.id)}" data-action="child-choice" data-id="${esc(v.id)}" data-node="${esc(n.id)}">${choices.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("")}</select>${!des&&!psu?`<div class="child-version-wrap"><label for="child-version-${esc(n.id)}">2. Wybierz wersję ${esc(first)}</label><select class="input child-version" id="child-version-${esc(n.id)}">${versions.map(x=>`<option value="${x}">${x}</option>`).join("")}</select></div>`:`<div class="child-answer-wrap"><label for="child-answer-${esc(n.id)}">2. Wykonano</label><select class="input child-answer" id="child-answer-${esc(n.id)}"><option value="Nie">Nie</option><option value="Tak">Tak</option></select></div>`}<input class="input child-custom" id="child-custom-${esc(n.id)}" placeholder="Wpisz nazwę podkategorii" style="display:none" maxlength="100"><div class="child-picker-actions"><button type="button" data-action="save-child" data-id="${esc(v.id)}" data-node="${esc(n.id)}">${uiIcon("check")} Dodaj</button><button type="button" class="secondary" data-action="cancel-child" data-id="${esc(v.id)}" data-node="${esc(n.id)}">Anuluj</button></div></div>`;}
function singleSerialOnly(v,n){return v.categories.some(root=>root.id===n.id||["BZ-05","BZZ-01","KWN-01","PSU-01.D","PSU-01.O"].includes(root.name)&&(root.children||[]).some(child=>child.id===n.id));}
function isDesChild(v,n){return v.categories.some(root=>(root.name==="DES-40"||root.name==="PSU-01.D"||root.name==="PSU-01.O")&&(root.children||[]).some(child=>child.id===n.id)&&n.answer!==null);}
function renderNode(v,n,depth=0){const key=v.id+"|"+n.id,opened=openNodes.has(key),count=countSerials(n.children||[])+n.serials.length;
const desChild=depth>=1&&isDesChild(v,n);
const toggle=`<button type="button" class="cat-head ${depth===0?"root-category-head":"child-category-head"}" data-action="toggle-node" data-id="${v.id}" data-node="${n.id}" aria-expanded="${opened}">${depth===0?'<span class="level-mark">GŁÓWNA</span>':""}<span class="cat-name" title="${esc(n.name)}">${esc(n.name)}</span>${desChild?"":`<span class="cat-count">${count}</span>`}<span class="chev icon-chevron ${opened?"is-open":""}">${uiIcon("chevron")}</span></button>`;
const actions=depth>=1?`${iconBtn("pencil","edit","rename-node",`data-id="${v.id}" data-node="${n.id}"`,"Edytuj podkategorię")}${iconBtn("trash","delete","delete-node",`data-id="${v.id}" data-node="${n.id}"`,"Usuń podkategorię")}`:"";
return `<section class="category nested-category ${depth===0?"root-category":"child-category"}" style="--depth:${Math.min(depth,7)}"><div class="category-toolbar ${depth===0?"root-toolbar":"child-toolbar"}">${toggle}${commentButton(v.id,n.id,n.comment)}${actions}</div>
${depth>=1&&n.answer!==null?`<div class="des-answer">Wykonano: <strong class="${n.answer==="Tak"?"answer-yes":"answer-no"}">${esc(n.answer)}</strong> <button type="button" class="secondary small" data-action="edit-answer" data-id="${esc(v.id)}" data-node="${esc(n.id)}" aria-expanded="${editAnswerOpen.has(key)}">Zmień</button></div>${editAnswerOpen.has(key)?`<div class="des-answer-editor"><label for="answer-${esc(n.id)}">Wybierz odpowiedź</label><select class="input" id="answer-${esc(n.id)}"><option value="Tak" ${n.answer==="Tak"?"selected":""}>Tak</option><option value="Nie" ${n.answer==="Nie"?"selected":""}>Nie</option></select><div class="des-answer-actions"><button type="button" data-action="save-answer" data-id="${esc(v.id)}" data-node="${esc(n.id)}">${uiIcon("check")} Zapisz</button><button type="button" class="secondary" data-action="cancel-answer" data-id="${esc(v.id)}" data-node="${esc(n.id)}">Anuluj</button></div></div>`:""}`:""}
${opened?`<div class="cat-body">

${desChild?"":`${singleSerialOnly(v,n)&&n.serials.length?"":`<div class="muted">Dodaj numer seryjny ręcznie lub zeskanuj tekst aparatem.</div>
<div class="serial-form"><input class="input" id="serial-${n.id}" placeholder="Numer seryjny" autocomplete="off">${iconBtn("plus","add","add-serial",`data-id="${v.id}" data-node="${n.id}"`,"Dodaj numer seryjny")}</div>
<div class="scan-actions"><label class="secondary small file-btn icon-scan" title="Zrób zdjęcie naklejki N/S">${uiIcon("camera")}<span>OCR – aparat</span><input type="file" accept="image/*" capture="environment" data-action="ocr" data-id="${v.id}" data-node="${n.id}"></label><label class="secondary small file-btn icon-scan" title="Wybierz zdjęcie naklejki z galerii">${uiIcon("camera")}<span>OCR – galeria</span><input type="file" accept="image/*" data-action="ocr" data-id="${v.id}" data-node="${n.id}"></label><button type="button" class="secondary small scan-qr-btn" data-action="qr-camera" data-id="${v.id}" data-node="${n.id}">▦ Skanuj QR</button></div>
<div class="status" id="ocr-${n.id}" role="status"></div>`}
<div class="serial-list">${n.serials.length?n.serials.map(s=>{const serialKey=v.id+"|"+n.id+"|"+s.id,commentOpen=openSerialComments.has(serialKey),showInline=true;return `<div class="serial-row serial-card"><div class="serial-main"><span class="serial-value">${esc(s.value)}</span><div class="serial-actions">${showInline?`<button class="serial-comment-icon ${s.comment?.trim()?"has-comment":""}" type="button" data-action="toggle-serial-comment" data-id="${v.id}" data-node="${n.id}" data-sid="${s.id}" title="${s.comment?.trim()?"Edytuj komentarz":"Dodaj komentarz"}" aria-label="Komentarz do numeru seryjnego">${uiIcon("comment")}</button>`:""}${iconBtn("pencil","edit","edit-serial",`data-id="${v.id}" data-node="${n.id}" data-sid="${s.id}"`,"Edytuj numer seryjny")}${iconBtn("trash","delete","delete-serial",`data-id="${v.id}" data-node="${n.id}" data-sid="${s.id}"`,"Usuń numer seryjny")}</div></div>${showInline&&s.comment?.trim()?`<div class="serial-comment-display"><span class="serial-comment-label">Komentarz</span><div>${esc(s.comment)}</div></div>`:""}${showInline&&commentOpen?`<div class="serial-comment-editor"><label for="serial-comment-${s.id}">Komentarz do numeru seryjnego (opcjonalnie)</label><textarea id="serial-comment-${s.id}" placeholder="Wpisz komentarz...">${esc(s.comment||"")}</textarea><button type="button" class="secondary small" data-action="save-serial-comment" data-id="${v.id}" data-node="${n.id}" data-sid="${s.id}">Gotowe</button></div>`:""}</div>`;}).join(""):'<div class="muted">Brak zapisanych numerów.</div>'}</div>`}
${depth===0?`<div class="child-add"><button class="secondary small" data-action="add-child" data-id="${v.id}" data-node="${n.id}">${uiIcon("plus")}<span>Dodaj podkategorię</span></button>${childPicker(v,n)}</div>`:""}
${n.children?.length?`<div class="category-list child-list">${n.children.map(ch=>renderNode(v,ch,depth+1)).join("")}</div>`:""}
${commentPanel(v,n)}
</div>`:""}</section>`;}
function render(){
 $("addVehicleCount").textContent=String(vehicles.length);
 $("vehicleCount").textContent=vehicles.length+ (vehicles.length===1?" wóz":(vehicles.length%10>=2&&vehicles.length%10<=4&&!(vehicles.length%100>=12&&vehicles.length%100<=14)?" wozy":" wozów"));
 if(!vehicles.length){$("vehicles").innerHTML='<div class="empty"><div class="big">▣</div>Nie dodano jeszcze żadnego wozu.</div>';return;}
 $("vehicles").innerHTML=vehicles.map(v=>{const opened=openVehicles.has(v.id);return `<article class="vehicle"><button class="vehicle-head vehicle-toggle" data-action="toggle-vehicle" data-id="${v.id}"><div class="vehicle-title"><h3>${esc(v.reg)}</h3></div><span class="chev icon-chevron ${opened?"is-open":""}">${uiIcon("chevron")}</span></button>${commentButton(v.id,null,v.comment)}${iconBtn("pencil","edit","rename-vehicle",`data-id="${v.id}"`,"Edytuj numer wozu")}${opened?`<div class="vehicle-details"><div class="vehicle-actions"><button class="small ghost" data-action="export-one" data-id="${v.id}">Excel tego wozu</button><button class="small danger" data-action="delete-vehicle" data-id="${v.id}">Usuń wóz</button></div>
${commentPanel(v,null)}
<div class="category-list">${v.categories.map(n=>renderNode(v,n)).join("")}</div></div>`:""}</article>`;}).join("");
}
function setStatus(id,msg){const el=$(id);if(el)el.textContent=msg;}
async function updateVehicle(id,fn){const v=vehicles.find(x=>x.id===id);if(!v)return;fn(v);await put(v);await refresh();}
$("addForm").addEventListener("submit",async e=>{e.preventDefault();const input=$("newVehicle"),reg=input.value.trim();if(!reg)return;if(vehicles.some(v=>v.reg.toLowerCase()===reg.toLowerCase())){alert("Taki numer rejestracyjny jest już na liście.");return;}await put(freshVehicle(reg));input.value="";await refresh();});
$("vehicles").addEventListener("click",async e=>{const b=e.target.closest("[data-action]");if(!b)return;const a=b.dataset.action,id=b.dataset.id,nodeId=b.dataset.node;
 if(a==="toggle-comment"){const k=id+"|"+(nodeId||"vehicle");openComments.has(k)?openComments.delete(k):openComments.add(k);if(!nodeId)openVehicles.add(id);else{openVehicles.add(id);openNodes.add(id+"|"+nodeId);}render();}
 if(a==="close-comment"){const el=b.parentElement?.querySelector("textarea");if(el){await updateVehicle(id,v=>{if(nodeId){const n=findNode(v,nodeId);if(n)n.comment=el.value;}else v.comment=el.value;});}openComments.delete(id+"|"+(nodeId||"vehicle"));render();}
 if(a==="toggle-vehicle"){openVehicles.has(id)?openVehicles.delete(id):openVehicles.add(id);render();}
 if(a==="toggle-node"){const k=id+"|"+nodeId;openNodes.has(k)?openNodes.delete(k):openNodes.add(k);render();}
 if(a==="rename-vehicle"){const v=vehicles.find(x=>x.id===id);if(!v)return;const raw=prompt("Edytuj numer rejestracyjny wozu:",v.reg);if(raw===null)return;const reg=raw.trim();if(!reg){alert("Wpisz numer rejestracyjny.");return;}if(vehicles.some(x=>x.id!==id&&x.reg.trim().toLowerCase()===reg.toLowerCase())){alert("Taki numer rejestracyjny jest już na liście.");return;}if(reg!==v.reg)await updateVehicle(id,x=>x.reg=reg);}
 if(a==="rename-node"){const v=vehicles.find(x=>x.id===id),n=v&&findNode(v,nodeId);if(n){const name=prompt("Nowa nazwa podkategorii:",n.name);if(name!==null&&name.trim()&&name.trim()!==n.name){await updateVehicle(id,v=>{const target=findNode(v,nodeId);if(target)target.name=name.trim();});}}}
 if(a==="delete-node"){const v=vehicles.find(x=>x.id===id),n=v&&findNode(v,nodeId);if(n&&confirm(`Usunąć podkategorię „${n.name}” wraz ze wszystkimi jej numerami seryjnymi, komentarzami i podkategoriami podrzędnymi? Tej operacji nie można cofnąć.`)){await updateVehicle(id,v=>{const drop=(nodes)=>{const i=nodes.findIndex(x=>x.id===nodeId);if(i!==-1){nodes.splice(i,1);return true;}return nodes.some(x=>drop(x.children||[]));};drop(v.categories);});for(const key of [...openNodes])if(key.startsWith(id+"|"))openNodes.delete(key);for(const key of [...openComments])if(key.startsWith(id+"|"))openComments.delete(key);for(const key of [...openSerialComments])if(key.startsWith(id+"|"))openSerialComments.delete(key);render();}}
 if(a==="add-child"){const parent=vehicles.find(v=>v.id===id);if(!parent?.categories.some(root=>root.id===nodeId))return;const key=id+"|"+nodeId;addChildOpen.has(key)?addChildOpen.delete(key):addChildOpen.add(key);openNodes.add(key);render();}
 if(a==="cancel-child"){addChildOpen.delete(id+"|"+nodeId);render();}
 if(a==="save-child"){const parent=vehicles.find(v=>v.id===id),root=parent?.categories.find(n=>n.id===nodeId);if(!root)return;const picker=b.closest(".child-picker"),choice=picker?.querySelector(".child-choice")?.value,custom=picker?.querySelector(".child-custom")?.value.trim(),version=picker?.querySelector(".child-version")?.value;
const psu=root.name==="PSU-01.D"||root.name==="PSU-01.O";
const name=(choice==="Własna"||choice==="Własne")?custom:(root.name==="DES-40"||psu)?choice:root.name==="BZZ-01"?`${choice} - ${version}`:`${choice} - ${version}`;
if(!name){alert("Wpisz nazwę podkategorii.");return;}const child=newNode(name);if(root.name==="DES-40"||(psu&&choice==="Podkładki"))child.answer=picker?.querySelector(".child-answer")?.value||"Nie";
await updateVehicle(id,v=>{const n=findNode(v,nodeId);if(n&&v.categories.some(x=>x.id===nodeId))n.children.push(child);});addChildOpen.delete(id+"|"+nodeId);openNodes.add(id+"|"+nodeId);openNodes.add(id+"|"+child.id);render();}
 if(a==="edit-answer"){const v=vehicles.find(x=>x.id===id),n=v&&findNode(v,nodeId);if(n&&["Tak","Nie"].includes(n.answer)){const key=id+"|"+nodeId;editAnswerOpen.has(key)?editAnswerOpen.delete(key):editAnswerOpen.add(key);render();}}
 if(a==="cancel-answer"){editAnswerOpen.delete(id+"|"+nodeId);render();}
 if(a==="save-answer"){const v=vehicles.find(x=>x.id===id),n=v&&findNode(v,nodeId);const value=document.getElementById("answer-"+nodeId)?.value;if(n&&["Tak","Nie"].includes(n.answer)&&["Tak","Nie"].includes(value)){editAnswerOpen.delete(id+"|"+nodeId);await updateVehicle(id,v=>{const target=findNode(v,nodeId);if(target)target.answer=value;});}}
 if(a==="qr-camera"){await startQR(id,nodeId);return;}
 if(a==="add-serial"){const v0=vehicles.find(x=>x.id===id),n0=v0&&findNode(v0,nodeId);if(v0&&n0&&isDesChild(v0,n0))return;const inp=$("serial-"+nodeId),value=inp?.value.trim();if(!value)return;await updateVehicle(id,v=>{const n=findNode(v,nodeId);if(n&&(!singleSerialOnly(v,n)||n.serials.length===0))n.serials.push({id:crypto.randomUUID(),value,createdAt:stamp()});});openNodes.add(id+"|"+nodeId);}
 if(a==="toggle-serial-comment"){const k=id+"|"+nodeId+"|"+b.dataset.sid;openSerialComments.has(k)?openSerialComments.delete(k):openSerialComments.add(k);render();}
 if(a==="save-serial-comment"){const field=b.closest(".serial-card")?.querySelector(".serial-comment-editor textarea"),sid=b.dataset.sid;if(field){const value=field.value;await updateVehicle(id,v=>{const serial=findNode(v,nodeId)?.serials.find(s=>s.id===sid);if(serial)serial.comment=value;});}openSerialComments.delete(id+"|"+nodeId+"|"+sid);render();}
 if(a==="delete-serial"&&confirm("Usunąć ten numer seryjny?"))await updateVehicle(id,v=>{const n=findNode(v,nodeId);if(n)n.serials=n.serials.filter(s=>s.id!==b.dataset.sid);});
 if(a==="edit-serial"){const v=vehicles.find(x=>x.id===id),s=findNode(v,nodeId)?.serials.find(x=>x.id===b.dataset.sid),val=s?prompt("Edytuj numer seryjny:",s.value):null;if(val!==null&&val?.trim())await updateVehicle(id,v=>{const n=findNode(v,nodeId);n.serials.find(x=>x.id===b.dataset.sid).value=val.trim();});}
 if(a==="delete-vehicle"&&confirm("Usunąć wóz "+(vehicles.find(x=>x.id===id)?.reg||"")+" wraz ze wszystkimi danymi?")){await remove(id);openVehicles.delete(id);await refresh();}
 if(a==="export-one")exportExcel([vehicles.find(x=>x.id===id)]);
});
$("vehicles").addEventListener("change",async e=>{if(e.target.dataset.action==="child-choice"){const picker=e.target.closest(".child-picker"),choice=e.target.value,custom=picker?.querySelector(".child-custom"),version=picker?.querySelector(".child-version-wrap"),category=picker?.dataset.category;
if(custom){custom.style.display=(choice==="Własna"||choice==="Własne")?"block":"none";if(choice==="Własna"||choice==="Własne")custom.focus();}
const answerWrap=picker?.querySelector(".child-answer-wrap");if(answerWrap&&category?.startsWith("PSU-01."))answerWrap.style.display=choice==="Podkładki"?"block":"none";
if(version){version.style.display=(choice==="Własna"||choice==="Własne")?"none":"block";const label=version.querySelector("label"),select=version.querySelector("select");if(label)label.textContent="2. Wybierz wersję "+choice;if(select){const values=category==="BZ-05"?(choice==="Slave"?["stary","nowy"]:["stara","nowa"]):["nowa","stara"];select.innerHTML=values.map(x=>`<option value="${x}">${x}</option>`).join("");}}
return;}const el=e.target;if(el.dataset.action==="vehicle-comment")await updateVehicle(el.dataset.id,v=>v.comment=el.value);if(el.dataset.action==="node-comment")await updateVehicle(el.dataset.id,v=>{const n=findNode(v,el.dataset.node);if(n)n.comment=el.value;});if(el.dataset.action==="ocr")await runOCR(el);});
$("vehicles").addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.matches('input[id^="serial-"]')){e.preventDefault();const nodeId=e.target.id.slice(7);$("vehicles").querySelector(`[data-action="add-serial"][data-node="${nodeId}"]`)?.click();}});
// OCR: extract only the value adjacent to the N/S label, never a year, voltage or product name.
function extractNS(text){
 const lines=String(text||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const marker=/(?:^|[^A-Z0-9])(?:N\s*[\/\\.:]?\s*[S5]|S\s*\/\s*N|NR\s*SERYJNY|SERIAL\s*(?:NO|NUMBER))(?=\s|[:#=|.-]|\d|$)/i;
 function candidate(t){const m=t.replace(/^[\s:;#=|.\-]+/,"").match(/^([A-Z0-9][A-Z0-9._\/-]{3,})/i);return m&&/\d/.test(m[1])&&!/^(?:19|20)\d{2}$/.test(m[1])?m[1]:null;}
 for(let i=0;i<lines.length;i++){const m=marker.exec(lines[i]);if(m){const rest=lines[i].slice(m.index+m[0].length);const v=candidate(rest)||(!rest.replace(/[\s:;#=|.\-]/g,"")?candidate(lines[i+1]||""):null);if(v)return v;}}
 return null;
}
function fallbackNS(text){const matches=[...new Set(String(text).match(/\b\d{8}\b/g)||[])];return matches.length===1?matches[0]:null;}
async function ocrCanvas(file){const img=await createImageBitmap(file);try{const c=document.createElement("canvas"),scale=Math.min(2,2400/Math.max(img.width,img.height));c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));const ctx=c.getContext("2d");ctx.drawImage(img,0,0,c.width,c.height);const data=ctx.getImageData(0,0,c.width,c.height),d=data.data,gray=new Uint8Array(c.width*c.height);for(let i=0;i<gray.length;i++)gray[i]=.299*d[i*4]+.587*d[i*4+1]+.114*d[i*4+2];for(let i=0;i<gray.length;i++){let v=gray[i];if(i>=c.width&&i<gray.length-c.width&&i%c.width>0&&i%c.width<c.width-1)v=2*v-.25*(gray[i-1]+gray[i+1]+gray[i-c.width]+gray[i+c.width]);v=Math.max(0,Math.min(255,(v-128)*1.5+128));d[i*4]=d[i*4+1]=d[i*4+2]=v;}ctx.putImageData(data,0,0);return c;}finally{img.close();}}
function cleanSerial(value){return String(value||"").trim().replace(/\s+/g,"");}
function canScan(id,nodeId){const v=vehicles.find(x=>x.id===id),n=v&&findNode(v,nodeId);if(!n||isDesChild(v,n))return false;if(singleSerialOnly(v,n)&&n.serials.length){alert("W tej podkategorii zapisano już numer seryjny.");return false;}return true;}
async function confirmScan(id,nodeId,value,source){
 if(!canScan(id,nodeId))return;
 const edited=prompt("Numer seryjny z "+source+". Sprawdź lub popraw przed zapisaniem:",cleanSerial(value));
 if(edited===null)return;
 const serial=cleanSerial(edited);
 if(!serial||!/^[A-Za-z0-9._\/-]{4,}$/.test(serial)){alert("Nieprawidłowy numer. Wpisz co najmniej 4 znaki: litery lub cyfry.");return;}
 await updateVehicle(id,v=>{const n=findNode(v,nodeId);if(n&&!isDesChild(v,n)&&(!singleSerialOnly(v,n)||n.serials.length===0))n.serials.push({id:crypto.randomUUID(),value:serial,createdAt:stamp()});});
 openVehicles.add(id);openNodes.add(id+"|"+nodeId);render();
}
let ocrBusy=false,ocrStatus="";
async function runOCR(input){
 const file=input.files?.[0];if(!file)return;
 const id=input.dataset.id,nodeId=input.dataset.node,status="ocr-"+nodeId;
 if(ocrBusy){input.value="";alert("Poczekaj na zakończenie odczytu OCR.");return;}
 ocrBusy=true;ocrStatus=status;
 try{
  if(!canScan(id,nodeId))return;
  setStatus(status,"Rozpoznawanie pola N/S…");
  if(!window.Tesseract)throw Error("Nie można uruchomić OCR. Sprawdź połączenie z internetem.");
  if(!worker)worker=await Tesseract.createWorker("eng",1,{logger:m=>{if(m.status==="recognizing text")setStatus(ocrStatus,"OCR: "+Math.round(m.progress*100)+"%");}});
  const texts=[];let value=null;
  async function read(image){const result=await worker.recognize(image);texts.push(result.data.text);return extractNS(result.data.text);}
  value=await read(file);
  if(!value){try{const c=await ocrCanvas(file);value=await read(c);if(!value){const ctx=c.getContext("2d"),d=ctx.getImageData(0,0,c.width,c.height);for(let i=0;i<d.data.length;i+=4)for(let j=0;j<3;j++)d.data[i+j]=255-d.data[i+j];ctx.putImageData(d,0,0);value=await read(c);}}catch(e){console.warn("Przetwarzanie obrazu",e);}}
  const full=texts.join("\n---\n");
  if(!value){value=fallbackNS(full);if(value){await confirmScan(id,nodeId,value,"OCR (propozycja bez pewnego oznaczenia N/S)");return;}setStatus(status,"Nie rozpoznano N/S. Odczytany tekst: "+full);return;}
  await confirmScan(id,nodeId,value,"naklejki N/S");
 }catch(err){setStatus(status,"Błąd OCR: "+err.message);}finally{input.value="";ocrBusy=false;}
}
// QR contains only the serial number. Prefer live camera with BarcodeDetector;
// fall back to a photo and jsQR for browsers without this API.
let qrStream=null,qrRunning=false,qrTimer=null;
function stopQR(){qrRunning=false;if(qrTimer)clearTimeout(qrTimer);qrTimer=null;if(qrStream){qrStream.getTracks().forEach(t=>t.stop());qrStream=null;}$("qr-dialog")?.remove();}
async function startQR(id,nodeId){
 if(!canScan(id,nodeId))return;
 stopQR();
 const dialog=document.createElement("div");dialog.id="qr-dialog";dialog.className="qr-overlay";
 dialog.innerHTML='<div class="qr-panel"><div class="qr-title"><strong>Skanowanie QR</strong><button type="button" id="qr-close" class="secondary small">Zamknij</button></div><p>Umieść kod QR w ramce. Kod zawiera wyłącznie numer seryjny.</p><div class="qr-video-wrap"><video id="qr-video" autoplay muted playsinline></video><div class="qr-target"></div></div><div id="qr-message" role="status">Uruchamianie aparatu…</div><label class="secondary small file-btn qr-photo">Odczytaj QR ze zdjęcia<input type="file" id="qr-photo-input" accept="image/*" capture="environment"></label></div>';
 document.body.appendChild(dialog);
 $("qr-close").onclick=stopQR;
 dialog.addEventListener("click",e=>{if(e.target===dialog)stopQR();});
 $("qr-photo-input").onchange=async e=>{const f=e.target.files?.[0];if(!f)return;$("qr-message").textContent="Odczytywanie kodu ze zdjęcia…";try{const val=await readQRPhoto(f);if(!val)throw Error("Nie znaleziono kodu QR. Spróbuj ponownie.");stopQR();await confirmScan(id,nodeId,val,"QR");}catch(err){const msg=$("qr-message");if(msg)msg.textContent=err.message;}};
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw Error("Aparat na żywo nie jest dostępny. Użyj zdjęcia QR.");
  qrStream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}}});
  const video=$("qr-video");if(!video){stopQR();return;}video.srcObject=qrStream;await video.play();
  const detector=window.BarcodeDetector?new BarcodeDetector({formats:["qr_code"]}):null;
  qrRunning=true;$("qr-message").textContent=detector?"Skieruj aparat na kod QR…":"Skanowanie na żywo niedostępne w tej przeglądarce. Użyj zdjęcia QR.";
  if(detector){const scan=async()=>{if(!qrRunning)return;try{if(video.readyState>=2){const found=await detector.detect(video);if(found.length&&found[0].rawValue){const val=found[0].rawValue;stopQR();await confirmScan(id,nodeId,val,"QR");return;}}}catch(e){const m=$("qr-message");if(m)m.textContent="Nie można odczytać QR na żywo. Użyj zdjęcia.";}if(qrRunning)qrTimer=setTimeout(scan,220);};scan();}
 }catch(err){if(qrStream){qrStream.getTracks().forEach(t=>t.stop());qrStream=null;}const msg=$("qr-message");if(msg)msg.textContent="Nie udało się uruchomić aparatu: "+err.message+" Możesz użyć zdjęcia QR.";}
}
async function readQRPhoto(file){
 const bmp=await createImageBitmap(file);const canvas=document.createElement("canvas"),max=1600,scale=Math.min(1,max/Math.max(bmp.width,bmp.height));canvas.width=Math.max(1,Math.round(bmp.width*scale));canvas.height=Math.max(1,Math.round(bmp.height*scale));const ctx=canvas.getContext("2d",{willReadFrequently:true});ctx.drawImage(bmp,0,0,canvas.width,canvas.height);bmp.close?.();
 if(window.BarcodeDetector){try{const detector=new BarcodeDetector({formats:["qr_code"]});const found=await detector.detect(canvas);if(found[0]?.rawValue)return found[0].rawValue;}catch(e){/* try jsQR */}}
 if(!window.jsQR)throw Error("Brak biblioteki QR. Sprawdź internet lub użyj przeglądarki z obsługą QR.");
 const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);return window.jsQR(pixels.data,pixels.width,pixels.height,{inversionAttempts:"attemptBoth"})?.data||null;
}
function flatten(nodes,path=[],rows=[],inDes=false){nodes.forEach(n=>{const label=[...path,n.name].join(" / ");const desChild=inDes||n.answer!==null;const answer=desChild&&["Tak","Nie"].includes(n.answer)?n.answer:null;if(answer!==null){
// DES-40: wynik Tak/Nie jest wpisywany do kolumny "Numer seryjny".
// Historyczne numery seryjne pozostają w lokalnej bazie, lecz nie są pokazywane w tej kolumnie.
rows.push([label,answer,n.createdAt?new Date(n.createdAt).toLocaleString("pl-PL"):"",n.comment||"",""]);
}else if(n.serials.length){n.serials.forEach(serial=>rows.push([label,serial.value,serial.createdAt?new Date(serial.createdAt).toLocaleString("pl-PL"):"",n.comment||"",serial.comment||""]));
}else rows.push([label,"",n.createdAt?new Date(n.createdAt).toLocaleString("pl-PL"):"",n.comment||"",""]);
flatten(n.children||[],[...path,n.name],rows,inDes||n.name==="DES-40");});return rows;}
async function exportExcel(items){
 if(!items?.length){alert("Brak danych do eksportu.");return;}
 if(!window.ExcelJS){alert("Biblioteka Excel nie została pobrana. Sprawdź połączenie z internetem.");return;}
 try{
 const wb=new ExcelJS.Workbook();wb.creator="ZSSW30 Scaner";
 items.forEach(v=>{
  let name=v.reg.replace(/[\\/?*\[\]:]/g," ").slice(0,31)||"Wóz",base=name,n=1;
  while(wb.getWorksheet(name))name=(base.slice(0,27)+"_"+(++n)).slice(0,31);
  const ws=wb.addWorksheet(name);
  ws.mergeCells("A1:E1");ws.getCell("A1").value="ZSSW30 - "+v.reg;
  ws.getCell("A1").font={bold:true,size:17,color:{argb:"FFFFFFFF"}};
  ws.getCell("A1").fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF145B77"}};
  ws.getCell("A1").alignment={vertical:"middle"};ws.getRow(1).height=33;
  ws.getCell("A2").value="Komentarz ogólny";ws.getCell("B2").value=v.comment||"";
  ws.getCell("A2").font={bold:true};ws.getCell("B2").alignment={wrapText:true,vertical:"top"};
  const headers=["Podkategoria","Numer seryjny","Komentarz numeru seryjnego","Komentarz podkategorii","Data dodania"];
  ws.getRow(4).values=headers;ws.getRow(4).height=28;
  ws.getRow(4).eachCell(c=>{c.font={bold:true,color:{argb:"FFFFFFFF"}};c.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF176580"}};c.alignment={vertical:"middle",wrapText:true};});
  const data=flatten(v.categories);
  data.forEach((r,i)=>{
   // flatten: podkategoria, numer seryjny, data, komentarz podkategorii, komentarz numeru
   const vals=[r[0],r[1],r[4],r[3],r[2]];
   const row=ws.addRow(vals);const excelRow=i+5;
   row.eachCell({includeEmpty:true},(c,col)=>{
    c.alignment={vertical:"top",wrapText:true,horizontal:col===2?"center":"left"};
    if(i%2===1)c.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFEAF3F7"}};
    c.border={bottom:{style:"hair",color:{argb:"FFD4E4EB"}}};
   });
   // Preserve serials as text, including leading zeroes.
   row.getCell(2).numFmt="@";
   const lengths=vals.map((x,j)=>String(x??"").split("\n").reduce((m,t)=>Math.max(m,t.length),0));
   const widths=[43,25,42,42,22];
   const lines=Math.max(1,...lengths.map((len,j)=>Math.ceil(Math.max(1,len)/(widths[j]-3))));
   row.height=Math.min(180,Math.max(23,lines*16+7));
  });
  ws.columns=[{width:43},{width:25},{width:42},{width:42},{width:22}];
  // Make narrow text columns fit short values while bounding long comments.
  [1,2,3,4,5].forEach((col)=>{
   const cap=[48,30,48,48,25][col-1],min=[24,17,26,26,17][col-1];
   const lengths=data.map(r=>String([r[0],r[1],r[4],r[3],r[2]][col-1]??"").split("\n").reduce((m,t)=>Math.max(m,t.length),0));
   ws.getColumn(col).width=Math.min(cap,Math.max(min,Math.max(headers[col-1].length,...lengths,0)+3));
  });
  ws.autoFilter={from:{row:4,column:1},to:{row:Math.max(4,data.length+4),column:5}};
  ws.getColumn(2).alignment={horizontal:"center",vertical:"top",wrapText:true};
  // Worksheet column formatting must not override header styling.
  ws.getCell("B4").alignment={vertical:"middle",wrapText:true,horizontal:"center"};
 });
 const bytes=await wb.xlsx.writeBuffer();
 download(items.length===1?"Ewidencja_"+items[0].reg+".xlsx":"Ewidencja_wszystkie_wozy.xlsx",bytes,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
 }catch(e){console.error(e);alert("Nie udało się przygotować pliku Excel: "+e.message);}
}
$("exportAll").addEventListener("click",()=>exportExcel(vehicles));
function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
$("backup").addEventListener("click",()=>{const payload={app:"ZSSW30 Scaner",version:2,exportedAt:stamp(),vehicles};download("zssw30-scaner-backup-"+new Date().toISOString().slice(0,10)+".json",JSON.stringify(payload,null,2),"application/json");setStatus("globalStatus","Kopia została przygotowana. Zapisz plik w telefonie lub prześlij go ręcznie na Google Drive.");});
let pendingRestore=null;
const restoreOverlay=$("restoreOverlay"),restoreWarning=$("restoreWarning");
function closeRestore(){restoreOverlay.hidden=true;pendingRestore=null;$("restoreFile").value="";}
function restoreMode(){return document.querySelector('input[name="restoreMode"]:checked')?.value||"merge";}
document.querySelectorAll('input[name="restoreMode"]').forEach(r=>r.addEventListener("change",()=>{restoreWarning.hidden=restoreMode()!=="replace";}));
$("restoreCancel").addEventListener("click",closeRestore);
restoreOverlay.addEventListener("click",e=>{if(e.target===restoreOverlay)closeRestore();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!restoreOverlay.hidden)closeRestore();});
$("restoreFile").addEventListener("change",async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{
  const data=JSON.parse(await file.text());
  if(!data||!Array.isArray(data.vehicles))throw Error("Plik nie zawiera poprawnej ewidencji wozów.");
  const valid=data.vehicles.every(v=>v&&typeof v.reg==="string"&&v.reg.trim()&&Array.isArray(v.categories));
  if(!valid)throw Error("Niektóre wozy w kopii mają nieprawidłowe dane. Nie wprowadzono żadnych zmian.");
  pendingRestore=data.vehicles;
  document.querySelector('input[name="restoreMode"][value="merge"]').checked=true;
  restoreWarning.hidden=true;
  $("restoreFileInfo").textContent=`Plik: ${file.name} • Wozów w kopii: ${pendingRestore.length} • Obecnie: ${vehicles.length}`;
  restoreOverlay.hidden=false;
 }catch(err){alert("Nie udało się odczytać kopii: "+err.message);e.target.value="";}
});
$("restoreConfirm").addEventListener("click",async()=>{
 if(!pendingRestore)return;
 const mode=restoreMode();
 if(mode==="replace"&&!confirm("UWAGA! Wszystkie obecne wozy zostaną zastąpione danymi z pliku. Czy na pewno kontynuować?"))return;
 const btn=$("restoreConfirm");btn.disabled=true;
 try{
  const existing=await all();
  const existingRegs=new Set(mode==="merge"?existing.map(v=>v.reg.trim().toLocaleUpperCase("pl-PL")):[]);
  const usedIds=new Set(mode==="merge"?existing.map(v=>v.id):[]);
  const toAdd=[];let skipped=0;
  for(const original of pendingRestore){
   const reg=original.reg.trim(),key=reg.toLocaleUpperCase("pl-PL");
   if(existingRegs.has(key)){skipped++;continue;}
   existingRegs.add(key);
   const v=normalizeVehicle(structuredClone(original));v.reg=reg;
   if(!v.id||usedIds.has(v.id))v.id=crypto.randomUUID();
   usedIds.add(v.id);toAdd.push(v);
  }
  await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,"readwrite"),store=tx.objectStore(STORE);
   if(mode==="replace")store.clear();
   toAdd.forEach(v=>store.put(v));
   tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error("Błąd zapisu"));tx.onabort=()=>reject(tx.error||Error("Przerwano zapis"));
  });
  closeRestore();await refresh();
  setStatus("globalStatus",mode==="replace"?`Zastąpiono ewidencję. Przywrócono ${toAdd.length} wozów; pominięto ${skipped} duplikatów w pliku.`:`Dodano ${toAdd.length} wozów; pominięto ${skipped} powtarzających się numerów rejestracyjnych. Istniejące wozy zachowano.`);
 }catch(err){alert("Nie udało się przywrócić kopii: "+err.message);}finally{btn.disabled=false;}
});
$("helpDrive").addEventListener("click",()=>alert("Aby zachować kopię na Google Drive:\n1. Wybierz „Kopia zapasowa”.\n2. Zapisz pobrany plik w telefonie.\n3. Otwórz aplikację Google Drive i prześlij ten plik.\n\nNa nowym telefonie pobierz plik z Drive i wybierz „Przywróć kopię”."));
(async()=>{try{db=await openDB();await refresh();if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});}catch(e){alert("Nie udało się uruchomić lokalnej bazy danych: "+e.message);}})();
})();
