(() => {
  function install(){
    const mediaPanel=document.querySelector('.tab-panel[data-panel="media"] .panel-card');
    if(!mediaPanel||document.getElementById('media-publish-guide')) return;
    const guide=document.createElement('div');
    guide.id='media-publish-guide';
    guide.innerHTML=`<div><span>HOW MEDIA WORKS</span><strong>Media Library = your private asset bank for the website.</strong><p>Uploading here does <b>not</b> publish the file automatically. To make media visible on the website, attach it to a project as a <b>Cover</b> or <b>Project Gallery</b>. That keeps unfinished uploads from appearing publicly by mistake.</p></div><button type="button" id="media-go-projects">GO TO PROJECTS →</button>`;
    guide.style.cssText='display:flex;justify-content:space-between;gap:24px;align-items:center;margin:18px 0;padding:18px 20px;border:1px solid #dce5eb;border-radius:14px;background:#f8fbfd;color:#173246';
    const s=guide.querySelector('span');s.style.cssText='display:block;color:#e10613;font:800 8px Montserrat,sans-serif;letter-spacing:1.5px;margin-bottom:6px';
    const st=guide.querySelector('strong');st.style.cssText='display:block;font:800 12px Montserrat,sans-serif;margin-bottom:5px';
    const p=guide.querySelector('p');p.style.cssText='margin:0;max-width:760px;color:#687d8a;font:500 9px/1.65 Montserrat,sans-serif';
    const b=guide.querySelector('button');b.className='secondary';b.style.whiteSpace='nowrap';
    mediaPanel.insertBefore(guide,mediaPanel.children[1]||null);
    b.addEventListener('click',()=>document.querySelector('#admin-nav [data-tab="projects"]')?.click());
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  setTimeout(install,700);
})();