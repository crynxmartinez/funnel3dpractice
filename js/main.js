/* Funnel body: renders every section below the hero from data/content.js,
   plus scroll reveals, the spec/FAQ accordions, and the email capture. */
(function () {
  'use strict';

  var F = window.FUNNEL || {};

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function mount(sel) { return document.querySelector(sel); }

  /* ---- benefits ------------------------------------------------------ */

  function renderBenefits() {
    var host = mount('[data-benefits]');
    if (!host || !F.BENEFITS) return;
    F.BENEFITS.forEach(function (b) {
      var card = el('article', 'card reveal');
      var facts = b.facts.map(function (f) {
        return '<li>' + esc(f) + '</li>';
      }).join('');
      card.innerHTML =
        '<p class="card__kicker">' + esc(b.kicker) + '</p>' +
        '<h3 class="card__title">' + esc(b.title) + '</h3>' +
        '<p class="card__body">' + esc(b.body) + '</p>' +
        '<ul class="card__facts">' + facts + '</ul>';
      host.appendChild(card);
    });
  }

  /* ---- use cases ----------------------------------------------------- */

  function renderCases() {
    var host = mount('[data-cases]');
    if (!host || !F.USE_CASES) return;
    F.USE_CASES.forEach(function (c) {
      var card = el('article', 'case reveal');
      card.innerHTML =
        '<h3 class="case__title">' + esc(c.title) + '</h3>' +
        '<p class="case__body">' + esc(c.body) + '</p>' +
        '<blockquote class="case__quote is-placeholder">' +
          '<p>' + esc(c.quote) + '</p>' +
          '<cite>' + esc(c.attrib) + '</cite>' +
        '</blockquote>';
      host.appendChild(card);
    });
  }

  /* ---- comparison ---------------------------------------------------- */

  function renderComparison() {
    var host = mount('[data-comparison]');
    if (!host || !F.COMPARISON) return;
    var c = F.COMPARISON;
    var hi = c.highlightCol;

    var head = c.columns.map(function (h, i) {
      var cls = i === hi ? ' class="is-hero"' : '';
      return '<th scope="col"' + cls + '>' + esc(h) + '</th>';
    }).join('');

    var body = c.rows.map(function (r) {
      var cells = r.map(function (v, i) {
        if (i === 0) return '<th scope="row">' + esc(v) + '</th>';
        return '<td' + (i === hi ? ' class="is-hero"' : '') + '>' + esc(v) + '</td>';
      }).join('');
      return '<tr>' + cells + '</tr>';
    }).join('');

    host.innerHTML =
      '<table class="cmp"><caption class="sr-only">Canon EOS R5 compared with EOS R5 Mark II' +
      '</caption><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table>';
  }

  /* ---- specs (accordion, first group open) --------------------------- */

  function renderSpecs() {
    var host = mount('[data-specs]');
    if (!host || !F.SPECS) return;
    F.SPECS.forEach(function (group, gi) {
      var rows = group[1].map(function (r) {
        return '<div class="spec"><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>';
      }).join('');
      var d = el('details', 'acc');
      if (gi === 0) d.open = true;
      d.innerHTML =
        '<summary class="acc__head"><span>' + esc(group[0]) + '</span>' +
        '<svg class="acc__icon" viewBox="0 0 16 16" aria-hidden="true">' +
        '<path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>' +
        '</summary><dl class="acc__body">' + rows + '</dl>';
      host.appendChild(d);
    });
  }

  /* ---- offer --------------------------------------------------------- */

  function renderOffer() {
    var host = mount('[data-offers]');
    if (!host || !F.OFFER) return;
    var o = F.OFFER;

    [o.primary, o.bundle].forEach(function (p, i) {
      var card = el('article', 'offer reveal' + (i === 1 ? ' offer--featured' : ''));
      var inc = p.includes.map(function (x) {
        return '<li>' + esc(x) + '</li>';
      }).join('');
      card.innerHTML =
        (p.badge ? '<span class="offer__badge">' + esc(p.badge) + '</span>' : '') +
        '<h3 class="offer__name">' + esc(p.name) + '</h3>' +
        '<p class="offer__price">' + esc(p.price) + '</p>' +
        '<p class="offer__note">' + esc(p.note) + '</p>' +
        '<ul class="offer__inc">' + inc + '</ul>' +
        '<button class="btn btn--primary btn--block" type="button" data-buy>' +
        'Add to cart</button>';
      host.appendChild(card);
    });

    var re = mount('[data-reassure]');
    if (re && o.reassurance) {
      o.reassurance.forEach(function (r) {
        re.appendChild(el('li', null,
          '<strong>' + esc(r[0]) + '</strong><span>' + esc(r[1]) + '</span>'));
      });
    }

    // TODO: wire to a real cart/checkout endpoint. Non-functional in this demo.
    host.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-buy]');
      if (!btn) return;
      var original = btn.textContent;
      btn.textContent = 'Demo only — no checkout wired';
      btn.disabled = true;
      setTimeout(function () {
        btn.textContent = original;
        btn.disabled = false;
      }, 2200);
    });
  }

  /* ---- FAQ ----------------------------------------------------------- */

  function renderFaq() {
    var host = mount('[data-faq]');
    if (!host || !F.FAQS) return;
    F.FAQS.forEach(function (f) {
      var d = el('details', 'acc');
      d.innerHTML =
        '<summary class="acc__head"><span>' + esc(f.q) + '</span>' +
        '<svg class="acc__icon" viewBox="0 0 16 16" aria-hidden="true">' +
        '<path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>' +
        '</summary><div class="acc__body acc__body--prose"><p>' + esc(f.a) + '</p></div>';
      host.appendChild(d);
    });
  }

  /* ---- email capture ------------------------------------------------- */

  function initCapture() {
    var form = mount('[data-capture]');
    if (!form) return;
    var msg = form.querySelector('[data-capture-msg]');
    var input = form.querySelector('input[type=email]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.trim();
      // Deliberately loose: catches typos without rejecting valid odd addresses.
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
      form.classList.toggle('is-invalid', !ok);
      if (!ok) {
        msg.textContent = 'That does not look like an email address.';
        input.focus();
        return;
      }
      // TODO: POST to a real list endpoint. Nothing leaves the browser here.
      msg.textContent = 'Saved locally — this demo has no mailing list wired up.';
      form.classList.add('is-done');
      input.value = '';
    });
  }

  /* ---- scroll reveals ------------------------------------------------ */

  function initReveals() {
    var items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      items.forEach(function (n) { n.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    items.forEach(function (n, i) {
      n.style.setProperty('--delay', (i % 3) * 70 + 'ms');
      io.observe(n);
    });
  }

  /* ---- chrome: topbar + sticky mobile CTA ---------------------------- */

  function initChrome() {
    var bar = mount('[data-stickybar]');
    var top = mount('[data-topbar]');
    var hero = mount('[data-seq="teardown"]');
    if (!hero) return;

    function update() {
      var past = window.scrollY > hero.offsetHeight - window.innerHeight * 0.5;
      if (bar) bar.classList.toggle('is-up', past);
      if (top) top.classList.toggle('is-solid', window.scrollY > window.innerHeight * 0.6);
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ---- boot ---------------------------------------------------------- */

  renderBenefits();
  renderCases();
  renderComparison();
  renderSpecs();
  renderOffer();
  renderFaq();
  initCapture();
  initReveals();
  initChrome();
})();
