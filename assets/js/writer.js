(function () {
  'use strict';
  const form = document.getElementById('post-writer');
  if (!form) return;
  const field = name => document.getElementById('writer-' + name);
  const status = field('status');
  const kind = field('type');
  const settings = field('settings');
  const rich = field('rich');
  const publishDialog = field('publish-dialog');
  const imageDialog = field('image-dialog');
  const fields = ['date','title','summary','tags','slug','paper-title','paper-url','code-url','cover','math','body'];
  const cdn = 'https://cdn.jsdelivr.net/npm/vditor@4.0.0';
  let editor = null;
  let editorReady = false;
  let loading = false;
  let activeType = new URLSearchParams(location.search).get('type') === 'paper' ? 'paper' : 'blog';
  // Only remove untouched outlines left by older versions, never written content.
  const legacyOutlines = [
    ['The question','My understanding','Evidence','Limitations and open questions','References'],
    ['In one sentence','Problem and method','Evidence in the paper','My insights','Questions and limitations'],
    ['In one sentence','Problem and method','Evidence in the paper','My insights','Questions and limitations','What I would test next']
  ].map(headings=>headings.map(heading=>'## '+heading).join('\n'));
  function isUnusedOutline(body) {
    return legacyOutlines.includes(body.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).join('\n'));
  }
  function key(type) { return 'ruojun-writing-draft-v1-' + type; }
  function today() { const d=new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); }
  function grow(el) { el.style.height='auto'; el.style.height=el.scrollHeight+'px'; }
  function syncBody() { if (editorReady && !loading) field('body').value=editor.getValue(); }
  function collect() {
    const result={};
    fields.forEach(name=>{const el=field(name);result[name]=el.type==='checkbox'?el.checked:el.value;});
    return result;
  }
  function updateCount() {
    const words=field('body').value.trim().match(/[\p{L}\p{N}]+/gu)||[];
    field('count').textContent=words.length+' '+(words.length===1?'word':'words');
  }
  function save() {
    if (loading) return;
    updateCount();
    try { localStorage.setItem(key(activeType),JSON.stringify(collect())); status.textContent='Draft saved in this browser'; }
    catch (_) { status.textContent='Draft could not be saved. Download a copy to keep your writing.'; }
  }
  function load(type) {
    loading=true;
    let saved=null;
    try { saved=JSON.parse(localStorage.getItem(key(type))||'null'); } catch (_) {}
    form.reset(); kind.value=type;
    if (saved && typeof saved==='object') fields.forEach(name=>{const el=field(name);if(el.type==='checkbox')el.checked=saved[name]===true;else if(typeof saved[name]==='string')el.value=saved[name];});
    if(!field('date').value)field('date').value=today();
    if(!field('slug').value)field('slug').value=(type==='paper'?'paper-':'post-')+Date.now().toString(36);
    const removedOutline=isUnusedOutline(field('body').value);
    if(!saved||removedOutline)field('body').value='';
    document.getElementById('paper-fields').hidden=type!=='paper';
    field('paper-title').required=type==='paper';field('paper-url').required=type==='paper';
    field('kind-label').textContent=type==='paper'?'Research paper discussion':'Blog post';
    if(editorReady)editor.setValue(field('body').value,true);
    grow(field('title'));grow(field('summary'));updateCount();
    loading=false;
    status.textContent=saved?'Saved draft restored':'Your draft stays in this browser';
    if(removedOutline)save();
  }
  function hasMath(body) {
    const prose=body.replace(/```[\s\S]*?```/g,'').replace(/`[^`]*`/g,'');
    return /\$\$[\s\S]+?\$\$|(?:^|[^\\])\$[^$\n]+\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\]/.test(prose);
  }
  function markdown() {
    syncBody();
    const v=collect();
    const lines=['---','title: '+JSON.stringify(v.title.trim()),'date: '+JSON.stringify(v.date),'summary: '+JSON.stringify(v.summary.trim()),'tags: '+JSON.stringify(v.tags.split(',').map(s=>s.trim()).filter(Boolean))];
    if(v.cover.trim())lines.push('cover: '+JSON.stringify(v.cover.trim()));
    if(activeType==='paper')lines.push('paper_title: '+JSON.stringify(v['paper-title'].trim()),'paper_url: '+JSON.stringify(v['paper-url'].trim()),'code_url: '+JSON.stringify(v['code-url'].trim()));
    lines.push('published: true','math: '+(v.math||hasMath(v.body)),'---','',v.body.trim(),'');
    return lines.join('\n');
  }
  function filename() { return (activeType==='paper'?'_papers/':'_blog/')+field('slug').value.trim()+'.md'; }
  function githubURL(body) {
    const url=new URL('https://github.com/'+form.dataset.repository+'/new/main');
    url.searchParams.set('filename',filename());
    if(body!==null)url.searchParams.set('value',body);
    return url.href;
  }
  function valid() {
    syncBody();
    if(settings.querySelector(':invalid'))settings.open=true;
    if(!form.reportValidity())return false;
    if(!field('body').value.trim()) {status.textContent='Add some writing before publishing.';if(editorReady)editor.focus();else field('body').focus();return false;}
    return true;
  }
  function preparePublish(e) {
    e.preventDefault();
    if(!valid())return;
    save();
    const md=markdown();const url=githubURL(md);const long=url.length>7000;
    document.getElementById('publish-title').textContent=field('title').value;
    document.getElementById('publish-prefill').hidden=long;
    field('long-post').hidden=!long;
    field('continue').href=long?githubURL(null):url;
    field('export').value=md;
    field('copy-status').textContent='';
    field('export-details').open=false;
    publishDialog.showModal();
  }
  function received(value) {
    if(loading||!editorReady)return;
    field('body').value=value;save();
  }
  function labelEditor() {
    rich.querySelectorAll('[contenteditable="true"],textarea').forEach(el=>{el.setAttribute('role','textbox');el.setAttribute('aria-label','Post content');el.setAttribute('aria-multiline','true');});
  }
  function startEditor() {
    if(typeof Vditor==='undefined') {field('loading').textContent='The live editor could not load. You can still write in Markdown below, or reload to try again.';return;}
    rich.hidden=false;rich.setAttribute('aria-busy','true');
    try {
      editor=new Vditor('writer-rich',{
        cdn:cdn,lang:'en_US',mode:'ir',theme:'classic',height:'auto',minHeight:440,
        value:field('body').value,placeholder:'Start writing. Markdown turns into formatting as you type…',
        cache:{enable:false},counter:{enable:false},toolbarConfig:{pin:false},
        toolbar:['headings','bold','italic','link','|','quote','list','ordered-list','|','code','table',
          {name:'image-link',tip:'Insert image',icon:'<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 4h16v16H4zM4 16l5-5 4 4 3-3 4 4M16 8h.01" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',click:()=>imageDialog.showModal()},
          '|','undo','redo','|','edit-mode','fullscreen'],
        preview:{delay:150,maxWidth:820,theme:{current:'light',path:cdn+'/dist/css/content-theme'},hljs:{enable:true,style:'github'},math:{engine:'KaTeX'},markdown:{sanitize:true,codeBlockPreview:true,mathBlockPreview:true}},
        input:received,blur:received,
        after:function () {
          editorReady=true;loading=true;editor.setValue(field('body').value,true);loading=false;
          rich.hidden=false;rich.removeAttribute('aria-busy');field('body').hidden=true;field('fallback-label').hidden=true;field('loading').hidden=true;
          labelEditor();new MutationObserver(labelEditor).observe(rich,{childList:true,subtree:true});
        }
      });
      setTimeout(()=>{if(!editorReady){rich.hidden=true;field('loading').textContent='The live editor is taking longer to load. Your draft is available below.';}},12000);
    } catch (_) {rich.hidden=true;field('loading').textContent='The live editor could not load. Your draft is available in Markdown below.';}
  }
  kind.addEventListener('change',()=>{syncBody();save();activeType=kind.value;load(activeType);});
  form.addEventListener('input',e=>{
    if(e.target===field('title')||e.target===field('summary'))grow(e.target);
    if(fields.some(name=>field(name)===e.target))save();
  });
  form.addEventListener('submit',preparePublish);
  field('copy').addEventListener('click',async()=>{
    try {await navigator.clipboard.writeText(field('export').value);field('copy-status').textContent='Copied. Your complete Markdown is ready to paste.';}
    catch (_) {field('export-details').open=true;field('export').focus();field('export').select();field('copy-status').textContent='Press Ctrl+C (or ⌘C) to copy the selected Markdown.';}
  });
  field('download').addEventListener('click',()=>{
    syncBody();save();
    const url=URL.createObjectURL(new Blob([markdown()],{type:'text/markdown;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download=filename().split('/').pop();link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    status.textContent='Markdown downloaded. Your draft is still saved.';
  });
  field('new').addEventListener('click',()=>{
    if(!window.confirm('Start a new draft? Download the current draft first if you want to keep it.'))return;
    try {localStorage.removeItem(key(activeType));}catch(_){status.textContent='The draft could not be reset. Download a copy before continuing.';return;}
    load(activeType);save();field('title').focus();
  });
  document.querySelectorAll('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
  field('image-form').addEventListener('submit',e=>{
    e.preventDefault();const url=field('image-url').value.trim();
    if(!/^(https?:\/\/|\/)/i.test(url)){field('image-url').setCustomValidity('Use an https:// URL or a /images/ path.');field('image-url').reportValidity();return;}
    const alt=field('image-alt').value.replace(/[\[\]\\\r\n]/g,' ');
    const encoded=url.replace(/\s/g,c=>encodeURIComponent(c)).replace(/\(/g,'%28').replace(/\)/g,'%29');
    const value='!['+alt+']('+encoded+')\n';
    imageDialog.close();if(editorReady){editor.focus();editor.insertValue(value);syncBody();}else field('body').value+='\n'+value;
    save();field('image-form').reset();
  });
  field('image-url').addEventListener('input',()=>field('image-url').setCustomValidity(''));
  window.addEventListener('pagehide',()=>{syncBody();save();});
  load(activeType);startEditor();
})();
