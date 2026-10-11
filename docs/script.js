// ==========================================================================
// BotNexus Docs — shared behavior
// ==========================================================================

(function () {
  var STORAGE_KEY = 'botnexus-docs-theme';
  var root = document.documentElement;
  var saved = localStorage.getItem(STORAGE_KEY);
  // Dark is the site's default look; only deviate if the visitor previously
  // chose light mode via the toggle (persisted in localStorage).
  root.setAttribute('data-theme', saved || 'dark');

  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var current = root.getAttribute('data-theme');
        var next = current === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        localStorage.setItem(STORAGE_KEY, next);
      });
    }

    var menuBtn = document.getElementById('menu-toggle');
    var sidebar = document.getElementById('sidebar');
    if (menuBtn && sidebar) {
      menuBtn.addEventListener('click', function () {
        sidebar.classList.toggle('open');
      });
      document.addEventListener('click', function (e) {
        if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      });
    }

    initSearch();
    initScrollspy();
  });

  // --- Search -------------------------------------------------------------
  function initSearch() {
    var input = document.getElementById('search-input');
    var results = document.getElementById('search-results');
    var container = document.getElementById('topbar-search');
    var mobileBtn = document.getElementById('search-mobile-btn');
    var closeBtn = document.getElementById('search-close-btn');

    if (mobileBtn && container) {
      mobileBtn.addEventListener('click', function () {
        container.classList.add('mobile-open');
        if (input) { input.focus(); }
      });
    }
    if (closeBtn && container) {
      closeBtn.addEventListener('click', function () {
        container.classList.remove('mobile-open');
        if (results) results.classList.remove('open');
        if (input) { input.value = ''; input.blur(); }
      });
    }

    if (!input || !results || typeof SEARCH_INDEX === 'undefined') return;

    function render(items) {
      if (!items.length) {
        results.innerHTML = '<div class="sr-empty">No results found.</div>';
        results.classList.add('open');
        return;
      }
      results.innerHTML = items
        .slice(0, 8)
        .map(function (item) {
          return (
            '<a href="' + item.url + '">' +
            '<div class="sr-title">' + item.title + '</div>' +
            '<div class="sr-section">' + item.section + '</div>' +
            '</a>'
          );
        })
        .join('');
      results.classList.add('open');
    }

    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      if (!q) { results.classList.remove('open'); return; }
      var matches = SEARCH_INDEX.filter(function (item) {
        return item.title.toLowerCase().indexOf(q) !== -1 ||
               item.section.toLowerCase().indexOf(q) !== -1 ||
               (item.keywords && item.keywords.toLowerCase().indexOf(q) !== -1);
      });
      render(matches);
    });

    input.addEventListener('focus', function () {
      if (input.value.trim()) results.classList.add('open');
    });

    document.addEventListener('click', function (e) {
      if (!input.contains(e.target) && !results.contains(e.target)) {
        results.classList.remove('open');
      }
      if (container && container.classList.contains('mobile-open') &&
          !container.contains(e.target) && !(mobileBtn && mobileBtn.contains(e.target))) {
        container.classList.remove('mobile-open');
      }
    });

    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        input.focus();
      }
      if (e.key === 'Escape') {
        results.classList.remove('open');
        if (container) container.classList.remove('mobile-open');
        input.blur();
      }
    });
  }

  // --- Scrollspy for right-hand "On this page" -----------------------------
  function initScrollspy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.toc-list a'));
    if (!links.length) return;
    var targets = links
      .map(function (a) {
        var id = a.getAttribute('href').split('#')[1];
        return { link: a, el: id ? document.getElementById(id) : null };
      })
      .filter(function (t) { return t.el; });

    if (!targets.length) return;

    function onScroll() {
      var pos = window.scrollY + 100;
      var current = targets[0];
      targets.forEach(function (t) {
        if (t.el.offsetTop <= pos) current = t;
      });
      links.forEach(function (a) { a.classList.remove('active'); });
      current.link.classList.add('active');
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();
