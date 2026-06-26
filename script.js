  document.getElementById('year').textContent = new Date().getFullYear();

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll reveal (skipped under reduced motion)
  var revealEls = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    revealEls.forEach(function(el){ el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function(el){ io.observe(el); });
  }

  // Active nav link on scroll
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
  var sections = links.map(function(l){ return document.querySelector(l.getAttribute('href')); });
  if ('IntersectionObserver' in window) {
    var navIO = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){
          var id = '#' + e.target.id;
          links.forEach(function(l){ l.classList.toggle('active', l.getAttribute('href') === id); });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function(s){ if (s) navIO.observe(s); });
  }

  // Scroll progress bar
  var bar = document.getElementById('progress');
  if (bar) {
    var onScroll = function(){
      var st = window.scrollY || document.documentElement.scrollTop;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (st / h) * 100 : 0) + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Animated count-up on hero stats
  var fmtNum = function(v, el){
    var dec = +(el.getAttribute('data-decimals') || 0);
    var s = dec ? v.toFixed(dec) : Math.round(v).toString();
    if (el.getAttribute('data-comma')) s = Math.round(v).toLocaleString('en-US');
    return (el.getAttribute('data-prefix') || '') + s + (el.getAttribute('data-suffix') || '');
  };
  var nums = document.querySelectorAll('.num[data-count]');
  var runCount = function(el){
    var target = parseFloat(el.getAttribute('data-count'));
    var finalText = el.textContent, start = null, dur = 1200;
    var step = function(now){
      if (start === null) start = now;
      var t = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = fmtNum(target * eased, el);
      if (t < 1) requestAnimationFrame(step); else el.textContent = finalText;
    };
    requestAnimationFrame(step);
  };
  if (reduce || !('IntersectionObserver' in window)) {
    /* leave final values in place */
  } else {
    var numIO = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){ runCount(e.target); numIO.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    nums.forEach(function(el){ numIO.observe(el); });
  }
