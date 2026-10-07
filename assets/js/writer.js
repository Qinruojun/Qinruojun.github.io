(function () {
  'use strict';
  const form = document.getElementById('post-writer');
  if (!form) return;
  const field = name => document.getElementById('writer-' + name);
  const status = field('status');
  const kind = field('type');
  const settings = field('settings');
  const rich = field('rich');
  const store=window.BlogStore;
  let currentId='',remoteSha=null,published=false,draftDirty=false,publishing=false;
  const imageDialog = field('image-dialog');
  const formulaDialog = field('formula-dialog');
  let formulaSelection = null;
  const fields = ['date','title','summary','tags','slug','paper-title','paper-url','code-url','cover','math','body'];
  const cdn = 'https://cdn.jsdelivr.net/npm/vditor@4.0.0';
  let editor = null;
  let editorReady = false;
  let loading = false;
  let activeType = new URLSearchParams(location.search).get('type') === 'paper' ? 'paper' : 'blog';
  // A monotonic clock capped at the last interaction + 60 seconds. Delayed
  // timers (background tabs or a sleeping laptop) cannot add hours of idle time.
  class EditingClock {
    constructor(now=()=>performance.now()) {this.now=now;this.reset(0);}
    reset(total=0) {this.total=Number.isFinite(total)&&total>0?total:0;this.last=this.now();this.activity=null;}
    settle() {
      const now=this.now();
      if(this.activity!==null)this.total+=Math.max(0,Math.min(now,this.activity+60000)-this.last);
      this.last=now;return this.total;
    }
    touch() {this.settle();this.activity=this.now();this.last=this.activity;}
    pause() {this.settle();this.activity=null;}
    active() {return this.activity!==null&&this.now()<this.activity+60000;}
  }
  const editingClock=new EditingClock();
  function showEditingTime() {
    const seconds=Math.floor(editingClock.settle()/1000);
    const parts=[Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60];
    field('time').textContent='Edited '+parts.map(n=>String(n).padStart(2,'0')).join(':')+' · '+(editingClock.active()?'Active':'Paused');
  }
  function editingActivity(e) {
    if(loading||document.hidden||!document.hasFocus())return;
    if(e.type==='keydown'&&(e.metaKey||e.ctrlKey||e.altKey||['Shift','Control','Alt','Meta','Tab','Escape'].includes(e.key)))return;
    if(!e.target.closest('textarea,input,[contenteditable="true"],.vditor-toolbar'))return;
    if(e.type==='input')draftDirty=true;
    editingClock.touch();showEditingTime();
  }
  // Only remove untouched outlines left by older versions, never written content.
  const legacyOutlines = [
    ['The question','My understanding','Evidence','Limitations and open questions','References'],
    ['In one sentence','Problem and method','Evidence in the paper','My insights','Questions and limitations'],
    ['In one sentence','Problem and method','Evidence in the paper','My insights','Questions and limitations','What I would test next']
  ].map(headings=>headings.map(heading=>'## '+heading).join('\n'));
  function isUnusedOutline(body) {
    return legacyOutlines.includes(body.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).join('\n'));
  }
  function key(type) { return store.draftKey(type,currentId); }
  function freshId(){return 'post-'+crypto.randomUUID();}
  function today() { const d=new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); }
  function grow(el) { el.style.height='auto'; el.style.height=el.scrollHeight+'px'; }
  function syncBody() { if (editorReady && !loading) field('body').value=editor.getValue(); }
  function collect() {
    const result={};
    fields.forEach(name=>{const el=field(name);result[name]=el.type==='checkbox'?el.checked:el.value;});
    result.editingMs=Math.floor(editingClock.settle());
    Object.assign(result,{slug:currentId,remoteSha,published,dirty:draftDirty,savedAt:Date.now()});
    return result;
  }
  function updateCount() {
    const words=field('body').value.trim().match(/[\p{L}\p{N}]+/gu)||[];
    field('count').textContent=words.length+' '+(words.length===1?'word':'words');
  }
  function save() {
    if (loading) return;
    updateCount();
    try { store.saveDraft(activeType,currentId,collect()); status.textContent=published?'Changes saved on this device':'Draft saved on this device'; }
    catch (_) { status.textContent='Draft could not be saved. Download a copy to keep your writing.'; }
  }
  function refreshDrafts() {
    const select=field('drafts');select.replaceChildren();
    for(const draft of store.drafts(activeType)){
      const option=document.createElement('option');option.value=draft.slug;option.textContent=(draft.title||'Untitled')+(draft.published?' · Published':' · Draft');select.append(option);
    }
    select.value=currentId;
  }
  function applyDraft(type,id,saved) {
    loading=true;editingClock.pause();currentId=id;activeType=type;
    form.reset();kind.value=type;
    if(saved)fields.forEach(name=>{const el=field(name);if(el.type==='checkbox')el.checked=saved[name]===true;else if(typeof saved[name]==='string')el.value=saved[name];});
    editingClock.reset(saved&&saved.editingMs);showEditingTime();
    remoteSha=saved&&saved.remoteSha||null;published=!!remoteSha;draftDirty=!!(saved&&saved.dirty);
    if(!field('date').value)field('date').value=today();
    field('slug').value=id;field('slug').readOnly=true;
    if(!saved||isUnusedOutline(field('body').value))field('body').value='';
    document.getElementById('paper-fields').hidden=type!=='paper';
    field('paper-title').required=type==='paper';field('paper-url').required=type==='paper';
    field('kind-label').textContent=type==='paper'?'Research paper discussion':'Blog post';
    field('publish').textContent=published?'Publish changes':'Publish';
    field('view').hidden=!published;if(published)field('view').href=store.readerURL(type,id);
    if(editorReady)editor.setValue(field('body').value,true);
    grow(field('title'));grow(field('summary'));updateCount();loading=false;
    save();refreshDrafts();store.connectionLabel();
    history.replaceState(null,'',store.editorURL(type,id));
  }
  async function load(type,id) {
    loading=true;form.inert=true;field('publish').disabled=true;
    const legacy=store.migrate(type);
    id=id||store.active(type)||(legacy&&legacy.slug);
    if(!id){applyDraft(type,freshId(),null);field('publish').disabled=false;form.inert=false;return;}
    if(!store.validId(id)){status.textContent='Invalid article URL.';form.inert=false;return;}
    const local=store.getDraft(type,id);
    try {
      const remote=await store.read(type,id);
      const value=local&&(local.dirty||!local.remoteSha)?{...local,remoteSha:local.remoteSha||remote.remoteSha}:remote;
      value.editingMs=Math.max(local&&local.editingMs||0,remote.editingMs);
      applyDraft(type,id,value);
      status.textContent=local?.remoteSha&&local.dirty&&local.remoteSha!==remote.remoteSha?'The published article changed elsewhere. Your local draft is preserved; publishing will not overwrite that newer version.':'Article opened · editing time restored';
    }catch(error){
      if(error.status===404){applyDraft(type,id,local);}
      else if(local){applyDraft(type,id,local);status.textContent='Offline draft restored. '+error.message;}
      else {loading=false;status.textContent=error.message;return;}
    }finally{field('publish').disabled=false;form.inert=false;}
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
    lines.push('published: true','math: '+(v.math||hasMath(v.body)),'editing_time_seconds: '+Math.floor(v.editingMs/1000),'---','',v.body.trim(),'');
    return lines.join('\n');
  }
  function filename() { return (activeType==='paper'?'_papers/':'_blog/')+field('slug').value.trim()+'.md'; }
  function valid() {
    syncBody();
    if(settings.querySelector(':invalid'))settings.open=true;
    if(!form.reportValidity())return false;
    if(!field('body').value.trim()) {status.textContent='Add some writing before publishing.';if(editorReady)editor.focus();else field('body').focus();return false;}
    return true;
  }
  async function preparePublish(e) {
    e.preventDefault();if(publishing||loading||!valid())return;
    save();
    if(!store.connected()&&!await store.connect())return;
    publishing=true;field('publish').disabled=true;kind.disabled=true;field('new').disabled=true;field('drafts').disabled=true;
    // Save a stable snapshot; input remains available if the network is slow.
    const id=currentId,type=activeType,md=markdown();
    status.textContent='Publishing…';field('publish-status').textContent='';
    try {
      const result=await store.write(type,id,md,remoteSha);
      remoteSha=result.content.sha;published=true;draftDirty=markdown().replace(/^editing_time_seconds:.*$/m,'')!==md.replace(/^editing_time_seconds:.*$/m,'');
      save();refreshDrafts();field('publish').textContent='Publish changes';
      status.textContent=draftDirty?'Published. Newer edits are saved locally; publish again to include them.':'Published successfully.';
      const link=field('view');link.href=store.readerURL(type,id);link.hidden=false;
      if(!draftDirty)location.assign(type==='paper'?'/papers/':'/blog/');
    }catch(error){status.textContent=error.message;field('publish-status').textContent=error.message;}
    finally{publishing=false;field('publish').disabled=false;kind.disabled=false;field('new').disabled=false;field('drafts').disabled=false;}
  }
  function received(value) {
    if(loading||!editorReady)return;
    if(field('body').value!==value)draftDirty=true;
    field('body').value=value;save();
  }
  function labelEditor() {
    rich.querySelectorAll('[contenteditable="true"],textarea').forEach(el=>{el.setAttribute('role','textbox');el.setAttribute('aria-label','Post content');el.setAttribute('aria-multiline','true');});
  }
  function openFormula() {
    const selection=window.getSelection();
    formulaSelection=selection.rangeCount&&rich.contains(selection.anchorNode)?selection.getRangeAt(0).cloneRange():null;
    formulaDialog.showModal();field('formula-source').focus();
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
          {name:'formula',tip:'Insert formula',icon:'<span aria-hidden="true" style="font:italic 700 18px Georgia,serif">∑</span>',click:openFormula},
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
  kind.addEventListener('change',()=>{const type=kind.value;syncBody();save();load(type);});
  field('drafts').addEventListener('change',()=>{const id=field('drafts').value;syncBody();save();load(activeType,id);});
  field('connect').addEventListener('click',()=>{if(store.connected())store.disconnect();else store.connect();});
  form.addEventListener('input',e=>{
    if(e.target===field('title')||e.target===field('summary'))grow(e.target);
    if(fields.some(name=>field(name)===e.target)){draftDirty=true;save();}
  });
  form.addEventListener('submit',preparePublish);
  field('download').addEventListener('click',()=>{
    syncBody();save();
    const url=URL.createObjectURL(new Blob([markdown()],{type:'text/markdown;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download=filename().split('/').pop();link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    status.textContent='Markdown downloaded. Your draft is still saved.';
  });
  field('new').addEventListener('click',()=>{
    syncBody();save();applyDraft(activeType,freshId(),null);field('title').focus();
  });
  document.querySelectorAll('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
  field('image-form').addEventListener('submit',e=>{
    e.preventDefault();const url=field('image-url').value.trim();
    if(!/^(https?:\/\/|\/)/i.test(url)){field('image-url').setCustomValidity('Use an https:// URL or a /images/ path.');field('image-url').reportValidity();return;}
    const alt=field('image-alt').value.replace(/[\[\]\\\r\n]/g,' ');
    const encoded=url.replace(/\s/g,c=>encodeURIComponent(c)).replace(/\(/g,'%28').replace(/\)/g,'%29');
    const value='!['+alt+']('+encoded+')\n';
    imageDialog.close();if(editorReady){editor.focus();editor.insertValue(value);syncBody();}else field('body').value+='\n'+value;
    draftDirty=true;save();field('image-form').reset();
  });
  field('image-url').addEventListener('input',()=>field('image-url').setCustomValidity(''));
  field('formula-form').addEventListener('submit',e=>{
    e.preventDefault();
    const source=field('formula-source');
    // Accept pasted delimiters too, without inserting duplicate dollar signs.
    let latex=source.value.trim().replace(/^\$\$([\s\S]*)\$\$$/,'$1').replace(/^\$([^$]*)\$$/,'$1').trim();
    if(!latex){source.setCustomValidity('Enter a formula first.');source.reportValidity();return;}
    const display=field('formula-placement').value==='display';
    const value=display?'\n\n$$\n'+latex+'\n$$\n\n':'$'+latex.replace(/\r?\n/g,' ')+'$ ';
    formulaDialog.close();editor.focus();
    if(formulaSelection&&rich.contains(formulaSelection.startContainer)){
      const selection=window.getSelection();selection.removeAllRanges();selection.addRange(formulaSelection);
    }
    editor.insertValue(value);field('math').checked=true;draftDirty=true;syncBody();save();
    field('formula-form').reset();formulaSelection=null;
  });
  field('formula-source').addEventListener('input',()=>field('formula-source').setCustomValidity(''));
  [form,field('formula-form'),field('image-form')].forEach(surface=>{
    ['keydown','input','pointerdown'].forEach(event=>surface.addEventListener(event,editingActivity,true));
  });
  function pauseEditing() {editingClock.pause();showEditingTime();if(!loading){syncBody();save();}}
  window.addEventListener('blur',pauseEditing);
  window.addEventListener('pagehide',pauseEditing);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseEditing();});
  // Save only the time field during heartbeats, preserving the stored draft text.
  let lastTimeSave=0;
  setInterval(()=>{
    if(document.hidden||!document.hasFocus())editingClock.pause();
    showEditingTime();
    const total=Math.floor(editingClock.total);
    if(total===lastTimeSave||loading)return;
    try {
      const saved=JSON.parse(localStorage.getItem(key(activeType))||'null');
      if(saved&&saved.slug===currentId){saved.editingMs=total;localStorage.setItem(key(activeType),JSON.stringify(saved));lastTimeSave=total;}
    }catch(_){status.textContent='Draft could not be saved. Download a copy to keep your writing.';}
  },1000);
  load(activeType,new URLSearchParams(location.search).get('post')).then(startEditor);
})();
