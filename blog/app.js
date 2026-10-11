(function () {
  const root = document.documentElement;
  const themeButtons = document.querySelectorAll('[data-theme-toggle]');
  const savedTheme = localStorage.getItem('botnexus-theme');

  function setTheme(theme) {
    root.dataset.theme = theme;
    localStorage.setItem('botnexus-theme', theme);
    themeButtons.forEach((button) => {
      const dark = theme === 'dark';
      button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      const label = button.querySelector('[data-theme-label]');
      const icon = button.querySelector('.theme-icon');
      if (label) label.textContent = dark ? 'Light mode' : 'Dark mode';
      if (icon) icon.textContent = dark ? '☀' : '☾';
    });
  }

  setTheme(savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  themeButtons.forEach((button) => {
    button.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));
  });

  const featured = document.querySelector('[data-featured-post]');
  const grid = document.querySelector('[data-post-grid]');
  const empty = document.querySelector('[data-empty-state]');
  const filterButtons = document.querySelectorAll('[data-filter]');
  let posts = [];
  let filter = 'all';

  const labels = {
    update: 'Product update',
    incident: 'Incident',
    maintenance: 'Maintenance'
  };

  const icons = { update: '✦', incident: '!', maintenance: '◌' };

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[character]));
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date(value));
  }

  function statusLabel(status) {
    return String(status || 'operational').replace('-', ' ');
  }

  function postLabel(post) {
    return `${icons[post.type] || '✦'} ${labels[post.type] || 'Update'}`;
  }

  function cardMarkup(post) {
    return `
      <article class="post-card">
        <div class="post-label"><span class="post-type-icon">${escapeHtml(icons[post.type] || '✦')}</span>${escapeHtml(labels[post.type] || 'Update')}</div>
        <h3 class="post-title">${escapeHtml(post.title)}</h3>
        <p class="post-excerpt">${escapeHtml(post.excerpt)}</p>
        <div class="post-footer">
          <time class="post-date" datetime="${escapeHtml(post.publishedAt)}">${escapeHtml(formatDate(post.publishedAt))}</time>
          <span class="post-status status-${escapeHtml(post.status)}">${escapeHtml(statusLabel(post.status))}</span>
        </div>
      </article>`;
  }

  function featuredMarkup(post) {
    return `
      <article class="featured-inner">
        <div>
          <div class="featured-label"><span class="post-type-icon">${escapeHtml(icons[post.type] || '✦')}</span>${escapeHtml(postLabel(post).slice(2))}</div>
          <h2 class="featured-title">${escapeHtml(post.title)}</h2>
          <p class="featured-excerpt">${escapeHtml(post.excerpt)}</p>
        </div>
        <div class="featured-bottom">
          <time class="featured-date" datetime="${escapeHtml(post.publishedAt)}">${escapeHtml(formatDate(post.publishedAt))}</time>
          <a class="read-link" href="#post-${escapeHtml(post.slug)}" data-open-post="${escapeHtml(post.slug)}">Read update&nbsp; →</a>
        </div>
      </article>`;
  }

  function render() {
    const visible = posts.filter((post) => filter === 'all' || post.type === filter);
    const [heroPost, ...otherPosts] = visible;

    if (!heroPost) {
      featured.hidden = true;
      grid.innerHTML = '';
      empty.hidden = false;
      return;
    }

    featured.hidden = false;
    featured.innerHTML = featuredMarkup(heroPost);
    grid.innerHTML = otherPosts.map(cardMarkup).join('');
    empty.hidden = true;
    document.querySelectorAll('[data-open-post]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const post = posts.find((item) => item.slug === link.dataset.openPost);
        if (post) showPost(post);
      });
    });
  }

  function showPost(post) {
    const content = post.content
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
      .join('');
    const modal = document.createElement('div');
    modal.className = 'post-modal';
    modal.innerHTML = `
      <div class="post-modal-backdrop" data-close-modal></div>
      <article class="post-modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button class="modal-close" type="button" aria-label="Close update" data-close-modal>×</button>
        <div class="post-label"><span class="post-type-icon">${escapeHtml(icons[post.type] || '✦')}</span>${escapeHtml(labels[post.type] || 'Update')}</div>
        <h2 id="modal-title">${escapeHtml(post.title)}</h2>
        <time class="post-date" datetime="${escapeHtml(post.publishedAt)}">${escapeHtml(formatDate(post.publishedAt))}</time>
        <div class="modal-content">${content}</div>
      </article>`;
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');
    modal.querySelectorAll('[data-close-modal]').forEach((item) => item.addEventListener('click', () => {
      modal.remove();
      document.body.classList.remove('modal-open');
    }));
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      filter = button.dataset.filter;
      filterButtons.forEach((item) => item.classList.toggle('is-active', item === button));
      render();
    });
  });

  const apiBase = ((window.__CONFIG__ && window.__CONFIG__.API_BASE_URL) || '').replace(/\/+$/, '');
  const postsUrl = apiBase ? `${apiBase}/api/blog/posts` : '/blog/posts.json';

  fetch(postsUrl)
    .then((response) => {
      if (!response.ok) throw new Error('Could not load updates.');
      return response.json();
    })
    .then((payload) => {
      posts = Array.isArray(payload.posts) ? payload.posts : [];
      render();
    })
    .catch(() => {
      featured.hidden = true;
      grid.innerHTML = '<div class="load-error">Updates are temporarily unavailable. Please refresh in a moment.</div>';
    });
})();