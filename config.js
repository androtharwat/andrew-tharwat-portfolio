const PORTFOLIO_CONFIG = {
  supabaseUrl: 'https://sivyynuhluhvjcdicwxn.supabase.co',
  supabaseKey: 'sb_publishable_NfXucVBg2vgFJZLMZFod7Q_EyFjgX7G'};

if (typeof window !== 'undefined') {
  window.PORTFOLIO_CONFIG = PORTFOLIO_CONFIG;

  const internalAnalyticsPaths = ['/admin', '/client-access', '/client-v9', '/team-v9'];
  const isInternalRoute = internalAnalyticsPaths.some((path) => (
    window.location.pathname === path || window.location.pathname.startsWith(path + '/')
  ));

  if (!isInternalRoute && !document.querySelector('script[data-vercel-insights]')) {
    const analyticsScript = document.createElement('script');
    analyticsScript.defer = true;
    analyticsScript.src = '/_vercel/insights/script.js';
    analyticsScript.dataset.vercelInsights = 'true';
    document.head.appendChild(analyticsScript);
  }
}
if (typeof module !== 'undefined') module.exports = PORTFOLIO_CONFIG;
