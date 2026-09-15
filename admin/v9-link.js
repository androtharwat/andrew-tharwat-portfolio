(() => {
  const add=()=>{
    const nav=document.getElementById('admin-nav');
    if(!nav||document.getElementById('v9-control-link'))return;
    const wrap=document.createElement('a');
    wrap.id='v9-control-link';
    wrap.href='/admin/v9.html';
    wrap.innerHTML='✦ <span>Studio V9</span>';
    wrap.style.cssText='height:44px;border:1px solid rgba(239,35,60,.28);border-radius:11px;background:rgba(239,35,60,.08);color:#fff;text-align:left;padding:0 12px;font:800 12px Montserrat,Arial,sans-serif;display:flex;align-items:center;gap:9px;text-decoration:none;margin-top:7px';
    nav.appendChild(wrap);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else add();
})();