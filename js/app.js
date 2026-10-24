(() => {
  const count = 73, frames = new Array(count), canvas = document.querySelector('#canvas'), ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frameFolder=innerWidth<768?'mobile':'focus';
  const mobile = () => innerWidth < 768 && innerHeight > innerWidth*.85;
  const hero = document.querySelector('.hero-standalone'), wrap = document.querySelector('.canvas-wrap'), container = document.querySelector('#scroll-container');
  const sections = [...document.querySelectorAll('.scroll-section')];
  const heroProduct = document.querySelector('.hero-product');
  const footer = document.querySelector('.site-footer');
  const heroHints = document.querySelectorAll('.scroll-cue, .hero-footnote');
  const heroCopy = document.querySelector('.hero-copy');
  const productBar=document.querySelector('.product-bar');
  let layout, pendingUpdate=false, lastDraw='', productBox;
  let frame = 0, progress = 0, loaded = 0, lenis;
  const clamp = n => Math.max(0, Math.min(1, n));
  const smooth = n => {const t=clamp(n);return t*t*(3-2*t);};
  function measure(){
    const origin=heroProduct.getBoundingClientRect();
    layout={w:innerWidth,h:innerHeight,dpr:Math.min(devicePixelRatio||1,2),
      originX:origin.left,originY:origin.top+scrollY,originW:origin.width,
      copyBottom:heroCopy.getBoundingClientRect().bottom+scrollY,
      start:hero.offsetHeight,range:container.offsetHeight-innerHeight,
      footerTop:footer.offsetTop,footerHeight:footer.offsetHeight,
      total:document.documentElement.scrollHeight-innerHeight,
      bottoms:sections.map(s=>parseFloat(getComputedStyle(s).paddingTop)+s.querySelector('.section-inner').offsetHeight)};
    lastDraw='';
  }
  function requestUpdate(){if(!pendingUpdate){pendingUpdate=true;requestAnimationFrame(()=>{pendingUpdate=false;update();});}}
  function draw(index = frame) {
    frame = index;
    const img = frames[index]; if (!img) return;
    if(!layout)measure();
    const {w,h,dpr}=layout;
    if(canvas.width !== Math.round(w*dpr) || canvas.height !== Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
    // The source is nearly square; fit it to the dedicated product zone,
    // keeping all exploded layers visible on narrow screens.
    const zoneW = mobile() ? w * 1.04 : w * .64;
    let productTop=h*.43;
    if(mobile())sections.forEach((s,i)=>{
      const enter=+s.dataset.enter/100,leave=+s.dataset.leave/100;
      const clearance=smooth((progress-enter+.025)/.025)*
        (s.dataset.persist==='true'?1:smooth((leave+.025-progress)/.025));
      productTop=Math.max(productTop,h*.43+(layout.bottoms[i]+20-h*.43)*clearance);
    });
    const productBottom=h-24;
    const zoneH = mobile() ? Math.max(100,productBottom-productTop) : h * .80;
    const scale = Math.min(zoneW / img.naturalWidth, zoneH / img.naturalHeight);
    const dw = img.naturalWidth*scale, dh=img.naturalHeight*scale;
    const centerY = mobile() ? (productTop+productBottom)/2 : h*.55;
    let centerX=.65;
    if(progress>.18)centerX=.65-.30*smooth((progress-.18)/.03);
    if(progress>.34)centerX=.35+.30*smooth((progress-.34)/.03);
    if(progress>.71)centerX=.65-.15*smooth((progress-.71)/.05);
    if(progress>.76)centerX=.5-.15*smooth((progress-.76)/.04);
    // One canvas owns the phone from the opening through the final frame.
    // Match the original hero image exactly, then carry it into its sticky pose.
    let originW=layout.originW;
    const originY=mobile()?Math.max(layout.originY,layout.copyBottom+10):layout.originY;
    if(mobile())originW=Math.min(originW,Math.max(120,h-originY-12)*frames[0].naturalWidth/frames[0].naturalHeight);
    const originH = originW * frames[0].naturalHeight / frames[0].naturalWidth;
    const originX=mobile()?(w-originW)/2:layout.originX;
    const travel = reduced ? 1 : clamp(scrollY / (layout.start * .9));
    const eased = travel * travel * (3 - 2 * travel);
    const mix = (a,b) => a+(b-a)*eased;
    const x=mix(originX,w*(mobile()?.5:centerX)-dw/2),y=mix(originY,centerY-dh/2);
    const width=mix(originW,dw),height=mix(originH,dh);
    productBox={x,y,width,height};
    const signature=[index,x,y,width,height].join(',');
    if(signature===lastDraw)return;
    lastDraw=signature;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
    ctx.drawImage(img,x,y,width,height);
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
    if(!layout)measure();
    const {start,range}=layout;
    progress=clamp((scrollY-start)/range);
    const transition=clamp(scrollY/(innerHeight*.7));
    const showBar=scrollY>innerHeight*.55;
    productBar.classList.toggle('is-visible',showBar);
    productBar.inert=!showBar;
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
    const footerOverlap=Math.max(0,scrollY+innerHeight-layout.footerTop);
    wrap.style.transform=`translateY(${-footerOverlap*.8}px)`;
    const footerFade=1-clamp(footerOverlap/(layout.footerHeight*.65));
    sections.forEach(s=>{
      s.style.opacity=Number(s.style.opacity)*footerFade;
      if(footerFade===0)s.style.visibility='hidden';
    });
    const marquee=document.querySelector('.marquee-wrap');
    marquee.style.opacity=clamp((progress-.72)/.025)*clamp((.84-progress)/.025)*.5;
    document.querySelector('.marquee-text').style.transform=`translateX(${(progress-.72)*-100}%)`;
    document.querySelector('.experience-progress div').style.transform=`scaleX(${clamp(scrollY/layout.total)})`;
    window.duoState={frame,progress,loaded,total:count,productBox};
  }
  function load(i){return new Promise((resolve,reject)=>{const img=new Image();img.onload=async()=>{try{await img.decode();frames[i]=img;loaded++;document.querySelector('#loader-bar').style.width=`${loaded/count*100}%`;if(i===0)draw(0);resolve();}catch(error){reject(error);}};img.onerror=()=>reject(new Error('A product frame could not be loaded.'));img.src=`frames/${frameFolder}/frame_${String(i+1).padStart(4,'0')}.webp?v=mobile-polish`;});}
  async function init(){
    try{
      await Promise.all(Array.from({length:10},(_,i)=>load(i)));
      // Small batches limit decode pressure on mobile.
      for(let i=10;i<count;i+=8)await Promise.all(Array.from({length:Math.min(8,count-i)},(_,j)=>load(i+j)));
      if(window.gsap&&window.Lenis&&!reduced){
        lenis=new Lenis({duration:1.1,smoothWheel:true,syncTouch:false});
        lenis.on('scroll',requestUpdate);
        gsap.ticker.add(time=>lenis.raf(time*1000));gsap.ticker.lagSmoothing(0);
      }
      // The local review page uses the same scrolling path as navigation.
      window.duoPreviewSeek = p => {const to=p<0?hero.offsetHeight*(p+1):hero.offsetHeight+(container.offsetHeight-innerHeight)*p;if(lenis)lenis.scrollTo(to,{immediate:true});else scrollTo(0,to);update();};
      measure();
      document.body.classList.add('canvas-ready');
      document.querySelector('#loader').remove();draw();update();
      setupStore();
    }catch(error){document.querySelector('#loader-percent').textContent='Could not load the experience. Please refresh to retry.';console.error(error);}
  }
  function setupStore(){
    const dialogs=[...document.querySelectorAll('dialog')];
    let inBag=false;
    function closePanels(){dialogs.forEach(d=>{if(d.open)d.close();});}
    function openPanel(id){
      closePanels();const panel=document.getElementById(id);
      if(id==='bag-panel')renderBag();
      panel.showModal();document.documentElement.classList.add('panel-open');lenis?.stop();
      if(id==='search-panel')document.querySelector('#site-search').focus();
    }
    dialogs.forEach(d=>{
      d.addEventListener('close',()=>{if(!dialogs.some(p=>p.open)){document.documentElement.classList.remove('panel-open');lenis?.start();}});
      d.addEventListener('click',e=>{const r=d.getBoundingClientRect();if(e.target===d&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))d.close();});
    });
    document.addEventListener('click',e=>{
      const opener=e.target.closest('[data-open]');if(opener){openPanel(opener.dataset.open);return;}
      if(e.target.closest('[data-close]')){closePanels();return;}
      const a=e.target.closest('a[href^="#"]');if(!a)return;
      const target=document.querySelector(a.getAttribute('href'));if(!target)return;
      e.preventDefault();closePanels();
      const chapter=target.classList.contains('scroll-section');
      const p=chapter?(+target.dataset.enter+(+target.dataset.leave-+target.dataset.enter)*.5)/100:0;
      const to=chapter?layout.start+layout.range*p:0;
      if(lenis){lenis.start();lenis.scrollTo(to,{duration:reduced?0:1.3});}else scrollTo({top:to,behavior:reduced?'instant':'smooth'});
    });
    function renderBag(){
      document.querySelector('#bag-content').innerHTML=inBag?
        '<div class="bag-item"><img src="frames/mobile/frame_0001.webp" alt="iPhone Duo concept"><div><h3>iPhone Duo</h3><p>Concept item · Not for sale</p><button class="text-button" id="remove-from-bag">Remove from bag</button></div></div>':
        '<p>Your bag is empty. Add the concept from the Buy panel to try the demo.</p>';
      document.querySelectorAll('.bag-dot').forEach(el=>el.hidden=!inBag);
      document.querySelector('.bag-button').setAttribute('aria-label',inBag?'Open demo shopping bag, 1 concept item':'Open demo shopping bag, empty');
      document.querySelector('#remove-from-bag')?.addEventListener('click',()=>{inBag=false;renderBag();document.querySelector('#bag-panel [data-close]').focus();});
    }
    document.querySelector('#add-to-bag').addEventListener('click',()=>{inBag=true;openPanel('bag-panel');});
    const entries=[
      {title:'Overview',description:'Meet the iPhone Duo concept',href:'#home',keywords:'home introduction'},
      {title:'Room for another side',description:'The display and folding form',href:'#explore',keywords:'design screen display'},
      {title:'At the heart, a hinge',description:'The connection between the folding halves',href:'#hinge',keywords:'hinge connection'},
      {title:'Inside Duo',description:'Glass, frame, and internal components',href:'#inside',keywords:'architecture interior components'},
      {title:'Designed around the fold',description:'Battery blocks and a flexible connection',href:'#split-layout',keywords:'battery split layout power'},
      {title:'About this concept',description:'An independent, unofficial design exploration',href:'#about',keywords:'apple demo information'}
    ];
    const search=document.querySelector('#site-search');
    function renderSearch(){const q=search.value.trim().toLowerCase();const found=entries.filter(e=>(e.title+' '+e.description+' '+e.keywords).toLowerCase().includes(q));document.querySelector('#search-results').innerHTML=found.length?found.map(e=>`<a class="search-result" href="${e.href}">${e.title}<span>${e.description}</span></a>`).join(''):'<p>No matching sections. Try display, hinge, or battery.</p>';}
    search.addEventListener('input',renderSearch);renderSearch();renderBag();
  }
  addEventListener('scroll',requestUpdate,{passive:true});
  addEventListener('resize',()=>{measure();requestUpdate();});
  init();
})();
