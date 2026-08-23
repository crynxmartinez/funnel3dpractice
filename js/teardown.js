/* Scroll-driven teardown hero.
 *
 * Plays a 240-frame exploded-view sequence on a canvas as the user scrolls
 * through a pinned section, and crossfades copy beats keyed to the frames
 * that actually prove them (beat 4 lands on the bare sensor).
 *
 * Loading is staged, because awaiting ~11 MB of frames up front means a
 * multi-second blank hero:
 *   1. poster        paints immediately, hero is never empty
 *   2. coarse ladder every 12th frame, ~800 KB — scroll becomes usable here
 *   3. backfill      the rest, nearest the playhead first
 */
(function () {
  'use strict';

  var TIERS = {
    desktop: { dir: 'assets/frames/desktop', count: 240 },
    mobile: { dir: 'assets/frames/mobile', count: 120 }
  };

  var LADDER_STEP = 12;   // every Nth frame in the coarse pass
  var CONCURRENCY = 6;    // parallel image requests during backfill
  var SMOOTHING = 0.16;   // playhead easing per frame; lower = heavier glide
  var STATIC_AT = 0.86;   // reduced-motion still: fully exploded

  var stage = document.querySelector('[data-teardown]');
  if (!stage) return;

  var canvas = stage.querySelector('[data-teardown-canvas]');
  var overlay = stage.querySelector('[data-teardown-beats]');
  var progressEl = stage.querySelector('[data-teardown-progress]');
  var ctx = canvas.getContext('2d', { alpha: false });

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var tierName = window.matchMedia('(max-width: 768px)').matches ? 'mobile' : 'desktop';
  var tier = TIERS[tierName];

  var frames = new Array(tier.count);   // decoded Image objects, sparse
  var poster = null;
  var target = 0;      // where the scroll says we are, in frame units
  var current = 0;     // eased value actually drawn
  var lastDrawn = -1;
  var running = false;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function framePath(i) {
    return tier.dir + '/f' + String(i + 1).padStart(3, '0') + '.webp';
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('failed: ' + src)); };
      img.src = src;
    });
  }

  /* ---- drawing ------------------------------------------------------- */

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    lastDrawn = -1;
    draw(current, true);
  }

  /* Contain-fit, centred. The renders sit on near-black and the page ground
     is near-black, so any letterboxing is invisible — and contain guarantees
     the outer exploded parts never get cropped away. */
  function paint(img) {
    var cw = canvas.width;
    var ch = canvas.height;
    ctx.fillStyle = '#07070a';
    ctx.fillRect(0, 0, cw, ch);
    if (!img) return;
    var scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
    var w = img.naturalWidth * scale;
    var h = img.naturalHeight * scale;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  /* Nearest loaded frame, searching outward — lets scroll feel responsive
     while the backfill is still arriving. */
  function nearestLoaded(i) {
    if (frames[i]) return frames[i];
    for (var d = 1; d < tier.count; d++) {
      if (frames[i - d]) return frames[i - d];
      if (frames[i + d]) return frames[i + d];
    }
    return poster;
  }

  function draw(frameFloat, force) {
    var i = clamp(Math.round(frameFloat), 0, tier.count - 1);
    if (i === lastDrawn && !force) return;
    lastDrawn = i;
    paint(nearestLoaded(i));
  }

  /* ---- copy beats ---------------------------------------------------- */

  var beats = [];

  function buildBeats() {
    var data = (window.FUNNEL && window.FUNNEL.BEATS) || [];
    overlay.innerHTML = '';
    data.forEach(function (b) {
      var el = document.createElement('article');
      el.className = 'beat beat--' + (b.align || 'left');
      el.id = 'beat-' + b.id;

      var html = '';
      if (b.eyebrow) html += '<p class="beat__eyebrow">' + b.eyebrow + '</p>';
      if (b.title) html += '<h2 class="beat__title">' + b.title + '</h2>';
      if (b.body) html += '<p class="beat__body">' + b.body + '</p>';
      if (b.stats && b.stats.length) {
        html += '<dl class="beat__stats">';
        b.stats.forEach(function (s) {
          html += '<div><dt>' + s[0] + '</dt><dd>' + s[1] + '</dd></div>';
        });
        html += '</dl>';
      }
      if (b.cta) {
        html += '<a class="btn btn--primary beat__cta" href="' + b.cta.href + '">' +
                b.cta.label + '</a>';
      }
      if (b.scrollHint) {
        html += '<p class="beat__hint"><span class="beat__hint-line"></span>Scroll to disassemble</p>';
      }
      el.innerHTML = html;
      overlay.appendChild(el);
      beats.push({ el: el, from: b.from, to: b.to });
    });
  }

  /* Fades live inside each band, so one beat is fully out before the next
     starts in — no two headlines stacked on top of each other. */
  function beatOpacity(b, p) {
    if (p <= b.from || p >= b.to) return 0;
    var fade = (b.to - b.from) * 0.26;
    return Math.min(1, Math.min((p - b.from) / fade, (b.to - p) / fade));
  }

  function updateBeats(p) {
    for (var i = 0; i < beats.length; i++) {
      var b = beats[i];
      var o = beatOpacity(b, p);
      if (o !== b.last) {
        b.last = o;
        b.el.style.opacity = o;
        b.el.style.transform = 'translate3d(0,' + ((1 - o) * 16).toFixed(1) + 'px,0)';
        b.el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
      }
    }
  }

  /* ---- scroll --------------------------------------------------------- */

  function progress() {
    var travel = stage.offsetHeight - window.innerHeight;
    if (travel <= 0) return 0;
    return clamp(-stage.getBoundingClientRect().top / travel, 0, 1);
  }

  function tick() {
    var diff = target - current;
    if (Math.abs(diff) < 0.01) {
      current = target;
      running = false;
    } else {
      current += diff * SMOOTHING;
      requestAnimationFrame(tick);
    }
    draw(current);
  }

  function onScroll() {
    var p = progress();
    target = p * (tier.count - 1);
    updateBeats(p);
    stage.style.setProperty('--teardown-progress', p.toFixed(4));
    if (!running) {
      running = true;
      requestAnimationFrame(tick);
    }
  }

  /* ---- staged loading ------------------------------------------------- */

  function ladderIndices() {
    var out = [];
    for (var i = 0; i < tier.count; i += LADDER_STEP) out.push(i);
    var last = tier.count - 1;
    if (out[out.length - 1] !== last) out.push(last);
    return out;
  }

  function loadInto(i) {
    return loadImage(framePath(i))
      .then(function (img) { frames[i] = img; })
      .catch(function () { /* a single dropped frame is survivable */ });
  }

  /* Pool that always picks the pending frame closest to the playhead, so the
     stretch the user is looking at sharpens before the far end of the timeline. */
  function backfill() {
    var pending = [];
    for (var i = 0; i < tier.count; i++) if (!frames[i]) pending.push(i);
    if (!pending.length) return Promise.resolve();

    function next() {
      if (!pending.length) return Promise.resolve();
      var here = Math.round(current);
      var bestAt = 0;
      var bestDist = Infinity;
      for (var k = 0; k < pending.length; k++) {
        var d = Math.abs(pending[k] - here);
        if (d < bestDist) { bestDist = d; bestAt = k; }
      }
      var idx = pending.splice(bestAt, 1)[0];
      return loadInto(idx).then(function () {
        if (frames[idx] && Math.abs(idx - Math.round(current)) <= 1) {
          draw(current, true);
        }
        return next();
      });
    }

    var workers = [];
    for (var w = 0; w < CONCURRENCY; w++) workers.push(next());
    return Promise.all(workers);
  }

  function setProgressUI(done, total) {
    if (!progressEl) return;
    var pct = total ? Math.round((done / total) * 100) : 100;
    progressEl.style.setProperty('--load', pct + '%');
    progressEl.setAttribute('aria-valuenow', String(pct));
  }

  /* ---- boot ----------------------------------------------------------- */

  function startStatic() {
    /* Reduced motion: no pin, no scroll-jacking. Show the settled exploded
       frame and let every beat sit in normal document flow. */
    stage.classList.add('is-static');
    beats.forEach(function (b) {
      b.el.style.opacity = 1;
      b.el.style.visibility = 'visible';
      b.el.style.transform = 'none';
    });
    var idx = Math.round(STATIC_AT * (tier.count - 1));
    loadInto(idx).then(function () {
      resize();
      draw(idx, true);
    });
  }

  function startAnimated() {
    var ladder = ladderIndices();
    var done = 0;
    setProgressUI(0, ladder.length);

    Promise.all(ladder.map(function (i) {
      return loadInto(i).then(function () {
        done++;
        setProgressUI(done, ladder.length);
        draw(current, true);
      });
    })).then(function () {
      stage.classList.add('is-ready');
      return backfill();
    }).then(function () {
      stage.classList.add('is-complete');
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function boot() {
    buildBeats();
    resize();

    loadImage('assets/poster.webp')
      .then(function (img) {
        poster = img;
        draw(current, true);
      })
      .catch(function () { /* frames will cover it */ });

    /* ResizeObserver rather than window.onresize: the canvas can have zero
       layout size at boot (background tab, hidden pane, collapsed ancestor),
       and becoming visible does not fire a window resize event — which would
       leave the bitmap stuck at its 300x150 default. RO fires on observe and
       on every box change, so it covers both. Setting canvas.width does not
       alter the element's box, so this cannot feed back into a loop. */
    if ('ResizeObserver' in window) {
      new ResizeObserver(function () {
        resize();
        if (!reduced) onScroll();
      }).observe(canvas);
    }

    window.addEventListener('resize', function () {
      resize();
      if (!reduced) onScroll();
    });

    if (reduced) startStatic(); else startAnimated();
  }

  boot();

  /* Handy for verifying the beat/frame mapping in the console. */
  window.__teardown = {
    tier: tierName,
    count: tier.count,
    at: function () { return { progress: progress(), frame: Math.round(current) }; },
    loaded: function () { return frames.filter(Boolean).length; },
    /* Jump straight to a progress value without going through scroll — lets you
       check which beat owns which frame even where scroll events are throttled. */
    render: function (p) {
      target = current = p * (tier.count - 1);
      updateBeats(p);
      stage.style.setProperty('--teardown-progress', p.toFixed(4));
      draw(current, true);
      return { progress: p, frame: Math.round(current) };
    },
    seek: function (p) {
      var travel = stage.offsetHeight - window.innerHeight;
      window.scrollTo({ top: stage.offsetTop + travel * p, behavior: 'instant' });
    }
  };
})();
