(()=>{
  const typeMap={knowledge:'knowledge',problem:'problem',solution:'solution',training:'training',digital:'digital',case:'case'};
  const pathMap={knowledge:'knowledge',problem:'problems',solution:'solutions',training:'training',digital:'digital',case:'case-studies'};
  let client=null;
  function sb(){
    if(client)return client;
    const cfg=window.PORTFOLIO_CONFIG;
    if(!cfg?.supabaseUrl||!cfg?.supabaseKey||!window.supabase)return null;
    client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    return client;
  }
  async function rpc(name,args={}){
    const c=sb();if(!c)throw new Error('HSE data service is unavailable.');
    const {data,error}=await c.rpc(name,args);
    if(error)throw error;
    return data;
  }
  function cleanType(type=''){const t=String(type).toLowerCase().trim();return typeMap[t]||t||null}
  function pathFor(item){
    const type=cleanType(item?.type);
    const base=pathMap[type]||'knowledge';
    return '/hse/'+base+'/'+encodeURIComponent(item?.slug||'');
  }
  async function list(type=null,opts={}){
    return rpc('hse_public_list_content',{
      p_type:type?cleanType(type):null,
      p_featured_only:!!opts.featuredOnly,
      p_home_only:!!opts.homeOnly,
      p_limit:Math.min(Math.max(Number(opts.limit)||50,1),100),
      p_offset:Math.max(Number(opts.offset)||0,0),
      p_search:opts.search||null,
      p_category_slug:opts.category||null
    });
  }
  async function get(slug,type=null){return rpc('hse_public_get_content',{p_slug:slug,p_type:type?cleanType(type):null})}
  async function taxonomy(){return rpc('hse_public_taxonomy',{})}
  async function createHandoff(slug,type,locale,payload){
    return rpc('hse_guided_review_create_handoff',{
      p_source_slug:slug,p_source_type:cleanType(type),p_locale:locale==='ar'?'ar':'en',p_payload:payload||{}
    });
  }
  async function readHandoff(id,token){return rpc('hse_guided_review_get_handoff',{p_handoff_id:id,p_client_token:token})}
  window.HSE_DATA={list,get,taxonomy,createHandoff,readHandoff,pathFor,cleanType};
})();