(() => {
"use strict";
const CATS=["BZZ-01","BZ-05","KWN-01","DES-40"];
const DB_NAME="serial-scanner-zssw30", DB_VERSION=1, STORE="vehicles";
let db=null, vehicles=[], openCats=new Set(), worker=null;
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const stamp=()=>new Date().toISOString();

function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:"id"});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function all(){return new Promise((resolve,reject)=>{const r=db.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error);});}
function put(v){return new Promise((resolve,reject)=>{const t=db.transaction(STORE,"readwrite");t.objectStore(STORE).put(v);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});}
function remove(id){return new Promise((resolve,reject)=>{const t=db.transaction(STORE,"readwrite");t.objectStore(STORE).delete(id);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});}
function freshVehicle(reg){return{id:crypto.randomUUID(),reg:reg.trim(),comment:"",createdAt:stamp(),categories:CATS.map(name=>({name,comment:"",serials:[]}))};}
async function refresh(){vehicles=(await all()).sort((a,b)=>a.reg.localeCompare(b.reg,"pl",{numeric:true}));render();}
function render(){
  $("vehicleCount").textContent=vehicles.length+" wozów";
  if(!vehicles.length){$("vehicles").innerHTML='<div class="empty"><div class="big">▣</div>Nie dodano jeszcze żadnego wozu.</div>';return;}
  $("vehicles").innerHTML=vehicles.map(v=>`
  <article class="vehicle">
    <div class="vehicle-head"><div class="vehicle-title"><h3>${esc(v.reg)}</h3><p>${v.categories.reduce((n,c)=>n+c.serials.length,0)} zapisanych numerów seryjnych</p></div>
    <div class="vehicle-actions"><button class="small ghost" data-action="export-one" data-id="${v.id}">Excel</button><button class="small danger" data-action="delete-vehicle" data-id="${v.id}">Usuń</button></div></div>
    <div style="padding:0 16px 12px"><label class="comment-label" for="vc-${v.id}">Komentarz do wozu</label><textarea id="vc-${v.id}" data-action="vehicle-comment" data-id="${v.id}" placeholder="Dodaj ogólny komentarz...">${esc(v.comment)}</textarea></div>
    <div class="category-list">${v.categories.map(c=>{
      const key=v.id+"|"+c.name,opened=openCats.has(key);
      return `<section class="category"><button class="cat-head" data-action="toggle-cat" data-id="${v.id}" data-cat="${c.name}"><span class="cat-name">${esc(c.name)}</span><span class="cat-count">${c.serials.length} numerów</span><span class="chev">${opened?"−":"+"}</span></button>
      ${opened?`<div class="cat-body"><div class="muted">Dodaj numer seryjny ręcznie lub zeskanuj tekst aparatem.</div>
      <div class="serial-form"><input class="input" id="serial-${v.id}-${c.name}" placeholder="Numer seryjny" autocomplete="off"><button class="primary small" data-action="add-serial" data-id="${v.id}" data-cat="${c.name}">Dodaj</button></div>
      <label class="secondary small file-btn">📷 Skanuj tekst<input type="file" accept="image/*" capture="environment" data-action="ocr" data-id="${v.id}" data-cat="${c.name}"></label>
      <div class="status" id="ocr-${v.id}-${c.name}" role="status"></div>
      <div class="serial-list">${c.serials.length?c.serials.map(s=>`<div class="serial-row"><span class="serial-value">${esc(s.value)}</span><div class="serial-actions"><button class="ghost" data-action="edit-serial" data-id="${v.id}" data-cat="${c.name}" data-sid="${s.id}">Edytuj</button><button class="danger" data-action="delete-serial" data-id="${v.id}" data-cat="${c.name}" data-sid="${s.id}">×</button></div></div>`).join(""):'<div class="muted">Brak zapisanych numerów.</div>'}</div>
      <label class="comment-label" for="cc-${v.id}-${c.name}">Komentarz do ${c.name}</label><textarea id="cc-${v.id}-${c.name}" data-action="category-comment" data-id="${v.id}" data-cat="${c.name}" placeholder="Komentarz do podkategorii...">${esc(c.comment)}</textarea></div>`:""}</section>`;
    }).join("")}</div>
  </article>`).join("");
}
function setStatus(id,msg){const el=$(id);if(el)el.textContent=msg;}
async function updateVehicle(id,fn){const v=vehicles.find(x=>x.id===id);if(!v)return;fn(v);await put(v);await refresh();}

