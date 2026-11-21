/* TASSO' : fonctionnement hors ligne + réception des fichiers partagés depuis la galerie */
const APP='scan-app-v34',SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-mask-192.png','./icon-mask-512.png','./fra.js','./eng.js','./pdf.min.mjs','./pdf.worker.min.mjs','./pdf-lib.min.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(APP).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('scan-app-')&&k!==APP).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
let pending=false;const notify=()=>{pending=true;return self.clients.matchAll({type:'window'}).then(cs=>cs.forEach(c=>c.postMessage({type:'tasso-update'})))};
self.addEventListener('message',e=>{if(e.data&&e.data.type==='tasso-hello'&&pending&&e.source)e.source.postMessage({type:'tasso-update'})});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);
  if(e.request.method==='POST'&&u.pathname.endsWith('/share-target')){e.respondWith((async()=>{const fd=await e.request.formData(),files=fd.getAll('media'),c=await caches.open('scan-shared');
      await Promise.all((await c.keys()).map(k=>c.delete(k)));let i=0;
      for(const f of files){if(!(f instanceof File))continue;await c.put(new Request(`./shared/${Date.now()}-${i++}`),new Response(f,{headers:{'content-type':f.type||'image/jpeg','x-name':encodeURIComponent(f.name||'image.jpg')}}))}
      return Response.redirect('./index.html?share=1',303)})());return}
  if(e.request.method!=='GET'||u.origin!==location.origin)return;
  // Copie enregistrée d'abord (démarrage immédiat, même si le réseau bloque github.io),
  // puis mise à jour discrète en arrière-plan, utilisée au lancement suivant.
  e.respondWith((async()=>{const c=await caches.open(APP),key=e.request.mode==='navigate'?'./index.html':e.request,hit=await c.match(key,{ignoreSearch:true});if(hit&&e.request.mode==='navigate')pending=false;const hitTxt=hit&&e.request.mode==='navigate'?hit.clone().text():null;
    const net=(async()=>{const ac=new AbortController(),t=setTimeout(()=>ac.abort(),hit?20000:10000);
      try{const r=await fetch(u.origin+u.pathname,{signal:ac.signal,cache:'no-cache'});
        if(r.ok){if(hit&&e.request.mode==='navigate'){const[a,b]=await Promise.all([hitTxt,r.clone().text()]);if(a!==b){await c.put('./index.html',r.clone());notify();return r}}await c.put(e.request.mode==='navigate'?'./index.html':e.request,r.clone())}return r}
      finally{clearTimeout(t)}})();
    if(hit){e.waitUntil(net.catch(()=>{}));return hit}
    try{return await net}catch(err){return(await caches.match(e.request,{ignoreSearch:true}))||Response.error()}})())});
