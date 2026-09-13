(() => {
  const heroImg = document.querySelector('.hero-visual img');
  if (heroImg) {
    heroImg.src = '/assets/hero-main.svg?v=1';
    heroImg.alt = 'Andrew Tharwat — Safety, Digital, Creative and AI';
    heroImg.loading = 'eager';
    heroImg.decoding = 'async';
  }

  if (!document.getElementById('hero-size-upgrade')) {
    const style = document.createElement('style');
    style.id = 'hero-size-upgrade';
    style.textContent = `
      .hero .container{width:min(1380px,94%)}
      .hero{min-height:780px;padding-top:104px}
      .hero-layout{
        grid-template-columns:minmax(0,.9fr) minmax(560px,1.1fr);
        gap:46px;
        min-height:630px;
        align-items:center;
      }
      .hero-copy{position:relative;z-index:3}
      .hero-visual{
        position:relative;
        display:flex;
        align-items:center;
        justify-content:flex-end;
        overflow:visible;
        z-index:2;
      }
      .hero-visual:before{
        content:"";
        position:absolute;
        inset:7% -3% -8% 9%;
        border-radius:36px;
        background:radial-gradient(circle at 48% 42%,rgba(255,46,63,.20),transparent 48%),radial-gradient(circle at 75% 22%,rgba(66,146,198,.22),transparent 42%);
        filter:blur(30px);
        z-index:-1;
      }
      .hero-visual img{
        width:min(740px,53vw) !important;
        max-width:none;
        aspect-ratio:16/9;
        height:auto;
        object-fit:cover;
        object-position:center center;
        border-radius:30px;
        border:1px solid rgba(255,255,255,.18);
        box-shadow:0 34px 90px rgba(0,0,0,.42),0 0 0 1px rgba(225,6,19,.08);
      }
      @media(max-width:1260px){
        .hero .container{width:min(1240px,94%)}
        .hero-layout{grid-template-columns:minmax(0,.95fr) minmax(500px,1.05fr);gap:32px}
        .hero-visual img{width:min(650px,50vw) !important}
      }
      @media(max-width:1100px){
        .hero{min-height:auto;padding-bottom:110px}
        .hero-layout{grid-template-columns:1fr;gap:38px;min-height:0}
        .hero-visual{justify-content:center}
        .hero-visual img{width:min(900px,100%) !important;aspect-ratio:16/9}
      }
      @media(max-width:680px){
        .hero .container{width:min(94%,680px)}
        .hero{padding-top:92px;padding-bottom:88px}
        .hero-layout{gap:28px}
        .hero-visual img{width:100% !important;aspect-ratio:16/10;border-radius:20px;object-position:58% center}
        .hero-visual:before{inset:10% 0 -4% 0}
      }
    `;
    document.head.appendChild(style);
  }
})();
