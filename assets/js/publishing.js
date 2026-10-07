(function () {
  'use strict';
  const repo='Qinruojun/Qinruojun.github.io', api='https://api.github.com', sessionKey='ruojun-github-session-v1';
  let token='';
  try {token=sessionStorage.getItem(sessionKey)||'';}catch(_){}
  const folder=type=>type==='paper'?'_papers':'_blog';
  const validId=id=>typeof id==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
  function path(type,id){if(!validId(id))throw new Error('Invalid article URL name.');return folder(type)+'/'+id+'.md';}
  function encode(text){const bytes=new TextEncoder().encode(text);let binary='';for(const b of bytes)binary+=String.fromCharCode(b);return btoa(binary);}
  function decode(text){return new TextDecoder().decode(Uint8Array.from(atob(text.replace(/\s/g,'')),c=>c.charCodeAt(0)));}
  async function request(route,options={},credential='') {
    const headers={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...options.headers};
    if(credential)headers.Authorization='Bearer '+credential;
    let response;
    try {response=await fetch(api+route,{...options,headers,cache:'no-store',signal:AbortSignal.timeout(15000)});}catch(_){throw new Error('Cannot reach GitHub. Your draft is saved here; check your connection and retry.');}
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      const messages={401:'Your GitHub connection has expired. Disconnect and connect again.',403:'GitHub denied this request. Check the token has Contents: Read and write for this repository, or retry after the API rate limit resets.',404:'This article or repository could not be found.',409:'This article changed on GitHub. Your draft is safe. Download it before reopening the latest version; it has not been overwritten.',422:'GitHub could not save this file. The URL name may already exist or the repository may require a different publishing rule.'};
      const error=new Error(messages[response.status]||'GitHub could not save this request (HTTP '+response.status+'). Your draft is safe.');error.status=response.status;throw error;
    }
    return data;
  }
  function parse(text,type,id,sha) {
    const match=text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if(!match)throw new Error('This article has no readable metadata.');
    const meta=jsyaml.load(match[1],{schema:jsyaml.JSON_SCHEMA})||{};
    const str=value=>value==null?'':String(value);
    return {type,slug:id,title:str(meta.title),summary:str(meta.summary),date:str(meta.date).slice(0,10),tags:Array.isArray(meta.tags)?meta.tags.join(', '):str(meta.tags),cover:str(meta.cover),math:meta.math===true,'paper-title':str(meta.paper_title),'paper-url':str(meta.paper_url),'code-url':str(meta.code_url),body:text.slice(match[0].length).replace(/^\n/,''),editingMs:Math.max(0,Number(meta.editing_time_seconds)||0)*1000,remoteSha:sha,published:meta.published!==false,dirty:false,updatedAt:meta.updated_at||meta.date||''};
  }
  async function read(type,id) {
    const file=await request('/repos/'+repo+'/contents/'+path(type,id)+'?ref=main');
    if(!file.content)throw new Error('This file is too large for the editor. Download the Markdown from GitHub.');
    return parse(decode(file.content),type,id,file.sha);
  }
  async function write(type,id,markdown,sha) {
    if(!token)throw new Error('Connect GitHub before publishing.');
    const data={message:(sha?'Update ':'Publish ')+id,content:encode(markdown),branch:'main'};
    if(sha)data.sha=sha;
    return request('/repos/'+repo+'/contents/'+path(type,id),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)},token);
  }
  const draftPrefix='ruojun-writing-draft-v2-';
  function draftKey(type,id){return draftPrefix+type+'-'+id;}
  function getDraft(type,id){try{return JSON.parse(localStorage.getItem(draftKey(type,id))||'null');}catch(_){return null;}}
  function saveDraft(type,id,value){localStorage.setItem(draftKey(type,id),JSON.stringify(value));localStorage.setItem(draftPrefix+'active-'+type,id);}
  function drafts(type){const values=[];for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key.startsWith(draftPrefix+type+'-'))continue;try{const value=JSON.parse(localStorage.getItem(key));if(value&&validId(value.slug))values.push(value);}catch(_){}}return values.sort((a,b)=>(b.savedAt||0)-(a.savedAt||0));}
  function active(type){try{return localStorage.getItem(draftPrefix+'active-'+type);}catch(_){return null;}}
  function migrate(type){
    try {const old=JSON.parse(localStorage.getItem('ruojun-writing-draft-v1-'+type)||'null');if(old&&validId(old.slug)&&!getDraft(type,old.slug)){saveDraft(type,old.slug,{...old,dirty:true,savedAt:Date.now()});}return old;}catch(_){return null;}
  }
  const readerURL=(type,id)=>'/read/?type='+type+'&post='+encodeURIComponent(id);
  const editorURL=(type,id)=>'/write/?type='+type+'&post='+encodeURIComponent(id);
  function connectionLabel(){const b=document.getElementById('writer-connect');if(b)b.textContent=token?'Disconnect GitHub':'Connect GitHub';}
  function connected(){return !!token;}
  function disconnect(){token='';try{sessionStorage.removeItem(sessionKey);}catch(_){}connectionLabel();}
  function connect() {
    if(token)return Promise.resolve(true);
    const dialog=document.getElementById('writer-connect-dialog');
    if(!dialog)return Promise.resolve(false);
    return new Promise(resolve=>{
      const form=document.getElementById('writer-connect-form'),secret=document.getElementById('writer-token'),message=document.getElementById('writer-connect-status');
      let busy=false,success=false;
      const submit=async e=>{
        e.preventDefault();if(busy)return;busy=true;const button=form.querySelector('button[type=submit]');button.disabled=true;message.textContent='Checking your GitHub connection…';
        let candidate=secret.value.trim();secret.value='';
        try {
          const user=await request('/user',{},candidate);
          if(user.login.toLowerCase()!=='qinruojun')throw new Error('Connect as Qinruojun, the owner of this blog.');
          await request('/repos/'+repo,{},candidate);
          token=candidate;candidate='';
          try {if(document.getElementById('writer-remember').checked)sessionStorage.setItem(sessionKey,token);else sessionStorage.removeItem(sessionKey);}catch(_){}
          success=true;connectionLabel();dialog.close();
        }catch(error){message.textContent=error.message;}finally{candidate='';busy=false;button.disabled=false;}
      };
      form.addEventListener('submit',submit);
      dialog.addEventListener('close',()=>{secret.value='';form.removeEventListener('submit',submit);resolve(success);},{once:true});
      message.textContent='';dialog.showModal();secret.focus();
    });
  }
  window.BlogStore={read,write,parse,encode,decode,validId,folder,draftKey,getDraft,saveDraft,drafts,active,migrate,readerURL,editorURL,connect,connected,disconnect,connectionLabel};

  // Read committed Markdown directly, so publication is visible before Pages rebuilds.
  async function refreshList() {
    const type=location.pathname==='/papers/'?'paper':'blog';
    let listing=document.querySelector('.blog-card-list');
    if(!listing){listing=document.createElement('div');listing.className='blog-card-list';document.querySelector('.archive')?.append(listing);}
    if(!listing)return;
    try {
      const files=await request('/repos/'+repo+'/contents/'+folder(type)+'?ref=main');
      const docs=await Promise.all(files.filter(f=>f.type==='file'&&f.name.endsWith('.md')&&validId(f.name.slice(0,-3))).map(async f=>{
        const cacheKey='ruojun-public-'+f.sha;
        try{const cached=JSON.parse(sessionStorage.getItem(cacheKey)||'null');if(cached)return cached;}catch(_){}
        const doc=await read(type,f.name.slice(0,-3));try{sessionStorage.setItem(cacheKey,JSON.stringify(doc));}catch(_){}return doc;
      }));
      const visible=docs.filter(d=>d.published).sort((a,b)=>b.date.localeCompare(a.date));
      if(!visible.length)return;
      const fragment=document.createDocumentFragment();
      const covers=new Map(Array.from(listing.querySelectorAll('.blog-card__cover-link')).map(a=>[a.getAttribute('href'),a]));
      for(const d of visible){
        const article=document.createElement('article');article.className='blog-card';article.dataset.searchText=[d.title,d.summary,d.tags].join(' ').toLowerCase();
        const prior=covers.get('/'+(type==='paper'?'papers':'blog')+'/'+d.slug+'/');
        if(prior){const cover=prior.cloneNode(true);cover.href=readerURL(type,d.slug);article.append(cover);}
        else if(d.cover&&/^(https?:\/\/|\/(?!\/))/.test(d.cover)){const cover=document.createElement('a');cover.className='blog-card__cover-link';cover.href=readerURL(type,d.slug);const image=document.createElement('img');image.className='blog-card__cover';image.src=d.cover;image.alt=d.title;cover.append(image);article.append(cover);}
        const content=document.createElement('div');content.className='blog-card__content';article.append(content);
        const meta=document.createElement('div');meta.className='blog-card__meta-row';meta.textContent=d.date+' · '+(type==='paper'?'Paper Discussion':'Technical Notes');content.append(meta);
        const heading=document.createElement('h2');heading.className='blog-card__title';const link=document.createElement('a');link.href=readerURL(type,d.slug);link.textContent=d.title;heading.append(link);content.append(heading);
        const tags=document.createElement('div');tags.className='blog-card__taxonomies';d.tags.split(',').map(x=>x.trim()).filter(Boolean).forEach(tag=>{const span=document.createElement('span');span.className='blog-card__chip blog-card__chip--tag';span.textContent='#'+tag;tags.append(span);});content.append(tags);
        const excerpt=document.createElement('p');excerpt.className='blog-card__excerpt';excerpt.textContent=d.summary;content.append(excerpt);
        const more=document.createElement('a');more.className='blog-card__link';more.href=link.href;more.textContent='Read more';content.append(more);fragment.append(article);
      }
      listing.replaceChildren(fragment);
      document.querySelectorAll('.blog-empty-state:not([data-no-results])').forEach(e=>e.hidden=true);
      document.querySelector('[data-search]')?.dispatchEvent(new Event('input'));
      const count=document.querySelector('[data-result-count]');if(count&&!document.querySelector('[data-search]')?.value)count.textContent=visible.length+' posts total';
    }catch(_){/* Keep the statically generated public list available on network errors. */}
  }
  async function showArticle() {
    const container=document.getElementById('published-reader');if(!container)return;
    const params=new URLSearchParams(location.search),type=params.get('type')==='paper'?'paper':'blog',id=params.get('post');
    try {
      const doc=await read(type,id);if(!doc.published)throw new Error('This article is not published.');
      document.querySelector('.page__title').textContent=doc.title;document.title=doc.title+' · Ruojun Qin';
      const meta=document.getElementById('published-meta');meta.textContent=doc.date+' · Ruojun Qin';
      const edit=document.getElementById('published-edit');edit.href=editorURL(type,id);edit.hidden=false;
      const back=document.getElementById('published-back');back.href=type==='paper'?'/papers/':'/blog/';
      await Vditor.preview(container,doc.body,{cdn:'https://cdn.jsdelivr.net/npm/vditor@4.0.0',mode:'light',math:{engine:'KaTeX'},markdown:{sanitize:true},hljs:{enable:true,style:'github'}});
    }catch(error){container.textContent=error.message;}
  }
  if(location.pathname==='/blog/'||location.pathname==='/papers/')refreshList();
  if(location.pathname==='/read/')showArticle();
})();
