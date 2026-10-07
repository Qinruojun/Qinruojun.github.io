function initBlog() {
 const field=document.querySelector('[data-search]');
 if(!field||field.dataset.searchBound)return;
 field.dataset.searchBound='true';
 const count=document.querySelector('[data-result-count]');
 const empty=document.querySelector('[data-no-results]');
 const clear=document.querySelector('[data-clear]');
 function update(){
  const cards=[...document.querySelectorAll('[data-search-text]')];
  const terms=field.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  let visible=0;
  for(const card of cards){card.hidden=!terms.every(term=>card.dataset.searchText.includes(term));if(!card.hidden)visible++;}
  count.textContent=terms.length?visible+' matching '+(visible===1?'post':'posts'):cards.length+' '+(cards.length===1?'post':'posts')+' total';
  empty.hidden=visible!==0;
 }
 field.addEventListener('input',update);
 clear.addEventListener('click',()=>{field.value='';update();field.focus();});
 update();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initBlog);else initBlog();
