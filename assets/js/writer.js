(function () {
  'use strict';
  const form = document.getElementById('post-writer');
  if (!form) return;
  const status = document.getElementById('writer-status');
  const kind = document.getElementById('writer-type');
  const fields = ['date','title','summary','tags','slug','paper-title','paper-url','code-url','cover','math','body'];
  const field = name => document.getElementById('writer-' + name);
  const today = () => { const d = new Date(); return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-'); };
  const templates = {
    blog: '## The question\n\n\n## My understanding\n\n\n## Evidence\n\n\n## Limitations and open questions\n\n\n## References\n\n',
    paper: '## In one sentence\n\n\n## Problem and method\n\n\n## Evidence in the paper\n\n\n## My insights\n\n\n## Questions and limitations\n\n\n## What I would test next\n\n'
  };
  let activeType = new URLSearchParams(location.search).get('type') === 'paper' ? 'paper' : 'blog';
  function key(type) { return 'ruojun-writing-draft-v1-' + type; }
  function collect() {
    const result = {};
    fields.forEach(name => { const el = field(name); result[name] = el.type === 'checkbox' ? el.checked : el.value; });
    return result;
  }
  function save() {
    try { localStorage.setItem(key(activeType), JSON.stringify(collect())); status.textContent = 'Draft saved in this browser. Nothing has been published.'; }
    catch (_) { status.textContent = 'This browser could not save the draft. Download the Markdown to keep a copy.'; }
  }
  function load(type) {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(key(type)) || 'null'); } catch (_) {}
    form.reset(); kind.value = type;
    if (saved && typeof saved === 'object') fields.forEach(name => { const el=field(name); if (el.type === 'checkbox') el.checked = saved[name] === true; else if (typeof saved[name] === 'string') el.value = saved[name]; });
    if (!field('date').value) field('date').value = today();
    if (!field('slug').value) field('slug').value = (type === 'paper' ? 'paper-' : 'post-') + Date.now().toString(36);
    if (!saved) field('body').value = templates[type];
    document.getElementById('paper-fields').hidden = type !== 'paper';
    field('paper-title').required = type === 'paper'; field('paper-url').required = type === 'paper';
    document.getElementById('writer-long-post').hidden = true;
    status.textContent = saved ? 'Saved draft restored in this browser.' : 'Drafts are saved in this browser.';
  }
  function markdown() {
    const v=collect();
    const lines=['---','title: '+JSON.stringify(v.title.trim()),'date: '+JSON.stringify(v.date),'summary: '+JSON.stringify(v.summary.trim()),'tags: '+JSON.stringify(v.tags.split(',').map(s=>s.trim()).filter(Boolean))];
    if (v.cover.trim()) lines.push('cover: '+JSON.stringify(v.cover.trim()));
    if (activeType === 'paper') lines.push('paper_title: '+JSON.stringify(v['paper-title'].trim()),'paper_url: '+JSON.stringify(v['paper-url'].trim()),'code_url: '+JSON.stringify(v['code-url'].trim()));
    lines.push('published: true','math: '+v.math,'---','',v.body.trim(),'');
    return lines.join('\n');
  }
  function filename() { return (activeType === 'paper' ? '_papers/' : '_blog/') + field('slug').value.trim() + '.md'; }
  function githubURL(withBody) {
    const url=new URL('https://github.com/' + form.dataset.repository + '/new/main');
    url.searchParams.set('filename',filename());
    if (withBody) url.searchParams.set('value',markdown());
    return url.href;
  }
  kind.addEventListener('change', function () { save(); activeType=kind.value; load(activeType); });
  form.addEventListener('input', function (e) { if(e.target !== kind) save(); });
  form.addEventListener('submit', function (e) {
    e.preventDefault(); if (!form.reportValidity()) return;
    save(); const url=githubURL(true);
    if(url.length > 7000) {
      document.getElementById('writer-long-post').hidden=false;
      document.getElementById('writer-open-empty').href=githubURL(false);
      document.getElementById('writer-export').value=markdown();
      status.textContent='Copy the Markdown below before opening GitHub. Your complete post is preserved.';
      return;
    }
    const link=document.createElement('a'); link.href=url; link.target='_blank'; link.rel='noopener noreferrer'; link.click();
    status.textContent='Opening GitHub with your post. Preview it, then commit when you are ready to publish.';
  });
  document.getElementById('writer-copy').addEventListener('click',async function () {
    try { await navigator.clipboard.writeText(markdown()); status.textContent='Markdown copied. You can paste it into GitHub or your editor.'; }
    catch (_) { document.getElementById('writer-long-post').hidden=false; document.getElementById('writer-open-empty').href=githubURL(false); document.getElementById('writer-export').value=markdown(); field('export').focus(); field('export').select(); status.textContent='Select and copy the Markdown below, or download the file.'; }
  });
  document.getElementById('writer-download').addEventListener('click', function () {
    if(!form.reportValidity()) return;
    const url=URL.createObjectURL(new Blob([markdown()],{type:'text/markdown;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download=filename().split('/').pop();link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    status.textContent='Markdown downloaded. Your browser draft is still saved.';
  });
  document.getElementById('writer-new').addEventListener('click', function () {
    if (!window.confirm('Start a new draft? Download or copy the current draft first if you want to keep it.')) return;
    try { localStorage.removeItem(key(activeType)); } catch (_) {}
    load(activeType); save();
  });
  load(activeType);
})();
