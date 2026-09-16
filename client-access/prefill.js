(() => {
  const email = new URLSearchParams(location.search).get('email');
  const input = document.querySelector('#access-email');
  if (!input || !email) return;
  const value = String(email).trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) input.value = value;
})();