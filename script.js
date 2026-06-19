(function() {
  // ===================== CONSTANTS & CONFIG =====================
  const VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260616_212935_bbf608da-62d1-4f25-9be4-c346e4d09cc8.mp4';
  
  // ===================== SCROLL VIDEO PLAYER =====================
  const canvas = document.getElementById('video-canvas');
  const videoEl = document.getElementById('video-fallback');
  const ctx = canvas.getContext('2d');
  
  let frames = [];
  let framesReady = false;
  let lastFrameIndex = -1;
  let videoSeeking = false;
  let seekTargetTime = 0;

  function resizeCanvas() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    lastFrameIndex = -1; // Force redraw on next tick
  }

  // Pre-extract video frames as ImageBitmaps if CORS is configured correctly
  async function extractFrames() {
    try {
      const response = await fetch(VIDEO_URL, { mode: 'cors' });
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      video.src = objectUrl;

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Failed to load video metadata'));
        setTimeout(() => reject(new Error('Video load timeout')), 10000);
      });

      const scale = Math.min(1, 1280 / video.videoWidth);
      const scaledWidth = Math.round(video.videoWidth * scale);
      const scaledHeight = Math.round(video.videoHeight * scale);
      const frameCount = Math.max(30, Math.min(100, Math.round(video.duration * 20))); // Extract ~20 fps

      for (let i = 0; i < frameCount; i++) {
        const time = (i / (frameCount - 1)) * (video.duration - 0.05);
        video.currentTime = time;
        await new Promise((resolve, reject) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
          };
          video.addEventListener('seeked', onSeeked);
          setTimeout(() => {
            video.removeEventListener('seeked', onSeeked);
            reject(new Error(`Seek timeout at frame ${i}`));
          }, 2000);
        });
        const bitmap = await createImageBitmap(video, {
          resizeWidth: scaledWidth,
          resizeHeight: scaledHeight
        });
        frames.push(bitmap);
      }

      if (frames.length > 0) {
        framesReady = true;
        canvas.style.display = 'block';
        videoEl.style.display = 'none';
      }
      URL.revokeObjectURL(objectUrl);
    } catch(e) {
      console.warn('Frame pre-extraction failed, falling back to real-time video seeking.', e);
      // Ensure canvas is hidden and raw video element is shown/used
      canvas.style.display = 'none';
      videoEl.style.display = 'block';
      videoEl.style.visibility = 'visible';
    }
  }

  function getScrollBounds() {
    const vh = window.innerHeight;
    const bodyHeight = document.documentElement.scrollHeight;
    return {
      start: vh * 0.3,
      end: bodyHeight - vh
    };
  }

  function getProgress() {
    const { start, end } = getScrollBounds();
    const range = end - start;
    if (range <= 0) return 0;
    return Math.max(0, Math.min(1, (window.pageYOffset || window.scrollY - start) / range));
  }

  function drawFrame(frame) {
    if (!canvas || !ctx) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const s = Math.max(cw / frame.width, ch / frame.height);
    const dw = frame.width * s;
    const dh = frame.height * s;
    ctx.drawImage(frame, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  }

  // Smooth scroll video frame updater loop
  function videoTick() {
    const progress = getProgress();
    
    if (framesReady && frames.length > 0) {
      const idx = Math.round(progress * (frames.length - 1));
      if (idx !== lastFrameIndex) {
        lastFrameIndex = idx;
        if (frames[idx]) {
          drawFrame(frames[idx]);
        }
      }
    } else if (videoEl && videoEl.duration && isFinite(videoEl.duration) && videoEl.readyState >= 1) {
      seekTargetTime = progress * videoEl.duration;
      // Interpolate seek step to avoid extreme stuttering
      const timeDiff = seekTargetTime - videoEl.currentTime;
      if (!videoSeeking && Math.abs(timeDiff) > 0.04) {
        videoSeeking = true;
        // Dampen the movement: take a 20% step toward target
        const step = videoEl.currentTime + timeDiff * 0.2;
        videoEl.currentTime = Math.max(0, Math.min(videoEl.duration - 0.02, step));
      }
    }
    requestAnimationFrame(videoTick);
  }

  if (videoEl) {
    videoEl.addEventListener('seeked', () => { videoSeeking = false; });
    videoEl.addEventListener('stalled', () => { videoSeeking = false; });
    videoEl.addEventListener('loadeddata', () => { videoEl.currentTime = 0; });
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  requestAnimationFrame(videoTick);
  extractFrames();

  // ===================== CONSTELLATION PARTICLES =====================
  const pCanvas = document.getElementById('particles-canvas');
  if (pCanvas) {
    const pCtx = pCanvas.getContext('2d');
    let particles = [];

    function resizeParticles() {
      pCanvas.width = window.innerWidth;
      pCanvas.height = window.innerHeight;
      createParticles();
    }

    function createParticles() {
      particles = [];
      const density = window.innerWidth < 768 ? 16000 : 10000;
      const count = Math.floor((pCanvas.width * pCanvas.height) / density);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * pCanvas.width,
          y: Math.random() * pCanvas.height,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          size: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.5 + 0.2
        });
      }
    }

    function animateParticles() {
      pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
      
      // Draw nodes
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        
        // Boundaries wrap
        if (p.x < 0) p.x = pCanvas.width;
        if (p.x > pCanvas.width) p.x = 0;
        if (p.y < 0) p.y = pCanvas.height;
        if (p.y > pCanvas.height) p.y = 0;
        
        pCtx.beginPath();
        pCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        pCtx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        pCtx.fill();

        // Draw web lines to nearby points (limit connections for performance)
        for (let j = i + 1; j < particles.length; j++) {
          const other = particles[j];
          const dx = p.x - other.x;
          const dy = p.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 90) {
            const alpha = (1 - dist / 90) * 0.12;
            pCtx.beginPath();
            pCtx.moveTo(p.x, p.y);
            pCtx.lineTo(other.x, other.y);
            pCtx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
            pCtx.lineWidth = 0.5;
            pCtx.stroke();
          }
        }
      }
      requestAnimationFrame(animateParticles);
    }

    resizeParticles();
    window.addEventListener('resize', resizeParticles);
    animateParticles();
  }

  // ===================== HERO FADE ON SCROLL =====================
  const heroEl = document.getElementById('hero');
  function updateHeroOpacity() {
    if (heroEl) {
      const fade = Math.max(0, 1 - window.scrollY / (window.innerHeight * 0.35));
      heroEl.style.opacity = fade.toString();
    }
  }
  window.addEventListener('scroll', updateHeroOpacity, { passive: true });

  // ===================== FLOATING FIXED CARDS MASKING =====================
  const fixedCards = document.getElementById('fixed-cards');
  const cardsGrid = fixedCards ? fixedCards.querySelector('.grid') : null;
  const cardsTrigger = document.getElementById('cards-trigger');

  function tickCardsScrollEffect() {
    if (!fixedCards || !cardsGrid || !cardsTrigger) return;
    
    const isMobile = window.innerWidth < 992;
    if (isMobile) {
      // Inline scrolling on mobile, clear style properties
      fixedCards.style.opacity = '1';
      fixedCards.style.pointerEvents = 'auto';
      cardsGrid.style.maskImage = 'none';
      cardsGrid.style.webkitMaskImage = 'none';
      requestAnimationFrame(tickCardsScrollEffect);
      return;
    }

    const rect = cardsTrigger.getBoundingClientRect();
    const triggerTop = rect.top + window.scrollY;
    const triggerHeight = rect.height;
    const scrollY = window.scrollY;
    const vh = window.innerHeight;

    // Start effect when entering the trigger zone, end when leaving it
    const start = triggerTop - vh * 0.4;
    const end = triggerTop + triggerHeight - vh * 0.4;
    const range = end - start;

    let progress = range > 0 ? (scrollY - start) / range : 0;
    progress = Math.max(0, Math.min(1, progress));

    const isActive = scrollY >= start - vh * 0.2 && scrollY <= end + vh * 0.3;
    const fadeIn = Math.min(1, Math.max(0, (scrollY - (start - vh * 0.2)) / (vh * 0.2)));
    const fadeOut = Math.min(1, Math.max(0, (end + vh * 0.3 - scrollY) / (vh * 0.3)));
    const containerOpacity = isActive ? Math.min(fadeIn, fadeOut) : 0;

    fixedCards.style.opacity = containerOpacity.toString();
    fixedCards.style.pointerEvents = containerOpacity > 0.1 ? 'auto' : 'none';

    // Apply linear mask wipe reveal
    const revealPct = progress * 130;
    const maskStr = `linear-gradient(to right, black ${revealPct}%, transparent ${revealPct + 15}%)`;
    cardsGrid.style.maskImage = maskStr;
    cardsGrid.style.webkitMaskImage = maskStr;

    requestAnimationFrame(tickCardsScrollEffect);
  }
  requestAnimationFrame(tickCardsScrollEffect);

  // ===================== CARD GLOW AND INTERACTION =====================
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });

  // ===================== COPY TO CLIPBOARD HANDLER =====================
  const installBox = document.getElementById('install-cmd-box');
  const copyBtn = document.getElementById('copy-btn');
  const copyTooltip = document.getElementById('copy-tooltip');
  
  if (installBox && copyBtn && copyTooltip) {
    const copyIcon = copyBtn.querySelector('.copy-icon');
    const checkIcon = copyBtn.querySelector('.check-icon');

    async function performCopy() {
      try {
        await navigator.clipboard.writeText('npm i @veldara/core');
        
        installBox.classList.add('copied');
        copyTooltip.textContent = 'Copied!';
        copyIcon.style.display = 'none';
        checkIcon.style.display = 'block';
        
        setTimeout(() => {
          installBox.classList.remove('copied');
          copyTooltip.textContent = 'Copy';
          copyIcon.style.display = 'block';
          checkIcon.style.display = 'none';
        }, 2200);
      } catch (err) {
        console.error('Failed to copy installation script: ', err);
      }
    }

    installBox.addEventListener('click', performCopy);
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Avoid double action since parent has event listener
      performCopy();
    });
  }

  // ===================== SECTION 3 INTERSECTION FADE-IN =====================
  const sectionThreeInner = document.getElementById('section-three-inner');
  if (sectionThreeInner) {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        sectionThreeInner.classList.add('visible');
        observer.unobserve(sectionThreeInner);
      }
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    });
    observer.observe(sectionThreeInner);
  }
})();
