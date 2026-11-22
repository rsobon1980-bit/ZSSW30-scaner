(()=>{
 const overlay=document.getElementById('installOverlay');
 const action=document.getElementById('installAction');
 const dismiss=document.getElementById('installDismiss');
 const instructions=document.getElementById('installInstructions');
 const isIos=/iPad|iPhone|iPod/.test(navigator.userAgent)|| (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 let promptEvent=null;
 const KEY='zssw30-install-intro-dismissed-v34';
 const show=()=>{if(standalone)return;overlay.hidden=false;document.body.style.overflow='hidden';update();};
 const close=()=>{overlay.hidden=true;document.body.style.overflow='';try{localStorage.setItem(KEY,'1')}catch(e){}};
 function update(){
  if(isIos){action.textContent='Jak dodać na iPhone?';instructions.hidden=false;instructions.textContent='Otwórz stronę w Safari, naciśnij Udostępnij (kwadrat ze strzałką), wybierz „Dodaj do ekranu początkowego” i zatwierdź. Na niektórych wersjach iOS opcja znajduje się w menu przeglądarki.';}
  else if(promptEvent){action.textContent='Zainstaluj aplikację';instructions.hidden=true;}
  else{action.textContent='Jak zainstalować?';instructions.hidden=false;instructions.textContent='W Chrome na Androidzie otwórz menu ⋮ i wybierz „Zainstaluj aplikację” lub „Dodaj do ekranu głównego”. Jeśli instalacja nie jest jeszcze dostępna, spróbuj ponownie po odświeżeniu strony.';}
 }
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptEvent=e;update();});
 window.addEventListener('appinstalled',()=>{promptEvent=null;close();});
 action.addEventListener('click',async()=>{if(promptEvent){const e=promptEvent;promptEvent=null;try{await e.prompt();const result=await e.userChoice;if(result?.outcome==='accepted')close();else update();}catch(_){update();}}else update();});
 dismiss.addEventListener('click',close);
 const controls=document.querySelector('.header-controls');
 if(controls){const btn=document.createElement('button');btn.type='button';btn.className='install-open-button';btn.textContent='Instalacja';btn.title='Pokaż instrukcję instalacji';btn.addEventListener('click',show);controls.appendChild(btn);if(standalone)btn.hidden=true;}
 let dismissed=false;try{dismissed=localStorage.getItem(KEY)==='1'}catch(e){}
 if(!standalone&&!dismissed)window.addEventListener('load',()=>setTimeout(show,350),{once:true});
})();
