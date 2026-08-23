/* Scroll-driven image sequences.
 *
 * One factory, two instances:
 *   teardown  the hero. An exploded-view disassembly, loaded eagerly.
 *   lens      mid-page. A push-in through the optics that lands on the bare
 *             sensor, lazy-gated so it costs nothing until you scroll near it.
 *
 * Copy beats are keyed to the frames that prove them, so the 45MP claim lands
 * while the sensor is actually on screen.
 *
 * Loading is staged, because awaiting several MB of frames means a blank stage:
 *   1. poster        paints immediately, the stage is never empty
 *   2. coarse ladder every Nth frame — scroll becomes usable here
 *   3. backfill      the rest, nearest the playhead first
 */
(function () {
  'use strict';

  var CONCURRENCY = 6;   // parallel image requests during backfill
  var BREAKPOINT = '(max-width: 768px)';

  var SEQUENCES = {
    teardown: {
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
      dir: 'assets/frames/lens',
      poster: 'assets/poster-lens.webp',
      counts: { desktop: 240, mobile: 120 },
      beats: 'LENS_BEATS',
      ladderStep: 12,
      // Slightly heavier glide: this is one continuous dolly move rather than
      // discrete parts separating, so it reads better with more inertia.
      smoothing: 0.13,
      staticAt: 1.0,    // reduced-motion still: the bare sensor, the best frame
      eager: false
    }
  };

  function createScrollSequence(stage, cfg) {
    var canvas = stage.querySelector('[data-seq-canvas]');
    var overlay = stage.querySelector('[data-seq-beats]');
    var progressEl = stage.querySelector('[data-seq-progress]');
    if (!canvas || !overlay) return null;

    var ctx = canvas.getContext('2d', { alpha: false });
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var tierName, count, dir;
    var frames;                      // decoded Image objects, sparse

    /* Resolved twice: once at boot so the frame maths has values, then again
       the moment loading actually starts. At parse time the layout viewport
       may not have settled (pane opening, resizable iframe, or a stage that is
       still zero-height below the fold), which would otherwise lock a phone
       tier onto a desktop screen for the life of the page. Re-resolving is
       free while nothing has loaded yet, and is skipped once frames exist. */
    function resolveTier() {
      if (frames && frames.some(Boolean)) return;
      var wide = (canvas.clientWidth || document.documentElement.clientWidth) > 768;
      var next = wide ? 'desktop' : 'mobile';
      if (next === tierName) return;
      tierName = next;
      count = cfg.counts[tierName];
      dir = cfg.dir + '/' + tierName;
      frames = new Array(count);
      lastDrawn = -1;
    }
    var poster = null;
    var target = 0;      // where the scroll says we are, in frame units
    var current = 0;     // eased value actually drawn
    var lastDrawn = -1;
    var running = false;
    var started = false;

    function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

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

    /* Nearest loaded frame, searching outward — lets scroll feel responsive
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

    /* ---- copy beats -------------------------------------------------- */

    var beats = [];

    function buildBeats() {
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

    /* Fades live inside each band, so one beat is fully out before the next
       starts in — no two headlines stacked on top of each other. */
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

    /* ---- scroll ------------------------------------------------------ */

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
       stretch being looked at sharpens before the far end of the timeline. */
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
      /* Reduced motion: no pin, no scroll-jacking. Show the settled frame and
         let every beat sit in normal document flow. */
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
          if (!reduced) onScroll();
        }).observe(canvas);
      }

      window.addEventListener('resize', function () {
        resize();
        if (!reduced) onScroll();
      });

      if (reduced) {
        startStatic();
        return;
      }

      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();

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
      at: function () { return { progress: progress(), frame: Math.round(current) }; },
      loaded: function () { return frames.filter(Boolean).length; },
      /* Jump straight to a progress value without going through scroll — lets
         you check which beat owns which frame even where scroll is throttled. */
      render: function (p) {
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
      load: startAnimated
    };
  }

  window.__seq = {};
  Array.prototype.forEach.call(
    document.querySelectorAll('[data-seq]'),
    function (stage) {
      var name = stage.getAttribute('data-seq');
      var cfg = SEQUENCES[name];
      if (!cfg) return;
      var inst = createScrollSequence(stage, cfg);
      if (inst) window.__seq[name] = inst;
    }
  );
})();
