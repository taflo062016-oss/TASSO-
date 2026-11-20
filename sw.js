/* TASSO' : fonctionnement hors ligne + réception des fichiers partagés depuis la galerie */
const APP='scan-app-v27',SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-mask-192.png','./icon-mask-512.png','./fra.js','./eng.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(APP).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('scan-app-')&&k!==APP).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);
  if(e.request.method==='POST'&&u.pathname.endsWith('/share-target')){e.respondWith((async()=>{const fd=await e.request.formData(),files=fd.getAll('media'),c=await caches.open('scan-shared');
      await Promise.all((await c.keys()).map(k=>c.delete(k)));let i=0;
      for(const f of files){if(!(f instanceof File))continue;await c.put(new Request(`./shared/${Date.now()}-${i++}`),new Response(f,{headers:{'content-type':f.type||'image/jpeg','x-name':encodeURIComponent(f.name||'image.jpg')}}))}
      return Response.redirect('./index.html?share=1',303)})());return}
  if(e.request.method!=='GET'||u.origin!==location.origin)return;
  // réseau d'abord (pour recevoir les mises à jour), sinon la copie hors ligne
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(APP).then(c=>c.put(e.request,cp))}return r}).catch(()=>caches.match(e.request,{ignoreSearch:true})))});
