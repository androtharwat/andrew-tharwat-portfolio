const SUPABASE_URL=process.env.SUPABASE_URL||'https://sivyynuhluhvjcdicwxn.supabase.co';
const SUPABASE_KEY=process.env.SUPABASE_ANON_KEY||'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6InNpdnl5bnVobHVodmpjZGljd3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMTE3OTEsImV4cCI6MjEwNDY4Nzc5MX0.qhAhuxnfAGZTtnkDkiynZIqKd_mEVsLiu65mdmJXTGU';
const SITE='https://andrew-tharwat-portfolio.vercel.app';

const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeText=(v='')=>String(v||'').replace(/\s+/g,' ').trim().slice(0,260);

async function rest(path){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
  if(!r.ok)throw new Error(`Supabase ${r.status}`);
  return r.json();
}

module.exports=async(req,res)=>{
  try{
    const mediaId=String(req.query.media||'').trim();
    if(!/^[0-9a-f-]{36}$/i.test(mediaId)){res.status(404).send('Not found');return;}
    const mediaRows=await rest(`portfolio_project_media?id=eq.${encodeURIComponent(mediaId)}&select=id,url,media_type,title,title_ar,brief,brief_ar,alt_text,project_id&limit=1`);
    const media=mediaRows?.[0];if(!media){res.status(404).send('Not found');return;}
    const projectRows=await rest(`portfolio_projects?id=eq.${encodeURIComponent(media.project_id)}&status=eq.published&page_enabled=eq.true&select=slug,title,title_ar,excerpt,excerpt_ar,cover_url&limit=1`);
    const project=projectRows?.[0];if(!project){res.status(404).send('Not found');return;}

    const title=safeText(media.title||media.title_ar||project.title||project.title_ar||'Andrew Tharwat Portfolio');
    const description=safeText(media.brief||media.brief_ar||project.excerpt||project.excerpt_ar||'HSE awareness content by Andrew Tharwat.');
    const target=`${SITE}/projects/${encodeURIComponent(project.slug)}#media-${media.id}`;
    const shareUrl=`${SITE}/api/share?media=${encodeURIComponent(media.id)}`;
    const image=(media.media_type==='image'&&/^https:\/\//i.test(media.url||''))?media.url:(project.cover_url||`${SITE}/assets/app-icon-official.png`);
    const video=media.media_type==='video'&&/^https:\/\//i.test(media.url||'')?media.url:'';
    const videoTags=video?`\n<meta property="og:type" content="video.other">\n<meta property="og:video" content="${esc(video)}">\n<meta property="og:video:url" content="${esc(video)}">\n<meta property="og:video:secure_url" content="${esc(video)}">\n<meta property="og:video:type" content="video/mp4">`: '\n<meta property="og:type" content="website">';

    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=3600');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.status(200).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="noindex,follow"><link rel="canonical" href="${esc(shareUrl)}"><meta property="og:site_name" content="Andrew Tharwat Portfolio"><meta property="og:url" content="${esc(shareUrl)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:image" content="${esc(image)}"><meta property="og:image:secure_url" content="${esc(image)}">${videoTags}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${esc(image)}"><meta http-equiv="refresh" content="0;url=${esc(target)}"><style>body{margin:0;background:#06131e;color:#fff;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh}a{color:#fff}</style></head><body><p>Opening <a href="${esc(target)}">${esc(title)}</a>…</p><script>location.replace(${JSON.stringify(target)})</script></body></html>`);
  }catch(err){
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.status(500).send('<!doctype html><html><body style="font-family:Arial;padding:30px">Share preview is temporarily unavailable. <a href="/">Open Andrew Tharwat Portfolio</a></body></html>');
  }
};