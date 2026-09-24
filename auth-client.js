(() => {
  let client;
  window.ATS_AUTH_CLIENT = Object.freeze({
    getClient() {
      if (client) return client;
      const cfg = window.PORTFOLIO_CONFIG;
      if (!cfg?.supabaseUrl || !cfg?.supabaseKey || !window.supabase) {
        throw new Error('Portal configuration could not be loaded. Please reload and try again.');
      }
      client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      return client;
    },
    lookupMessage(error) {
      if (error?.code === 'P0002') return 'No Studio request is linked to this verified email yet. Please contact Andrew Tharwat Studio.';
      if (error?.code === '21000') return 'Your account needs a Studio review before it can open. Please contact Andrew Tharwat Studio.';
      return 'You’re signed in, but we couldn’t load your account right now. Please reload and try again.';
    },
    logError(stage, error) {
      // Never log an OTP, session, JWT, or whole request payload.
      console.error('ATS auth: ' + stage, { code: error?.code, status: error?.status, message: error?.message });
    }
  });
})();
