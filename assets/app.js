'use strict';
/* BSCS 2025-29 class cloud storage. Static site: reads ./storage through manifest.json (falls back to the GitHub API).
   Admin mode edits the repository through the GitHub Git Data API with a fine-grained token. */
const CFG={owner:'acvbscs',repo:'acvbscs.github.io',root:'storage',recentDays:3,maxUpload:50e6};
/* On GitHub Pages the repo is detected from the address: owner.github.io -> owner/owner.github.io, owner.github.io/name/ -> owner/name */
{const h=location.hostname.match(/^([^.]+)\.github\.io$/),seg=location.pathname.split('/')[1];
 if(h){CFG.owner=h[1];CFG.repo=seg&&!seg.includes('.')?seg:h[1]+'.github.io'}}
const API=`https://api.github.com/repos/${CFG.owner}/${CFG.repo}`;
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);

/* ---------- helpers ---------- */
const EXT={img:'png jpg jpeg gif webp svg avif bmp',vid:'mp4 webm mov m4v',aud:'mp3 wav ogg m4a flac',pdf:'pdf',
  txt:'txt md csv json js py html css c cpp h java xml yml yaml log ini sh tex ts sql'};
const kind=e=>Object.keys(EXT).find(k=>EXT[k].split(' ').includes(e))||'';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nat=(a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'});
const par=p=>p.slice(0,Math.max(0,p.lastIndexOf('/')));
const enc=p=>p.split('/').map(encodeURIComponent).join('/');
const url=p=>CFG.root+'/'+enc(p),hash=p=>'#/'+enc(p),go=p=>{location.hash=hash(p)};
const dn=n=>n.replace(/^([A-Z]{2,4}-(?:\d+|[IV]+))\s+(?=\S)/,'$1 | '); /* display only: "CCC-301 | Name" */
const fmt=b=>b>=1e9?(b/1e9).toFixed(2)+' GB':b>=1e6?(b/1e6).toFixed(1)+' MB':b>=1e3?Math.round(b/1e3)+' KB':b+' B';
const fdate=m=>m?new Date(m).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'\u2014';
const ago=m=>{const d=Math.floor((Date.now()-m)/864e5);return d<1?'Today':d===1?'Yesterday':d+' days ago'};
const arch=s=>/^archive/i.test(s)?1:0;
const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
const svg=(w,body,a='fill="none" stroke="currentColor" stroke-width="1.6"')=>`<svg width="${w}" height="${w}" viewBox="0 0 ${w} ${w}" ${a} aria-hidden="true">${body}</svg>`;
const IC={dir:svg(22,'<path d="M2 5a2 2 0 012-2h4l2 2h8a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2z"/>','fill="currentColor"'),
  file:svg(22,'<path d="M5 2h8l5 5v13H5z"/><path d="M13 2v5h5"/>'),
  navDir:svg(16,'<path d="M2 4.5A1.5 1.5 0 013.5 3H6l1.5 1.5h5A1.5 1.5 0 0114 6v6a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12z"/>'),
  home:svg(16,'<path d="M2 7l6-5 6 5v7H2z"/>')};
function toast(t,keep){const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(toast.t);if(!keep)toast.t=setTimeout(()=>e.classList.remove('show'),2600)}

/* ---------- state ---------- */
const nodes=new Map(),kids=new Map(),sel=new Set();
let path='',q='',raw=[],token=null,branch='main',busy=false,menuPath=null,lastFocus=null;
const tk={get(){try{return localStorage.getItem('acv_t')||sessionStorage.getItem('acv_t')}catch(_){return null}},
  set(t,keep){try{(keep?localStorage:sessionStorage).setItem('acv_t',t)}catch(_){}},
  clear(){try{localStorage.removeItem('acv_t');sessionStorage.removeItem('acv_t')}catch(_){}}};
token=tk.get();

/* ---------- data ---------- */
async function fetchItems(){
  let man=null;
  try{const r=await fetch('manifest.json',{cache:'no-cache'});if(r.ok){const j=await r.json();if(Array.isArray(j))man=j}}catch(_){}
  if(man&&!token)return man;
  const t=token?await gh('/git/trees/'+branch+'?recursive=1'):await fetch(API+'/git/trees/HEAD?recursive=1').then(r=>{if(!r.ok)throw 0;return r.json()});
  const mt=new Map((man||[]).map(i=>[i.path,i.mtime])),pre=CFG.root+'/';
  return t.tree.filter(x=>x.path.startsWith(pre)).map(x=>{const p=x.path.slice(pre.length);return{path:p,dir:x.type==='tree',size:x.size||0,mtime:mt.get(p),sha:x.sha}});
}
async function load(){
  try{build(await fetchItems())}
  catch(_){$('#list').innerHTML='<div class="empty">Could not load the file list. Please try again in a few minutes.</div>';return}
  route();
}
function build(items){
  raw=items.filter(i=>!i.dir);nodes.clear();kids.clear();
  const add=(p,dir,size,m)=>{
    if(nodes.has(p))return;
    const name=p.slice(p.lastIndexOf('/')+1),i=name.lastIndexOf('.');
    nodes.set(p,{path:p,name,dir,size,m:m||0,files:0,ext:dir||i<1?'':name.slice(i+1).toLowerCase()});
    const pp=par(p);(kids.get(pp)||kids.set(pp,[]).get(pp)).push(p);
  };
  for(const i of items){
    const keep=i.path.split('/').pop()!=='.gitkeep',chain=[];
    for(let d=par(i.path);d;d=par(d))chain.unshift(d);
    chain.forEach(c=>add(c,true,0));
    if(keep)add(i.path,i.dir,i.size,i.mtime&&Date.parse(i.mtime));
  }
  nodes.set('',{path:'',name:'Storage',dir:true,size:0,files:0,m:0});
  for(const n of nodes.values()){
    if(n.dir)continue;
    for(let d=par(n.path);;d=par(d)){const a=nodes.get(d);a.size+=n.size;a.files++;a.m=Math.max(a.m,n.m);if(!d)break}
  }
  const tops=(kids.get('')||[]).filter(p=>nodes.get(p).dir).sort((a,b)=>arch(a)-arch(b)||nat(a,b));
  $('#nav').innerHTML=`<h4>General</h4><button data-go="">${IC.home}<span>All storage</span></button><h4>Folders</h4>`+
    tops.map(p=>`<button data-go="${esc(p)}">${IC.navDir}<span>${esc(nodes.get(p).name)}</span></button>`).join('');
}
const qn=()=>q.toLowerCase().replace(/\s*\|\s*/g,' ');
function route(){
  let p='';try{p=decodeURIComponent(location.hash.replace(/^#\/?/,''))}catch(_){}
  if(p&&!nodes.get(p)?.dir)p='';
  path=p;q='';$('#q').value='';sel.clear();render();scrollTo(0,0);
}

/* ---------- render ---------- */
function row(n,recent){
  const d=n.dir,i=d?-1:n.name.lastIndexOf('.'),p=esc(n.path),on=sel.has(n.path);
  const label=(i>0?esc(n.name.slice(0,i))+`<span class="ex">${esc(n.name.slice(i))}</span>`:esc(d?dn(n.name):n.name))+
    (recent?`<span class="sub">${esc(par(n.path).split('/').map(dn).join(' / '))}</span>`:'');
  const meta=recent?`<span>${fmt(n.size)}</span><span>${ago(n.m)}</span>`:d?`<span>${plural(n.files,'file')}</span><span>${fmt(n.size)}</span>`:`<span>${fmt(n.size)}</span><span>${fdate(n.m)}</span>`;
  return `<div class="row${on?' sel':''}" ${d?'data-open':'data-pv'}="${p}" tabindex="0" role="listitem">`+
    `<input class="cb" type="checkbox" data-s="${p}"${on?' checked':''} aria-label="Select ${esc(n.name)}">${d?IC.dir:IC.file}`+
    `<div class="body"><div class="nm" title="${p}">${label}</div><div class="mt">${meta}</div></div>`+
    `<button class="kb" data-menu="${p}" title="Options" aria-label="Options for ${esc(n.name)}" aria-haspopup="menu">&#8942;</button></div>`;
}
function render(){
  const all=q?[...nodes.values()].filter(n=>n.path&&n.name.toLowerCase().includes(qn())):(kids.get(path)||[]).map(p=>nodes.get(p));
  const dirs=all.filter(n=>n.dir).sort((a,b)=>(!q&&!path?arch(a.name)-arch(b.name):0)||nat(a.name,b.name));
  const files=all.filter(n=>!n.dir).sort((a,b)=>nat(a.name,b.name));
  const parts=path?path.split('/'):[],list=[...dirs,...files];
  $$('#nav button').forEach(b=>{const g=b.dataset.go;b.classList.toggle('on',!q&&(g===path||(g&&path.startsWith(g+'/'))))});
  $('#title').textContent=q?'Search results':parts.length?dn(parts[parts.length-1]):'Storage';
  $('#crumbs').hidden=!q&&!path;
  $('#crumbs').innerHTML=q?`<span>${all.length} match${all.length===1?'':'es'} for "${esc(q)}"</span>`:
    ['Storage',...parts].map((p,i)=>i===parts.length?`<b>${esc(dn(p))}</b>`:`<button data-go="${esc(parts.slice(0,i).join('/'))}">${esc(dn(p))}</button><span>/</span>`).join('');
  $('#list').innerHTML=list.length?list.map(n=>row(n)).join(''):`<div class="empty">${q?'No folders or files match your search.':'This folder is empty.'}</div>`;
  const days=CFG.recentDays,rec=!q&&!path?[...nodes.values()].filter(n=>!n.dir&&n.m&&Date.now()-n.m<days*864e5).sort((a,b)=>b.m-a.m):null;
  $('#recent').innerHTML=rec?`<h2 class="rh">Recently uploaded<span>Last ${days} days</span></h2>`+
    (rec.length?`<div class="list" role="list">${rec.map(n=>row(n,1)).join('')}</div>`:`<div class="empty">No files uploaded in the last ${days} days.</div>`):'';
  chrome();
}
function chrome(){
  const c=sel.size,node=nodes.get(path),dd=!q&&path&&!c&&node&&node.files>0;
  $('#dlDir').hidden=!dd;
  $('#sb').classList.toggle('show',c>0);$('#sc').textContent=c+' selected';
  $('main').classList.toggle('selmode',c>0);
  $('#bar').hidden=!(document.body.classList.contains('admin')||c||dd);
}

/* ---------- downloads ---------- */
function save(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
async function dlFile(p){
  toast('Downloading '+nodes.get(p).name+'...',1);
  try{const r=await fetch(url(p));if(!r.ok)throw 0;save(await r.blob(),nodes.get(p).name);toast('Downloaded')}catch(_){toast('Download failed')}
}
let zipLib;
const loadZip=()=>zipLib||(zipLib=new Promise((ok,no)=>{const s=document.createElement('script');s.src='assets/jszip.min.js';
  s.onload=()=>ok(window.JSZip);s.onerror=()=>{zipLib=null;no(new Error('zip library'))};document.head.appendChild(s)}));
const filesUnder=p=>{const n=nodes.get(p);return n.dir?(kids.get(p)||[]).flatMap(filesUnder):[n]};
async function pool(items,size,fn){let i=0;await Promise.all(Array.from({length:size},async()=>{while(i<items.length)await fn(items[i++])}))}
async function dlZip(paths,name,base){
  const list=[...new Map(paths.flatMap(filesUnder).map(n=>[n.path,n])).values()];
  if(!list.length)return toast('Nothing to download');
  try{
    const zip=new(await loadZip())();let done=0;
    await pool(list,4,async n=>{
      const r=await fetch(url(n.path));if(!r.ok)throw 0;
      zip.file(base&&n.path.startsWith(base+'/')?n.path.slice(base.length+1):n.path,await r.blob());
      toast(`Preparing ZIP ${++done} of ${list.length}...`,1);
    });
    toast('Compressing...',1);
    save(await zip.generateAsync({type:'blob',compression:'STORE'}),name+'.zip');toast('Downloaded');
  }catch(_){toast('ZIP failed: could not fetch every file')}
}

/* ---------- preview ---------- */
async function preview(p){
  const n=nodes.get(p),u=url(p),b=$('#pb'),k=kind(n.ext);
  lastFocus=document.activeElement;$('#pn').textContent=n.name;$('#pd').onclick=()=>dlFile(p);b.innerHTML='';
  if(k==='img')b.innerHTML=`<img src="${u}" alt="${esc(n.name)}">`;
  else if(k==='vid')b.innerHTML=`<video src="${u}" controls></video>`;
  else if(k==='aud')b.innerHTML=`<audio src="${u}" controls></audio>`;
  else if(k==='pdf')b.innerHTML=`<iframe src="${u}" title="${esc(n.name)}"></iframe>`;
  else if(k==='txt'){
    b.innerHTML='<div class="empty">Loading...</div>';
    try{const t=await(await fetch(u)).text(),pre=document.createElement('pre');
      pre.textContent=t.length>2e5?t.slice(0,2e5)+'\n\n[Preview truncated. Download the file to see everything.]':t;b.replaceChildren(pre)}
    catch(_){b.innerHTML='<div class="empty">Could not load this file.</div>'}
  }else b.innerHTML=`<div class="empty">No in-site preview for ${n.ext?'.'+esc(n.ext)+' ':''}files.<br>Use Download to open it on your device.</div>`;
  $('#modal').classList.add('show');$('#px').focus();
}
function closeModals(){
  $$('.modal').forEach(m=>m.classList.remove('show'));$('#pb').innerHTML='';
  const f=lastFocus;lastFocus=null;if(f&&f.isConnected)f.focus();
}

/* ---------- options menu ---------- */
const closeMenu=()=>{$('#menu').classList.remove('show');$$('[data-menu][aria-expanded]').forEach(b=>b.removeAttribute('aria-expanded'))};
function openMenu(b){
  const p=b.dataset.menu,n=nodes.get(p),m=$('#menu');
  if(m.classList.contains('show')&&menuPath===p)return closeMenu();
  closeMenu();menuPath=p;
  const it=n.dir?[['open','Open'],['tab','Open in new tab'],['dl','Download as ZIP']]:[['pv','Preview'],['tab','Open in new tab'],['dl','Download']];
  if(!n.dir&&par(p)!==path)it.splice(1,0,['loc','Show in folder']);
  it.push(['sel',sel.has(p)?'Deselect':'Select']);
  if(token)it.push(['ren','Rename / Move'],['del','Delete']);
  m.innerHTML=`<div class="mh">${esc(n.dir?dn(n.name):n.name)}</div>`+it.map(([a,l])=>`<button role="menuitem" data-act="${a}">${l}</button>`).join('');
  m.classList.add('show');b.setAttribute('aria-expanded','true');
  const r=b.getBoundingClientRect(),w=m.offsetWidth,h=m.offsetHeight;
  m.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+'px';
  m.style.top=(r.bottom+h+8>innerHeight?Math.max(8,r.top-h-4):r.bottom+4)+'px';
}
function act(a){
  const p=menuPath,n=nodes.get(p);closeMenu();
  if(a==='open')go(p);
  else if(a==='pv')preview(p);
  else if(a==='loc')go(par(p));
  else if(a==='tab')window.open(n.dir?location.pathname+hash(p):url(p),'_blank','noopener');
  else if(a==='dl')n.dir?dlZip([p],n.name,par(p)):dlFile(p);
  else if(a==='sel'){sel.has(p)?sel.delete(p):sel.add(p);render()}
  else if(a==='ren')rename(p);
  else if(a==='del')remove([p]);
}

/* ---------- admin: GitHub Git Data API ---------- */
async function gh(p,o={}){
  const r=await fetch(API+p,{...o,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'Content-Type':'application/json'}});
  if(!r.ok){let m=r.status;try{m=(await r.json()).message||m}catch(_){}throw new Error(m)}
  return r.status===204?null:r.json();
}
const b64=f=>new Promise((ok,no)=>{const x=new FileReader();x.onload=()=>ok(x.result.split(',')[1]);x.onerror=no;x.readAsDataURL(f)});
const run=async f=>{if(busy)return;busy=true;try{await f()}catch(e){$('#toast').classList.remove('show');alert('Failed: '+e.message)}finally{busy=false}};
const under=p=>raw.filter(i=>i.path===p||i.path.startsWith(p+'/')).map(i=>i.path);
function setAdmin(on){document.body.classList.toggle('admin',on);$('#adminBtn').textContent=on?'Sign out':'Admin'}
/* One atomic commit: adds [{path,file}], dels [path], moves [{from,to}]; manifest.json is updated in the same commit. */
async function commit(adds,dels,moves,msg){
  toast('Saving...',1);
  const ref=await gh('/git/ref/heads/'+branch),base=(await gh('/git/commits/'+ref.object.sha)).tree.sha;
  const files=new Map(raw.map(i=>[i.path,i])),E=[],now=new Date().toISOString(),T=p=>({path:CFG.root+'/'+p,mode:'100644',type:'blob'});
  dels.forEach(p=>{E.push({...T(p),sha:null});files.delete(p)});
  moves.forEach(({from,to})=>{const o=files.get(from);E.push({...T(from),sha:null},{...T(to),sha:o.sha});files.delete(from);files.set(to,{...o,path:to})});
  let i=0;
  for(const a of adds){
    toast(`Uploading ${++i} of ${adds.length}...`,1);
    const bl=await gh('/git/blobs',{method:'POST',body:JSON.stringify({content:await b64(a.file),encoding:'base64'})});
    E.push({...T(a.path),sha:bl.sha});files.set(a.path,{path:a.path,size:a.file.size,mtime:now,sha:bl.sha});
  }
  const list=[...files.values()].sort((a,b)=>nat(a.path,b.path));
  E.push({path:'manifest.json',mode:'100644',type:'blob',content:JSON.stringify(list.map(({path,size,mtime})=>({path,dir:false,size,mtime})),null,1)});
  const tr=await gh('/git/trees',{method:'POST',body:JSON.stringify({base_tree:base,tree:E})});
  const cm=await gh('/git/commits',{method:'POST',body:JSON.stringify({message:'[admin] '+msg,tree:tr.sha,parents:[ref.object.sha]})});
  await gh('/git/refs/heads/'+branch,{method:'PATCH',body:JSON.stringify({sha:cm.sha})});
  sel.clear();build(list);render();toast('Saved. Visitors will see it in about a minute.');
}
async function upload(files){
  const big=files.filter(f=>f.file.size>CFG.maxUpload);files=files.filter(f=>f.file.size<=CFG.maxUpload);
  if(big.length)alert('Skipped (over 50 MB):\n'+big.map(f=>f.rel).join('\n'));
  if(!files.length)return;
  const adds=files.map(f=>({path:(path?path+'/':'')+f.rel,file:f.file})),ex=adds.filter(a=>raw.some(i=>i.path===a.path)).length;
  if(ex&&!confirm(ex+' file(s) already exist and will be replaced. Continue?'))return;
  await run(()=>commit(adds,[],[],`Upload ${adds.length} file(s)${path?' to '+path:''}`));
}
async function newFolder(){
  const n=(prompt('New folder name')||'').trim();if(!n)return;
  if(/[\/\\]/.test(n)||n==='.'||n==='..')return alert('Folder name cannot contain slashes.');
  const p=(path?path+'/':'')+n;if(nodes.has(p))return alert('That folder already exists.');
  await run(()=>commit([{path:p+'/.gitkeep',file:new Blob([])}],[],[],'New folder '+p));
}
async function rename(p){
  const v=prompt('Rename or move (full path inside storage):',p);if(v===null)return;
  const to=v.trim().replace(/^\/+|\/+$/g,'');
  if(!to||to===p||to.split('/').some(x=>!x||x==='.'||x==='..'))return alert('Invalid name.');
  if(nodes.has(to)||raw.some(i=>i.path===to))return alert('That name already exists.');
  if(to.startsWith(p+'/'))return alert('Cannot move a folder into itself.');
  await run(()=>commit([],[],under(p).map(f=>({from:f,to:to+f.slice(p.length)})),`Rename ${p} to ${to}`));
}
async function remove(paths){
  const f=[...new Set(paths.flatMap(under))],c=f.filter(x=>!x.endsWith('.gitkeep')).length;
  if(!confirm(`Delete ${paths.length} item(s) (${plural(c,'file')})? This cannot be undone from the site.`))return;
  await run(()=>commit([],f,[],`Delete ${paths.length} item(s)`));
}
async function signIn(){
  const t=$('#tk').value.trim();if(!t)return;$('#le').textContent='Checking...';token=t;
  try{
    const r=await gh('');if(r.permissions&&!r.permissions.push)throw new Error('this token cannot write to the repository');
    branch=r.default_branch;tk.set(t,$('#rm').checked);
    closeModals();$('#tk').value='';$('#le').textContent='';setAdmin(true);await load();toast('Signed in as admin');
  }catch(e){token=null;$('#le').textContent='Sign-in failed: '+e.message}
}
async function signOut(){token=null;tk.clear();setAdmin(false);sel.clear();await load()}

/* ---------- events ---------- */
document.addEventListener('click',e=>{
  const t=e.target,g=s=>t.closest(s);let x;
  if(!g('#menu')&&!g('[data-menu]'))closeMenu();
  if(t.matches('.cb')){t.checked?sel.add(t.dataset.s):sel.delete(t.dataset.s);t.closest('.row').classList.toggle('sel',t.checked);return chrome()}
  if(x=g('[data-act]'))return act(x.dataset.act);
  if(x=g('[data-menu]'))return openMenu(x);
  if(x=g('[data-pv]'))return preview(x.dataset.pv);
  if(x=g('[data-open]'))return go(x.dataset.open);
  if(x=g('[data-go]'))return go(x.dataset.go);
  if(t.classList.contains('modal'))closeModals();
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeModals();closeMenu()}
  else if(e.key==='Enter'&&e.target.matches('.row')){const d=e.target.dataset;d.open!==undefined?go(d.open):preview(d.pv)}
});
let qTimer;
$('#q').addEventListener('input',e=>{clearTimeout(qTimer);qTimer=setTimeout(()=>{q=e.target.value.trim();render()},120)});
$('#px').onclick=closeModals;
$('#lx').onclick=closeModals;
$('#dlDir').onclick=()=>dlZip([path],nodes.get(path).name,par(path));
$('#dlSel').onclick=()=>dlZip([...sel],'selection',q?'':path);
$('#delSel').onclick=()=>remove([...sel]);
$('#clr').onclick=()=>{sel.clear();render()};
$('#adminBtn').onclick=()=>{if(token)return signOut();lastFocus=document.activeElement;$('#login').classList.add('show');$('#tk').focus()};
$('#ls').onclick=signIn;
$('#tk').onkeydown=e=>{if(e.key==='Enter')signIn()};
$('#up').onclick=()=>$('#fi').click();
$('#upd').onclick=()=>$('#fd').click();
$('#fi').onchange=e=>{upload([...e.target.files].map(f=>({file:f,rel:f.name})));e.target.value=''};
$('#fd').onchange=e=>{upload([...e.target.files].map(f=>({file:f,rel:f.webkitRelativePath||f.name})));e.target.value=''};
$('#nf').onclick=newFolder;
{const mn=$('main');
  ['dragenter','dragover'].forEach(v=>mn.addEventListener(v,e=>{if(token){e.preventDefault();mn.classList.add('drag')}}));
  mn.addEventListener('dragleave',e=>{if(e.target===mn)mn.classList.remove('drag')});
  mn.addEventListener('drop',e=>{if(!token)return;e.preventDefault();mn.classList.remove('drag');upload([...e.dataTransfer.files].map(f=>({file:f,rel:f.name})))})}
{const top=$('.top'),st=()=>top.classList.toggle('stuck',scrollY>8);addEventListener('scroll',st,{passive:true});st()}
const desktop=()=>innerWidth>760;
addEventListener('scroll',()=>{if(desktop())closeMenu()},true);
addEventListener('resize',()=>{if(desktop())closeMenu()});
addEventListener('hashchange',route);
$('#theme').onclick=()=>{
  const t=document.documentElement.dataset.theme==='dark'?'light':'dark';
  document.documentElement.dataset.theme=t;$('meta[name=theme-color]').content=t==='dark'?'#1A1A1A':'#F2F6F8';
  try{localStorage.setItem('theme',t)}catch(_){}
};
(async()=>{
  $('meta[name=theme-color]').content=document.documentElement.dataset.theme==='light'?'#F2F6F8':'#1A1A1A';
  if(token){try{branch=(await gh('')).default_branch;setAdmin(true)}catch(_){token=null;tk.clear()}}
  load();
})();
