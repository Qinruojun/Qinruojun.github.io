(function () {
  'use strict';
  const home=document.querySelector('.research-home');
  const nav=document.getElementById('site-nav');
  if(!home||!nav)return;
  const links=[...nav.querySelectorAll('a[href]')];
  function targetFor(hash) {
    let id;try{id=decodeURIComponent(hash.slice(1));}catch(_){return null;}
    const target=id?document.getElementById(id):null;
    return target&&target.parentElement===home?target:null;
  }
  function alignTarget(smooth) {
    const target=targetFor(location.hash);
    links.forEach(link=>{
      const url=new URL(link.href);
      if(url.hash&&url.pathname===location.pathname){
        if(target&&url.hash===location.hash)link.setAttribute('aria-current','location');
        else link.removeAttribute('aria-current');
      }
    });
    home.style.paddingBottom='0px';
    if(!target)return;
    const masthead=document.querySelector('.masthead');
    const offset=(masthead?masthead.getBoundingClientRect().height:70)+24;
    const top=Math.max(0,target.getBoundingClientRect().top+window.scrollY-offset);
    // Short pages need enough space below the target for native anchor positioning.
    const maxScroll=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
    home.style.paddingBottom=Math.max(0,Math.ceil(top-maxScroll)+2)+'px';
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({top:top,behavior:smooth&&!reduce?'smooth':'instant'});
  }
  nav.addEventListener('click',event=>{
    const link=event.target.closest('a');
    if(!link||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const url=new URL(link.href);
    if(url.origin!==location.origin||url.pathname!==location.pathname)return;
    const target=targetFor(url.hash);if(!target)return;
    event.preventDefault();
    if(location.hash!==url.hash)history.pushState(null,'',url.pathname+url.search+url.hash);
    target.setAttribute('tabindex','-1');target.focus({preventScroll:true});
    alignTarget(true);
  });
  window.addEventListener('hashchange',()=>alignTarget(false));
  window.addEventListener('resize',()=>alignTarget(false));
  window.addEventListener('load',()=>alignTarget(false),{once:true});
  alignTarget(false);
})();
