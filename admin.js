(()=>{
  const canonical='andrew-tharwat-portfolio.vercel.app';
  if(location.hostname.endsWith('.vercel.app') && location.hostname!==canonical){
    location.replace(`https://${canonical}${location.pathname}${location.search}${location.hash}`);
    return;
  }
  const load=(src,next)=>{const s=document.createElement('script');s.src=src;s.defer=true;s.onload=()=>next&&next();document.head.appendChild(s)};
  load('/admin/admin.js?v=6',()=>load('/admin/ai-project-assist.js?v=2',()=>load('/admin/page-access-control.js?v=1')));
})();
