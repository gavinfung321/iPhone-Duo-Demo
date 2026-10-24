(() => {
  const count = 73, frames = new Array(count), canvas = document.querySelector('#canvas'), ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = () => innerWidth < 768;
  const hero = document.querySelector('.hero-standalone'), wrap = document.querySelector('.canvas-wrap'), container = document.querySelector('#scroll-container');
  const sections = [...document.querySelectorAll('.scroll-section')];
  const heroProduct = document.querySelector('.hero-product');
  const footer = document.querySelector('.site-footer');
  const heroHints = document.querySelectorAll('.scroll-cue, .hero-footnote');
  let frame = 0, progress = 0, loaded = 0, lenis;
  const clamp = n => Math.max(0, Math.min(1, n));
  const smooth = n => {const t=clamp(n);return t*t*(3-2*t);};
  function draw(index = frame) {
    frame = index;
    const img = frames[index]; if (!img) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = innerWidth, h = innerHeight;
    if(canvas.width !== Math.round(w*dpr) || canvas.height !== Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
    ctx.setTransform(dpr,0,0,dpr,0,0); ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
    // The source is nearly square; fit it to the dedicated product zone,
    // keeping all exploded layers visible on narrow screens.
    const zoneW = mobile() ? w * 1.04 : w * .64;
    const zoneH = mobile() ? h * .56 : h * .80;
    const scale = Math.min(zoneW / img.naturalWidth, zoneH / img.naturalHeight);
    const dw = img.naturalWidth*scale, dh=img.naturalHeight*scale;
    const centerY = mobile() ? h*.70 : h*.55;
    let centerX=.65;
    if(progress>.18)centerX=.65-.30*smooth((progress-.18)/.03);
    if(progress>.34)centerX=.35+.30*smooth((progress-.34)/.03);
    if(progress>.71)centerX=.65-.15*smooth((progress-.71)/.05);
    if(progress>.76)centerX=.5-.15*smooth((progress-.76)/.04);
    // One canvas owns the phone from the opening through the final frame.
    // Match the original hero image exactly, then carry it into its sticky pose.
    const origin = heroProduct.getBoundingClientRect();
    const originH = origin.width * frames[0].naturalHeight / frames[0].naturalWidth;
    const travel = reduced ? 1 : clamp(scrollY / (hero.offsetHeight * .9));
    const eased = travel * travel * (3 - 2 * travel);
    const mix = (a,b) => a+(b-a)*eased;
    ctx.drawImage(img,
      mix(origin.left,w*(mobile()?.5:centerX)-dw/2),
      mix(origin.top+scrollY,centerY-dh/2),
      mix(origin.width,dw),mix(originH,dh));
    // Original white studio frames preserve natural edges and ground lighting.
  }
  function showSection(section,p) {
    const enter=+section.dataset.enter/100, leave=+section.dataset.leave/100;
    const fade=.025, persistent=section.dataset.persist==='true';
    const local=clamp((p-enter)/fade), exit=persistent ? 1 : clamp((leave-p)/fade);
    const visible=local*exit;
    section.style.visibility=visible>0?'visible':'hidden'; section.style.opacity=visible;
    section.querySelectorAll('.section-label,h2,.section-inner>p:not(.section-label),.cta-button').forEach((el,i)=>{
      const t=reduced?1:clamp((p-enter-i*.0025)/.024); const n=1-t;
      el.style.opacity=t;
      let transform='none';
      if(!reduced){switch(section.dataset.animation){
        case 'slide-left':transform=`translateX(${-45*n}px)`;break;
        case 'slide-right':transform=`translateX(${45*n}px)`;break;
        case 'scale-up':transform=`scale(${1-.12*n})`;break;
        case 'clip-reveal':el.style.clipPath=`inset(${100*n}% 0 0 0)`;break;
        default:transform=`translateY(${28*n}px)`;
      }} el.style.transform=transform;
    });
  }
  function update(){
    const start=hero.offsetHeight, range=container.offsetHeight-innerHeight;
    progress=clamp((scrollY-start)/range);
    const transition=clamp(scrollY/(innerHeight*.7));
    document.querySelector('.hero-copy').style.opacity=1-transition;
    const hintOpacity=1-clamp(scrollY/(innerHeight*.22));
    heroHints.forEach(el=>{
      el.style.opacity=hintOpacity;
      el.style.visibility=hintOpacity>0?'visible':'hidden';
    });
    wrap.style.clipPath='none';
    wrap.style.opacity=1;
    // Let the first feature arrive around the assembled phone before opening it.
    const playback=clamp((progress-.14)/.38);
    const next = reduced ? (progress>.28?72:0) : Math.floor(playback*(count-1));
    draw(next);
    sections.forEach(s=>showSection(s,progress));
    // Let the fixed experience leave naturally as the real footer enters.
    const footerOverlap=Math.max(0,scrollY+innerHeight-footer.offsetTop);
    wrap.style.transform=`translateY(${-footerOverlap*.8}px)`;
    const footerFade=1-clamp(footerOverlap/(footer.offsetHeight*.65));
    sections.forEach(s=>{
      s.style.opacity=Number(s.style.opacity)*footerFade;
      if(footerFade===0)s.style.visibility='hidden';
    });
    const marquee=document.querySelector('.marquee-wrap');
    marquee.style.opacity=clamp((progress-.72)/.025)*clamp((.84-progress)/.025)*.5;
    document.querySelector('.marquee-text').style.transform=`translateX(${(progress-.72)*-100}%)`;
    document.querySelector('.experience-progress div').style.transform=`scaleX(${clamp(scrollY/(document.documentElement.scrollHeight-innerHeight))})`;
    window.duoState={frame,progress,loaded,total:count};
  }
  function load(i){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{frames[i]=img;loaded++;document.querySelector('#loader-bar').style.width=`${loaded/count*100}%`;if(i===0)draw(0);resolve();};img.onerror=()=>reject(new Error('A product frame could not be loaded.'));img.src=`frames/focus/frame_${String(i+1).padStart(4,'0')}.webp?v=product-focus`;});}
  async function init(){
    try{
      await Promise.all(Array.from({length:10},(_,i)=>load(i)));
      // Small batches limit decode pressure on mobile.
      for(let i=10;i<count;i+=8)await Promise.all(Array.from({length:Math.min(8,count-i)},(_,j)=>load(i+j)));
      if(window.gsap&&window.ScrollTrigger&&window.Lenis&&!reduced){
        gsap.registerPlugin(ScrollTrigger);
        lenis=new Lenis({duration:1.1,smoothWheel:true});
        lenis.on('scroll',()=>{ScrollTrigger.update();update();});
        gsap.ticker.add(time=>lenis.raf(time*1000));gsap.ticker.lagSmoothing(0);
      }
      // The local review page uses the same scrolling path as navigation.
      window.duoPreviewSeek = p => {const to=p<0?hero.offsetHeight*(p+1):hero.offsetHeight+(container.offsetHeight-innerHeight)*p;if(lenis)lenis.scrollTo(to,{immediate:true});else scrollTo(0,to);update();};
      document.body.classList.add('canvas-ready');
      document.querySelector('#loader').remove();draw();update();
      document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
        const target=document.querySelector(a.getAttribute('href'));if(!target)return;e.preventDefault();
        const to=target.id==='explore'?hero.offsetHeight+(container.offsetHeight-innerHeight)*.09:0;
        if(lenis)lenis.scrollTo(to,{duration:reduced?0:1.6});else scrollTo({top:to,behavior:reduced?'instant':'smooth'});
      }));
    }catch(error){document.querySelector('#loader-percent').textContent='Could not load the experience. Please refresh to retry.';console.error(error);}
  }
  addEventListener('scroll',update,{passive:true});addEventListener('resize',()=>{draw();update();});init();
})();



