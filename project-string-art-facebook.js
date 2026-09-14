(() => {
  const isStringArt = /\/projects\/magic-of-string-art(?:[/?#]|$)/i.test(location.pathname) || new URLSearchParams(location.search).get('slug') === 'magic-of-string-art';
  if (!isStringArt) return;

  const addFacebookButton = () => {
    const contact = document.querySelector('.portrait-offer-contact');
    if (!contact || contact.querySelector('.portrait-facebook')) return false;

    const facebook = document.createElement('a');
    facebook.className = 'portrait-facebook';
    facebook.href = 'https://www.facebook.com/AndewStringArt';
    facebook.target = '_blank';
    facebook.rel = 'noopener';
    facebook.setAttribute('aria-label', 'Visit Andrew String Art on Facebook');
    facebook.innerHTML = '<span class="portrait-facebook-icon">f</span><span class="portrait-facebook-copy"><strong>شاهد المزيد من أعمال String Art</strong><b>Facebook · @AndewStringArt</b></span><span class="portrait-facebook-arrow">↗</span>';

    const note = contact.querySelector('small');
    contact.insertBefore(facebook, note || null);
    return true;
  };

  if (addFacebookButton()) return;

  const root = document.getElementById('project-root');
  if (!root) return;
  const observer = new MutationObserver(() => {
    if (addFacebookButton()) observer.disconnect();
  });
  observer.observe(root, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 12000);
})();
