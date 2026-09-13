(() => {
  const heroImg = document.querySelector('.hero-visual img');
  if (heroImg) {
    heroImg.src = '/assets/svg-extracted/hero-portrait3.svg?v=2';
    heroImg.alt = 'Andrew Tharwat hero visual';
    heroImg.loading = 'eager';
    heroImg.decoding = 'async';
  }

  if (!document.getElementById('hero-size-upgrade')) {
    const style = document.createElement('style');
    style.id = 'hero-size-upgrade';
    style.textContent = `
      .hero .container{width:min(1420px,94%)}
      .hero{min-height:790px;padding-top:104px}
      .hero-layout{
        grid-template-columns:minmax(0,.86fr) minmax(610px,1.14fr);
        gap:52px;
        min-height:640px;
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
        inset:6% -4% -9% 8%;
        border-radius:38px;
        background:radial-gradient(circle at 48% 42%,rgba(255,46,63,.18),transparent 48%),radial-gradient(circle at 75% 22%,rgba(66,146,198,.22),transparent 42%);
        filter:blur(32px);
        z-index:-1;
      }
      .hero-visual img{
        width:min(800px,56vw) !important;
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
        .hero-layout{grid-template-columns:minmax(0,.95fr) minmax(520px,1.05fr);gap:34px}
        .hero-visual img{width:min(690px,51vw) !important}
      }
      @media(max-width:1100px){
        .hero{min-height:auto;padding-bottom:110px}
        .hero-layout{grid-template-columns:1fr;gap:38px;min-height:0}
        .hero-visual{justify-content:center}
        .hero-visual img{width:min(960px,100%) !important;aspect-ratio:16/9}
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
