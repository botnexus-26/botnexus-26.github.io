const API_BASE = ((window.__CONFIG__ && window.__CONFIG__.API_BASE_URL) || '').replace(/\/+$/, '');
(function () {
  const root = document.documentElement;
  const themeButtons = document.querySelectorAll('[data-theme-toggle]');
  const savedTheme = localStorage.getItem('botnexus-theme');
  const tokenInput = document.querySelector('[data-admin-token]');
  const form = document.querySelector('[data-post-form]');
  const list = document.querySelector('[data-admin-post-list]');
  const setupNotice = document.querySelector('[data-setup-notice]');
  const message = document.querySelector('[data-form-message]');
  const saveState = document.querySelector('[data-save-state]');
  const editorHeading = document.querySelector('[data-editor-heading]');
  const deleteButton = document.querySelector('[data-delete-post]');
  const excerpt = document.querySelector('[data-field="excerpt"]');
  let posts = [];
  let selectedId = '';

  function setTheme(theme) {
    root.dataset.theme = theme;
    localStorage.setItem('botnexus-theme', theme);
    themeButtons.forEach((button) => {
      const dark = theme === 'dark';
      button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      button.querySelector('[data-theme-label]').textContent = dark ? 'Light mode' : 'Dark mode';
      button.querySelector('.theme-icon').textContent = dark ? '☀' : '☾';
    });
  }

  setTheme(savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  themeButtons.forEach((button) => button.addEventListener('click', () => {
    setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
  }));

  function token() {
    return tokenInput.value.trim();
  }

  function headers(json = false) {
    const values = { 'x-blog-admin-token': token() };
    if (json) values['Content-Type'] = 'application/json';
    return values;
  }

  function setMessage(text, type = '') {
    message.textContent = text;
    message.className = `form-message${type ? ` is-${type}` : ''}`;
  }

  function setForm(post = {}) {
    selectedId = post.id || '';
    editorHeading.textContent = selectedId ? 'Edit post' : 'New post';
    deleteButton.hidden = !selectedId;
    saveState.textContent = selectedId ? 'Editing saved post' : 'Not saved';
    form.querySelectorAll('[data-field]').forEach((field) => {
      const key = field.dataset.field;
      if (field.type === 'checkbox') field.checked = post[key] !== false;
      else field.value = post[key] || '';
    });
    updateExcerptCount();
    setMessage('');
  }

  function updateExcerptCount() {
    document.querySelector('[data-excerpt-count]').textContent = `${excerpt.value.length} / 280`;
  }

  function renderList() {
    if (!posts.length) {
      list.innerHTML = '<div class="list-placeholder">No posts yet. Create the first one.</div>';
      return;
    }

    list.innerHTML = posts.map((post) => `
      <div class="admin-post-item${post.id === selectedId ? ' is-selected' : ''}" data-post-id="${post.id}">
        <div class="admin-post-title">${escapeHtml(post.title)}</div>
        <div class="admin-post-meta">${escapeHtml(post.type)} · ${post.published === false ? 'draft' : 'published'}</div>
      </div>`).join('');
    list.querySelectorAll('[data-post-id]').forEach((item) => item.addEventListener('click', () => {
      const post = posts.find((candidate) => candidate.id === item.dataset.postId);
      if (post) setForm(post);
      renderList();
    }));
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[character]));
  }

  async function loadPosts() {
    if (!token()) {
      setMessage('Enter the admin token first.', 'error');
      return;
    }

    setMessage('Loading…');
    const response = await fetch(API_BASE + '/api/blog/posts?includeDrafts=true', { headers: headers() });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.error || 'Could not load posts.', 'error');
      return;
    }

    posts = payload.posts || [];
    sessionStorage.setItem('botnexus-admin-token', token());
    setMessage(`${posts.length} post${posts.length === 1 ? '' : 's'} loaded.`, 'success');
    renderList();
  }

  async function checkSetup() {
    const response = await fetch(API_BASE + '/api/blog/admin/status');
    const payload = await response.json().catch(() => ({}));
    setupNotice.hidden = payload.configured !== false;
  }

  function formData() {
    const data = {};
    form.querySelectorAll('[data-field]').forEach((field) => {
      data[field.dataset.field] = field.type === 'checkbox' ? field.checked : field.value.trim();
    });
    return data;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!token()) {
      setMessage('Enter the admin token first.', 'error');
      return;
    }

    const id = form.querySelector('[data-field="id"]').value;
    const response = await fetch(`${API_BASE}/api/blog/admin/posts${id ? `/${encodeURIComponent(id)}` : ''}`, {
      method: id ? 'PUT' : 'POST',
      headers: headers(true),
      body: JSON.stringify(formData())
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.error || 'Could not save post.', 'error');
      return;
    }

    setMessage('Post saved.', 'success');
    saveState.textContent = 'Saved just now';
    await loadPosts();
    setForm(payload.post);
    renderList();
  });

  deleteButton.addEventListener('click', async () => {
    if (!selectedId || !window.confirm('Delete this post permanently?')) return;

    const response = await fetch(`${API_BASE}/api/blog/admin/posts/${encodeURIComponent(selectedId)}`, {
      method: 'DELETE',
      headers: headers()
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.error || 'Could not delete post.', 'error');
      return;
    }

    setForm();
    await loadPosts();
    setMessage('Post deleted.', 'success');
  });

  document.querySelector('[data-load-posts]').addEventListener('click', loadPosts);
  document.querySelector('[data-new-post]').addEventListener('click', () => {
    setForm();
    renderList();
    document.querySelector('[data-field="title"]').focus();
  });
  excerpt.addEventListener('input', updateExcerptCount);
  tokenInput.value = sessionStorage.getItem('botnexus-admin-token') || '';
  tokenInput.addEventListener('input', () => sessionStorage.setItem('botnexus-admin-token', token()));
  checkSetup();
})();