$("addForm").addEventListener("submit",async e=>{
  e.preventDefault();const input=$("newVehicle"),reg=input.value.trim();if(!reg)return;
  if(vehicles.some(v=>v.reg.toLowerCase()===reg.toLowerCase())){alert("Taki numer rejestracyjny jest już na liście.");return;}
  await put(freshVehicle(reg));input.value="";await refresh();
});
$("vehicles").addEventListener("click",async e=>{
  const b=e.target.closest("[data-action]");if(!b)return;const a=b.dataset.action,id=b.dataset.id,cat=b.dataset.cat;
  if(a==="toggle-cat"){const k=id+"|"+cat;openCats.has(k)?openCats.delete(k):openCats.add(k);render();}
  if(a==="add-serial"){const inp=$("serial-"+id+"-"+cat),value=inp.value.trim();if(!value)return;await updateVehicle(id,v=>v.categories.find(x=>x.name===cat).serials.push({id:crypto.randomUUID(),value,createdAt:stamp()}));}
  if(a==="delete-serial"&&confirm("Usunąć ten numer seryjny?"))await updateVehicle(id,v=>{const c=v.categories.find(x=>x.name===cat);c.serials=c.serials.filter(s=>s.id!==b.dataset.sid);});
  if(a==="edit-serial"){const v=vehicles.find(x=>x.id===id),s=v.categories.find(x=>x.name===cat).serials.find(x=>x.id===b.dataset.sid);const val=prompt("Edytuj numer seryjny:",s.value);if(val!==null&&val.trim())await updateVehicle(id,v=>{v.categories.find(x=>x.name===cat).serials.find(x=>x.id===b.dataset.sid).value=val.trim();});}
  if(a==="delete-vehicle"&&confirm("Usunąć wóz "+(vehicles.find(x=>x.id===id)?.reg||"")+" wraz ze wszystkimi danymi?")){await remove(id);await refresh();}
  if(a==="export-one")exportExcel([vehicles.find(x=>x.id===id)]);
});
$("vehicles").addEventListener("change",async e=>{
  const el=e.target;
  if(el.dataset.action==="vehicle-comment")await updateVehicle(el.dataset.id,v=>v.comment=el.value);
  if(el.dataset.action==="category-comment")await updateVehicle(el.dataset.id,v=>v.categories.find(c=>c.name===el.dataset.cat).comment=el.value);
  if(el.dataset.action==="ocr")await runOCR(el);
});
$("vehicles").addEventListener("keydown",e=>{
  if(e.key==="Enter"&&e.target.matches('input[id^="serial-"]')){
    e.preventDefault();const id=e.target.id.slice(7),cat=e.target.id.slice(7+id.length+1);
    $("vehicles").querySelector(`[data-action="add-serial"][data-id="${id}"][data-cat="${cat}"]`)?.click();
  }
});
async function runOCR(input){
  const file=input.files?.[0];if(!file)return;const id=input.dataset.id,cat=input.dataset.cat,status="ocr-"+id+"-"+cat;
  try{
    setStatus(status,"Przygotowuję rozpoznawanie tekstu…");
    if(!window.Tesseract)throw Error("Biblioteka OCR nie została pobrana. Sprawdź połączenie z internetem.");
    if(!worker)worker=await Tesseract.createWorker("eng",1,{logger:m=>{if(m.status==="recognizing text")setStatus(status,"Rozpoznawanie tekstu: "+Math.round(m.progress*100)+"%");}});
    const result=await worker.recognize(file),recognized=result.data.text.replace(/\s+/g," ").trim();
    const candidates=recognized.match(/[A-Z0-9][A-Z0-9\-\/._]{3,}/gi)||[],unique=[...new Set(candidates)];
    if(!unique.length){setStatus(status,"Nie znaleziono numeru. Wpisz go ręcznie.");return;}
    const selected=prompt("Rozpoznane fragmenty. Sprawdź i popraw numer:",unique[0]);
    if(selected&&selected.trim()){
      await updateVehicle(id,v=>v.categories.find(c=>c.name===cat).serials.push({id:crypto.randomUUID(),value:selected.trim(),createdAt:stamp()}));
      setStatus(status,"Dodano numer po skanowaniu.");
    }else setStatus(status,"Skanowanie zakończone — nic nie dodano.");
  }catch(err){setStatus(status,"Błąd OCR: "+err.message);}
  finally{input.value="";}
}
function exportExcel(items){
  if(!items?.length){alert("Brak danych do eksportu.");return;}
  if(!window.XLSX){alert("Biblioteka Excel nie została pobrana. Sprawdź połączenie z internetem.");return;}
  const wb=XLSX.utils.book_new();
  items.forEach(v=>{
    const rows=[["Wóz",v.reg],["Komentarz ogólny",v.comment||""],[],["Podkategoria","Numer seryjny","Data dodania","Komentarz podkategorii"]];
    v.categories.forEach(c=>{if(c.serials.length)c.serials.forEach(s=>rows.push([c.name,s.value,new Date(s.createdAt).toLocaleString("pl-PL"),c.comment||""]));else rows.push([c.name,"","",c.comment||""]);});
    const ws=XLSX.utils.aoa_to_sheet(rows);ws["!cols"]=[{wch:18},{wch:32},{wch:22},{wch:48}];
    let name=v.reg.replace(/[\\/?*[\]:]/g," ").slice(0,31)||"Wóz",base=name,n=1;
    while(wb.SheetNames.includes(name))name=(base.slice(0,27)+"_"+(++n)).slice(0,31);
    XLSX.utils.book_append_sheet(wb,ws,name);
  });
  XLSX.writeFile(wb,items.length===1?"Ewidencja_"+items[0].reg+".xlsx":"Ewidencja_wszystkie_wozy.xlsx");
}
$("exportAll").addEventListener("click",()=>exportExcel(vehicles));
function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
$("backup").addEventListener("click",()=>{
  const payload={app:"Serial Scanner",version:1,exportedAt:stamp(),vehicles};
  download("serial-scanner-backup-"+new Date().toISOString().slice(0,10)+".json",JSON.stringify(payload,null,2),"application/json");
  setStatus("globalStatus","Kopia została przygotowana. Zapisz plik w telefonie lub prześlij go ręcznie na Google Drive.");
});
$("restoreFile").addEventListener("change",async e=>{
  const f=e.target.files?.[0];if(!f)return;
  try{
    const data=JSON.parse(await f.text());if(!Array.isArray(data.vehicles))throw Error("Plik nie zawiera poprawnej ewidencji.");
    if(!confirm("Przywrócenie zastąpi aktualną ewidencję. Kontynuować?"))return;
    const tx=db.transaction(STORE,"readwrite"),store=tx.objectStore(STORE);store.clear();
    data.vehicles.forEach(v=>{if(v.id&&v.reg&&Array.isArray(v.categories))store.put(v);});
    await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});
    await refresh();setStatus("globalStatus","Kopia została przywrócona.");
  }catch(err){alert("Nie udało się przywrócić kopii: "+err.message);}
  finally{e.target.value="";}
});
$("helpDrive").addEventListener("click",()=>alert("Aby zachować kopię na Google Drive:\n1. Wybierz „Kopia zapasowa”.\n2. Zapisz pobrany plik w telefonie.\n3. Otwórz aplikację Google Drive i prześlij ten plik.\n\nNa nowym telefonie pobierz plik z Drive i wybierz „Przywróć kopię”."));
(async()=>{
  try{
    db=await openDB();await refresh();
    if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
  }catch(e){alert("Nie udało się uruchomić lokalnej bazy danych: "+e.message);}
})();
})();