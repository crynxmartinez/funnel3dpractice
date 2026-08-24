/* Image-sequence players. One loader, two drivers.
 *
 *   teardown  scroll  hero. An exploded-view disassembly, loaded eagerly.
 *   lens      scroll  mid-page. A push-in through the optics onto the sensor.
 *   rotate    drag    pre-price. A ~180 degree orbit the reader spins by hand.
 *
 * Scroll-driven sections key copy beats to the frames that prove them, so the
 * 45MP claim lands while the sensor is actually on screen. The drag-driven one
 * has no beats — it is there to be handled, not narrated.
 *
 * Loading is staged, because awaiting several MB means a blank stage:
 *   1. poster        paints immediately, the stage is never empty
 *   2. coarse ladder every Nth frame — interaction becomes usable here
 *   3. backfill      the rest, nearest the playhead first
 */
(function () {
  'use strict';

  var CONCURRENCY = 6;   // parallel image requests during backfill
  var BREAKPOINT = 768;
  var DRAG_GAIN = 1.15;  // canvas widths of travel per full sweep
  var AUTO_SWEEP_MS = 18000;

  var SEQUENCES = {
    teardown: {
      mode: 'scroll',
      dir: 'assets/frames/teardown',
      poster: 'assets/poster-teardown.webp',
      counts: { desktop: 240, mobile: 120 },
      beats: 'BEATS',
      ladderStep: 12,
      smoothing: 0.16,
      staticAt: 0.86,   // reduced-motion still: fully exploded
      eager: true
    },
    lens: {
      mode: 'scroll',
      dir: 'assets/frames/lens',
      poster: 'assets/poster-lens.webp',
      counts: { desktop: 240, mobile: 120 },
      beats: 'LENS_BEATS',
      ladderStep: 12,
      // Slightly heavier glide: this is one continuous dolly move rather than
      // discrete parts separating, so it reads better with more inertia.
      smoothing: 0.13,
      staticAt: 1.0,    // reduced-motion still: the bare sensor
      eager: false
    },
    rotate: {
      mode: 'drag',
      dir: 'assets/frames/rotate',
      poster: 'assets/poster-rotate.webp',
      // Deliberately coarser than the cinematic sequences: 120 frames over the
      // ~180 degree arc is 1.5 degrees per frame, finer than a conventional
      // product spinner, and measured motion is gentle enough that halving the
      // source is invisible.
      counts: { desktop: 120, mobile: 60 },
      ladderStep: 8,
      eager: false
    }
  };

  function createSequence(stage, cfg) {
    var canvas = stage.querySelector('[data-seq-canvas]');
    var overlay = stage.querySelector('[data-seq-beats]');
    var progressEl = stage.querySelector('[data-seq-progress]');
    var trackEl = stage.querySelector('[data-seq-track]');
    if (!canvas) return null;

    var isDrag = cfg.mode === 'drag';
    var ctx = canvas.getContext('2d', { alpha: false });
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var tierName, count, dir;
    var frames;                      // decoded Image objects, sparse
    var poster = null;
    var target = 0;      // where the driver says we are, in frame units
    var current = 0;     // eased value actually drawn (scroll mode)
    var lastDrawn = -1;
    var running = false;
    var started = false;

    /* drag-mode state */
    var pos = 0;                     // 0..1 rotation position
    var dragging = false;
    var interacted = false;
    var autoRAF = null;
    var autoDir = 1;
    var autoLast = null;
    var startX = 0;
    var startPos = 0;

    function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

    /* Resolved twice: once at boot so the frame maths has values, then again
       the moment loading actually starts. At parse time the layout viewport
       may not have settled (pane opening, resizable iframe, or a stage that is
       still zero-height below the fold), which would otherwise lock a phone
       tier onto a desktop screen for the life of the page. Re-resolving is
       free while nothing has loaded yet, and is skipped once frames exist. */
    function resolveTier() {
      if (frames && frames.some(Boolean)) return;
      var wide = (canvas.clientWidth || document.documentElement.clientWidth) > BREAKPOINT;
      var next = wide ? 'desktop' : 'mobile';
      if (next === tierName) return;
      tierName = next;
      count = cfg.counts[tierName];
      dir = cfg.dir + '/' + tierName;
      frames = new Array(count);
      lastDrawn = -1;
    }

    function framePath(i) {
      return dir + '/f' + String(i + 1).padStart(3, '0') + '.webp';
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

    /* ---- drawing ----------------------------------------------------- */

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
       nothing at the edges of frame gets cropped away. */
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

    /* Nearest loaded frame, searching outward — keeps interaction responsive
       while the backfill is still arriving. */
    function nearestLoaded(i) {
      if (frames[i]) return frames[i];
      for (var d = 1; d < count; d++) {
        if (frames[i - d]) return frames[i - d];
        if (frames[i + d]) return frames[i + d];
      }
      return poster;
    }

    function draw(frameFloat, force) {
      var i = clamp(Math.round(frameFloat), 0, count - 1);
      if (i === lastDrawn && !force) return;
      lastDrawn = i;
      paint(nearestLoaded(i));
    }

    /* ---- copy beats (scroll mode only) ------------------------------- */

    var beats = [];

    function buildBeats() {
      if (!overlay || !cfg.beats) return;
      var data = (window.FUNNEL && window.FUNNEL[cfg.beats]) || [];
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
          html += '<p class="beat__hint"><span class="beat__hint-line"></span>' +
                  (b.scrollHint === true ? 'Scroll to disassemble' : b.scrollHint) +
                  '</p>';
        }
        el.innerHTML = html;
        overlay.appendChild(el);
        beats.push({ el: el, from: b.from, to: b.to });
      });
    }

    function beatOpacity(b, p) {
      /* The closing beat holds at full opacity instead of fading out: its band
         ends at exactly 1.0, so fading it would blink the copy — and its CTA —
         out at the moment the reader hits the bottom of the section. */
      var isLast = b.to >= 1;
      if (p <= b.from) return 0;
      if (p >= b.to && !isLast) return 0;
      var fade = (b.to - b.from) * 0.26;
      var fadeIn = (p - b.from) / fade;
      var fadeOut = isLast ? Infinity : (b.to - p) / fade;
      return Math.min(1, fadeIn, fadeOut);
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

    /* ---- scroll driver ----------------------------------------------- */

    function progress() {
      if (isDrag) return pos;
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
        current += diff * cfg.smoothing;
        requestAnimationFrame(tick);
      }
      draw(current);
    }

    function onScroll() {
      var p = progress();
      target = p * (count - 1);
      updateBeats(p);
      stage.style.setProperty('--seq-progress', p.toFixed(4));
      if (!running) {
        running = true;
        requestAnimationFrame(tick);
      }
    }

    /* ---- drag driver -------------------------------------------------- */

    /* No easing here: a turntable should track the finger exactly, or it feels
       like the object is lagging behind the hand. */
    function setPos(p) {
      pos = clamp(p, 0, 1);
      target = current = pos * (count - 1);
      stage.style.setProperty('--seq-progress', pos.toFixed(4));
      if (trackEl) trackEl.style.setProperty('--pos', (pos * 100).toFixed(2) + '%');
      var deg = Math.round(pos * 180);
      canvas.setAttribute('aria-valuenow', String(deg));
      canvas.setAttribute('aria-valuetext', deg + ' degrees rotated');
      draw(current, true);
    }

    function stopAuto() {
      if (autoRAF) { cancelAnimationFrame(autoRAF); autoRAF = null; }
    }

    function markInteracted() {
      if (interacted) return;
      interacted = true;
      stopAuto();
      stage.classList.add('is-touched');
    }

    /* Idle demo: sweep front-to-back and back again so both faces are seen,
       then stop for good the instant the reader takes over. The arc does not
       loop seamlessly (measured first-vs-last difference is high), so this
       ping-pongs rather than wrapping. */
    function startAuto() {
      if (interacted || reduced) return;
      stopAuto();
      autoLast = null;
      autoRAF = requestAnimationFrame(function step(ts) {
        if (interacted) return;
        if (autoLast !== null) {
          /* Clamp the delta: rAF pauses while the tab is hidden, so the first
             frame after returning carries the whole away-time and would
             teleport the camera across the arc. */
          var dt = Math.min(ts - autoLast, 50);
          var next = pos + autoDir * (dt / AUTO_SWEEP_MS);
          if (next >= 1) { next = 1; autoDir = -1; }
          else if (next <= 0) { next = 0; autoDir = 1; }
          setPos(next);
        }
        autoLast = ts;
        autoRAF = requestAnimationFrame(step);
      });
    }

    function onDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true;
      startX = e.clientX;
      startPos = pos;
      markInteracted();
      stage.classList.add('is-grabbing');
      /* Capture keeps the drag alive when the pointer leaves the canvas, but it
         throws if the pointer is already gone — which must not abort the drag. */
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
    }

    function onMove(e) {
      if (!dragging) return;
      var w = canvas.clientWidth || 1;
      setPos(startPos + ((e.clientX - startX) / w) * DRAG_GAIN);
    }

    function onUp() {
      dragging = false;
      stage.classList.remove('is-grabbing');
    }

    function onKey(e) {
      var step = 1 / (count - 1);
      var k = e.key;
      if (k === 'ArrowLeft' || k === 'ArrowDown') setPos(pos - step * 3);
      else if (k === 'ArrowRight' || k === 'ArrowUp') setPos(pos + step * 3);
      else if (k === 'Home') setPos(0);
      else if (k === 'End') setPos(1);
      else if (k === 'PageDown') setPos(pos - step * 12);
      else if (k === 'PageUp') setPos(pos + step * 12);
      else return;
      e.preventDefault();
      markInteracted();
    }

    function initDrag() {
      canvas.setAttribute('role', 'slider');
      canvas.setAttribute('tabindex', '0');
      canvas.setAttribute('aria-valuemin', '0');
      canvas.setAttribute('aria-valuemax', '180');
      setPos(0);

      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onUp);
      canvas.addEventListener('keydown', onKey);
      /* Wheel is intentionally not bound: hijacking it inside a normal-flow
         section would fight the page scroll. */
    }

    /* ---- staged loading ---------------------------------------------- */

    function ladderIndices() {
      var out = [];
      for (var i = 0; i < count; i += cfg.ladderStep) out.push(i);
      var last = count - 1;
      if (out[out.length - 1] !== last) out.push(last);
      return out;
    }

    function loadInto(i) {
      return loadImage(framePath(i))
        .then(function (img) { frames[i] = img; })
        .catch(function () { /* a single dropped frame is survivable */ });
    }

    /* Pool that always picks the pending frame closest to the playhead, so the
       stretch being looked at sharpens before the far end of the sequence. */
    function backfill() {
      var pending = [];
      for (var i = 0; i < count; i++) if (!frames[i]) pending.push(i);
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

    /* ---- boot --------------------------------------------------------- */

    function loadPoster() {
      return loadImage(cfg.poster)
        .then(function (img) {
          poster = img;
          draw(current, true);
        })
        .catch(function () { /* frames will cover it */ });
    }

    function startStatic() {
      /* Reduced motion, scroll mode: no pin, no scroll-jacking. Show the
         settled frame and let every beat sit in normal document flow. */
      resolveTier();
      stage.classList.add('is-static');
      beats.forEach(function (b) {
        b.el.style.opacity = 1;
        b.el.style.visibility = 'visible';
        b.el.style.transform = 'none';
      });
      var idx = Math.round(cfg.staticAt * (count - 1));
      loadInto(idx).then(function () {
        resize();
        draw(idx, true);
      });
    }

    function startAnimated() {
      if (started) return;
      started = true;
      resolveTier();   // layout has settled by now; last chance to get it right

      var ladder = ladderIndices();
      var done = 0;
      setProgressUI(0, ladder.length);

      loadPoster().then(function () {
        return Promise.all(ladder.map(function (i) {
          return loadInto(i).then(function () {
            done++;
            setProgressUI(done, ladder.length);
            draw(current, true);
          });
        }));
      }).then(function () {
        stage.classList.add('is-ready');
        if (isDrag) startAuto();
        return backfill();
      }).then(function () {
        stage.classList.add('is-complete');
      });
    }

    function boot() {
      resolveTier();
      buildBeats();
      resize();

      /* ResizeObserver rather than window.onresize: the canvas can have zero
         layout size at boot (background tab, hidden pane, collapsed ancestor),
         and becoming visible does not fire a window resize event — which would
         leave the bitmap stuck at its 300x150 default. RO fires on observe and
         on every box change, so it covers both. Setting canvas.width does not
         alter the element's box, so this cannot feed back into a loop. */
      if ('ResizeObserver' in window) {
        new ResizeObserver(function () {
          resize();
          if (!isDrag && !reduced) onScroll();
        }).observe(canvas);
      }

      window.addEventListener('resize', function () {
        resize();
        if (!isDrag && !reduced) onScroll();
      });

      if (isDrag) {
        initDrag();
      } else if (reduced) {
        startStatic();
        return;
      } else {
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
      }

      if (cfg.eager || !('IntersectionObserver' in window)) {
        startAnimated();
      } else {
        /* Below the fold: hold off on several MB until the reader is heading
           this way. 150% of viewport gives about 1.5 screens of runway, which
           is enough for the poster and coarse ladder to arrive before the
           stage is actually looked at. */
        var io = new IntersectionObserver(function (entries) {
          if (entries.some(function (e) { return e.isIntersecting; })) {
            io.disconnect();
            startAnimated();
          }
        }, { rootMargin: '150% 0px' });
        io.observe(stage);
      }
    }

    boot();

    /* Handy for verifying the beat/frame mapping in the console. */
    return {
      /* Getters, not snapshots: the tier can be re-resolved after boot. */
      get tier() { return tierName; },
      get count() { return count; },
      get mode() { return cfg.mode; },
      at: function () { return { progress: progress(), frame: Math.round(current) }; },
      loaded: function () { return frames.filter(Boolean).length; },
      /* Jump straight to a position without going through scroll or drag —
         lets you check the mapping even where input is throttled. */
      render: function (p) {
        if (isDrag) { setPos(p); return { progress: pos, frame: Math.round(current) }; }
        target = current = p * (count - 1);
        updateBeats(p);
        stage.style.setProperty('--seq-progress', p.toFixed(4));
        draw(current, true);
        return { progress: p, frame: Math.round(current) };
      },
      seek: function (p) {
        var travel = stage.offsetHeight - window.innerHeight;
        window.scrollTo({ top: stage.offsetTop + travel * p, behavior: 'instant' });
      },
      /* Force loading to begin regardless of the gate. */
      load: startAnimated,
      isAutoRotating: function () { return !!autoRAF; }
    };
  }

  window.__seq = {};
  Array.prototype.forEach.call(
    document.querySelectorAll('[data-seq]'),
    function (stage) {
      var name = stage.getAttribute('data-seq');
      var cfg = SEQUENCES[name];
      if (!cfg) return;
      var inst = createSequence(stage, cfg);
      if (inst) window.__seq[name] = inst;
    }
  );
})();
