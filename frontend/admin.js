/* ════════════════════════════════════════
   Admin Dashboard – TimelessPages
   ════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Auth guard ── */
  const adminToken = localStorage.getItem('timelessPagesAdminToken');
  const adminName = localStorage.getItem('timelessPagesAdminName') || 'Admin';

  if (!adminToken || localStorage.getItem('timelessPagesIsAdmin') !== 'true') {
    window.location.href = 'admin-login.html';
  }

  /* ── DOM refs ── */
  const adminNameEl = document.getElementById('adminName');
  const bookForm = document.getElementById('bookForm');
  const adminFormMessage = document.getElementById('adminFormMessage');
  const booksMessage = document.getElementById('booksMessage');
  const booksList = document.getElementById('booksList');
  const refreshBooksBtn = document.getElementById('refreshBooksButton');
  const logoutBtn = document.getElementById('adminLogoutButton');

  if (adminNameEl) adminNameEl.textContent = adminName;

  /* ── Reactive data ── */
  let allBuyers = [];
  let allSellers = [];

  /* ── API helpers ── */
  function getApiBaseCandidates() {
    var saved = localStorage.getItem('timelessPagesApiBaseUrl');
    var p = window.location.protocol, h = window.location.hostname, port = window.location.port, o = window.location.origin;
    var isHttp = p === 'http:' || p === 'https:';
    var c = [];
    if (saved) c.push(saved.replace(/\/$/, ''));
    if (isHttp && port === '5000') c.push(o);
    if (isHttp && h) c.push(p + '//' + h + ':5000');
    c.push('http://localhost:5000', 'http://127.0.0.1:5000');
    return [...new Set(c)];
  }

  async function getJsonSafely(res) {
    var t = await res.text();
    if (!t) return null;
    try { return JSON.parse(t); } catch { return { message: 'Server returned HTML instead of JSON.' }; }
  }

  async function requestJson(path, opts) {
    opts = opts || {};
    var last = null;
    for (var base of getApiBaseCandidates()) {
      try {
        var res = await fetch(base + path, opts);
        var data = await getJsonSafely(res);
        if (data && data.message && data.message.includes('returned HTML')) throw new Error('HTML response from ' + base);
        localStorage.setItem('timelessPagesApiBaseUrl', base);
        return { response: res, data: data };
      } catch (e) { last = e; }
    }
    throw last || new Error('Cannot reach backend.');
  }

  function formatPrice(p) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(p || 0));
  }

  function setMsg(el, msg, err) {
    if (!el) return;
    el.textContent = msg;
    el.style.color = err ? '#e74c3c' : '#807a70';
  }

  /* ══════════════════════════════════
     SIDEBAR NAVIGATION
     ══════════════════════════════════ */
  document.querySelectorAll('.sidebar-link[data-section]').forEach(function (link) {
    link.addEventListener('click', function () {
      var section = this.getAttribute('data-section');
      document.querySelectorAll('.sidebar-link').forEach(function (l) { l.classList.remove('active'); });
      this.classList.add('active');
      document.querySelectorAll('.section-panel').forEach(function (p) { p.classList.remove('active'); });
      var target = document.getElementById('section-' + section);
      if (target) target.classList.add('active');
    });
  });

  /* ══════════════════════════════════
     TABS (Buyers / Sellers)
     ══════════════════════════════════ */
  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
      var tab = this.getAttribute('data-tab');
      document.querySelectorAll('.tab-content').forEach(function (tc) { tc.style.display = 'none'; tc.classList.remove('active'); });
      var target = document.getElementById('tab-' + tab);
      if (target) { target.style.display = 'block'; target.classList.add('active'); }
    });
  });

  function updateStats(bookCount) {
    // blocked buyers + blocked sellers
    var blocked = allBuyers.filter(function (b) { return b.blocked; }).length +
                  allSellers.filter(function (s) { return s.blocked; }).length;

    if (bookCount !== undefined) {
      document.getElementById('statBooks').textContent = bookCount;
    }
    document.getElementById('statBuyers').textContent = allBuyers.length;
    document.getElementById('statSellers').textContent = allSellers.length;
    document.getElementById('statBlocked').textContent = blocked;
  }

  /* ══════════════════════════════════
     BUYERS TABLE (Live From API)
     ══════════════════════════════════ */
  async function fetchAndRenderBuyers() {
    var tbody = document.getElementById('buyersTable');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="color:var(--db-muted)">Loading real buyers...</td></tr>';

    try {
      var res = await requestJson('/users', {
        headers: { Authorization: 'Bearer ' + adminToken }
      });
      if (!res.response.ok) throw new Error(res.data.message || 'Failed to load buyers');
      
      allBuyers = res.data;
      updateStats();

      if (allBuyers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="color:var(--db-muted)">No registered buyers found.</td></tr>';
        return;
      }

      tbody.innerHTML = allBuyers.map(function (b) {
        var status = b.blocked ? 'blocked' : 'active';
        var statusClass = !b.blocked ? 'badge-active' : 'badge-blocked';
        var toggleLabel = !b.blocked ? 'Block' : 'Unblock';
        var toggleClass = !b.blocked ? 'btn-danger' : 'btn-success';
        var date = b.createdAt ? new Date(b.createdAt).toLocaleDateString() : 'N/A';

        return '<tr>' +
          '<td><strong>' + (b.name || 'Anonymous') + '</strong></td>' +
          '<td>' + (b.email || 'N/A') + '</td>' +
          '<td>' + date + '</td>' +
          '<td><span class="badge ' + statusClass + '">' + status + '</span></td>' +
          '<td><div class="action-group">' +
            '<button class="btn-sm ' + toggleClass + '" data-action="toggle-buyer" data-id="' + b._id + '" data-label="' + toggleLabel + '">' + toggleLabel + '</button>' +
            '<button class="btn-sm btn-danger" data-action="delete-buyer" data-id="' + b._id + '">Delete</button>' +
          '</div></td>' +
        '</tr>';
      }).join('');

      tbody.querySelectorAll('[data-action="toggle-buyer"]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          var id = this.getAttribute('data-id');
          var label = this.getAttribute('data-label');
          this.disabled = true;
          this.textContent = '...';
          try {
            var r = await requestJson('/users/' + id + '/block', {
              method: 'PATCH',
              headers: { Authorization: 'Bearer ' + adminToken }
            });
            if (!r.response.ok) throw new Error(r.data.message);
            addActivity('API', 'Admin', r.data.message);
            await fetchAndRenderBuyers();
          } catch(e) {
            alert('Error toggling block: ' + e.message);
            this.disabled = false;
            this.textContent = label;
          }
        });
      });

      tbody.querySelectorAll('[data-action="delete-buyer"]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          if (!confirm('Permanently delete user account?')) return;
          var id = this.getAttribute('data-id');
          this.disabled = true;
          this.textContent = '...';
          try {
            var r = await requestJson('/users/' + id, {
              method: 'DELETE',
              headers: { Authorization: 'Bearer ' + adminToken }
            });
            if (!r.response.ok) throw new Error(r.data.message);
            addActivity('API', 'Admin', 'Deleted User Account');
            await fetchAndRenderBuyers();
          } catch(e) {
            alert('Error deleting user: ' + e.message);
            this.disabled = false;
            this.textContent = 'Delete';
          }
        });
      });
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="5" style="color:#e74c3c">Error: ' + err.message + '</td></tr>';
      allBuyers = [];
      updateStats();
    }
  }

  /* ══════════════════════════════════
     SELLERS TABLE (Live From API)
     ══════════════════════════════════ */
  async function fetchAndRenderSellers() {
    var tbody = document.getElementById('sellersTable');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" style="color:var(--db-muted)">Loading real sellers...</td></tr>';

    try {
      var res = await requestJson('/sellers', {
        headers: { Authorization: 'Bearer ' + adminToken }
      });
      if (!res.response.ok) throw new Error(res.data.message || 'Failed to load sellers');
      
      allSellers = res.data;
      updateStats();

      if (allSellers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="color:var(--db-muted)">No active sellers found.</td></tr>';
        return;
      }

      tbody.innerHTML = allSellers.map(function (s) {
        var status = s.blocked ? 'blocked' : 'active';
        var statusClass = !s.blocked ? 'badge-active' : 'badge-blocked';
        var toggleLabel = !s.blocked ? 'Block' : 'Unblock';
        var toggleClass = !s.blocked ? 'btn-danger' : 'btn-success';
        var date = new Date(s.createdAt).toLocaleDateString();

        return '<tr>' +
          '<td><strong>' + (s.storeName || s.name || 'Unknown') + '</strong></td>' +
          '<td>' + (s.email || 'N/A') + '</td>' +
          '<td>' + date + '</td>' +
          '<td><span class="badge ' + statusClass + '">' + status + '</span></td>' +
          '<td><div class="action-group">' +
            '<button class="btn-sm ' + toggleClass + '" data-action="toggle-seller" data-id="' + s._id + '" data-label="' + toggleLabel + '">' + toggleLabel + '</button>' +
            '<button class="btn-sm btn-danger" data-action="delete-seller" data-id="' + s._id + '">Delete</button>' +
          '</div></td>' +
        '</tr>';
      }).join('');

      tbody.querySelectorAll('[data-action="toggle-seller"]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          var id = this.getAttribute('data-id');
          var label = this.getAttribute('data-label');
          this.disabled = true;
          this.textContent = '...';
          try {
            var r = await requestJson('/sellers/' + id + '/block', {
              method: 'PATCH',
              headers: { Authorization: 'Bearer ' + adminToken }
            });
            if (!r.response.ok) throw new Error(r.data.message);
            addActivity('API', 'Admin', r.data.message);
            await fetchAndRenderSellers();
          } catch(e) {
            alert('Error toggling block: ' + e.message);
            this.disabled = false;
            this.textContent = label;
          }
        });
      });

      tbody.querySelectorAll('[data-action="delete-seller"]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          if (!confirm('Permanently delete seller?')) return;
          var id = this.getAttribute('data-id');
          this.disabled = true;
          this.textContent = '...';
          try {
            var r = await requestJson('/sellers/' + id, {
              method: 'DELETE',
              headers: { Authorization: 'Bearer ' + adminToken }
            });
            if (!r.response.ok) throw new Error(r.data.message);
            addActivity('API', 'Admin', 'Deleted Seller Account');
            await fetchAndRenderSellers();
          } catch(e) {
            alert('Error deleting seller: ' + e.message);
            this.disabled = false;
            this.textContent = 'Delete';
          }
        });
      });
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="6" style="color:#e74c3c">Error: ' + err.message + '</td></tr>';
      allSellers = [];
      updateStats();
    }
  }

  /* ══════════════════════════════════
     ACTIVITY LOG
     ══════════════════════════════════ */
  function getActivity() { try { return JSON.parse(localStorage.getItem('tp_admin_activity')) || []; } catch { return []; } }
  function saveActivity(a) { localStorage.setItem('tp_admin_activity', JSON.stringify(a)); }

  function addActivity(user, role, action) {
    var list = getActivity();
    var time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    list.unshift({ user: user, role: role, action: action, time: time });
    if (list.length > 20) list = list.slice(0, 20);
    saveActivity(list);
    renderActivity();
  }

  function renderActivity() {
    var list = getActivity();
    var tbody = document.getElementById('activityTable');
    if (!tbody) return;
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="color:var(--db-muted)">No recent activity.</td></tr>';
      return;
    }
    tbody.innerHTML = list.slice(0, 10).map(function (a) {
      var roleClass = a.role === 'Seller' ? 'badge-seller' : 'badge-buyer';
      return '<tr>' +
        '<td>' + a.user + '</td>' +
        '<td><span class="badge ' + roleClass + '">' + a.role + '</span></td>' +
        '<td>' + a.action + '</td>' +
        '<td style="color:var(--db-muted)">' + a.time + '</td>' +
      '</tr>';
    }).join('');
  }

  /* ══════════════════════════════════
     BOOKS / PRODUCTS
     ══════════════════════════════════ */
  /* ══════════════════════════════════
     BOOKS / PRODUCTS (Table View)
     ══════════════════════════════════ */
  function renderBookRow(book) {
    var inStock = book.inStock !== false; // Default to true if undefined
    return '<tr>' +
      '<td>' +
        '<div class="product-cell">' +
          '<img src="' + book.imageUrl + '" alt="' + book.title + '" class="product-thumb">' +
          '<span class="product-name">' + book.title + '</span>' +
        '</div>' +
      '</td>' +
      '<td>' +
        '<span class="book-badge">' + book.category + '</span>' +
      '</td>' +
      '<td class="hide-mobile">' +
        '<strong>' + formatPrice(book.price) + '</strong>' +
      '</td>' +
      '<td>' +
        '<label class="toggle-switch">' +
          '<input type="checkbox" class="toggle-input" ' + (inStock ? 'checked' : '') + ' data-action="toggle-stock" data-id="' + book._id + '">' +
          '<div class="toggle-slider"></div>' +
        '</label>' +
      '</td>' +
      '<td>' +
        '<button class="btn-sm btn-danger" data-action="delete-book" data-id="' + book._id + '">Delete</button>' +
      '</td>' +
    '</tr>';
  }

  async function loadAdminBooks() {
    setMsg(booksMessage, 'Loading books...');
    try {
      var result = await requestJson('/books');
      var books = result.data;
      if (!Array.isArray(books)) throw new Error(books?.message || 'Could not load books');
      if (!result.response.ok) throw new Error('Could not load books');

      if (books.length === 0) {
        booksList.innerHTML = '<tr><td colspan="5" style="color:var(--db-muted); text-align:center; padding: 40px;">No books found in database.</td></tr>';
        setMsg(booksMessage, 'No books found.');
        updateStats(0);
        return;
      }

      booksList.innerHTML = books.map(renderBookRow).join('');
      setMsg(booksMessage, books.length + ' books loaded.');
      updateStats(books.length);

      // Bind Delete Buttons
      booksList.querySelectorAll('[data-action="delete-book"]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          if (!confirm('Permanently delete this book?')) return;
          var bookId = this.getAttribute('data-id');
          this.disabled = true;
          this.textContent = '...';
          try {
            var del = await requestJson('/books/' + bookId, {
              method: 'DELETE',
              headers: { Authorization: 'Bearer ' + adminToken }
            });
            if (!del.response.ok) throw new Error(del.data?.message || 'Failed to delete');
            setMsg(booksMessage, 'Book deleted successfully.');
            addActivity('Admin', 'Admin', 'Deleted book');
            await loadAdminBooks();
          } catch (e) { 
            setMsg(booksMessage, e.message || 'Delete failed.', true); 
            this.disabled = false;
            this.textContent = 'Delete';
          }
        });
      });

      // Bind Toggle Switches
      booksList.querySelectorAll('[data-action="toggle-stock"]').forEach(function (toggle) {
        toggle.addEventListener('change', async function () {
          var bookId = this.getAttribute('data-id');
          var originalState = !this.checked;
          try {
            var res = await requestJson('/books/' + bookId + '/stock', {
              method: 'PATCH',
              headers: { Authorization: 'Bearer ' + adminToken }
            });
            if (!res.response.ok) throw new Error(res.data?.message || 'Failed to toggle status');
            addActivity('Admin', 'Admin', 'Toggled stock for book');
          } catch (e) {
            alert('Error updating stock: ' + e.message);
            this.checked = originalState; // Revert UI on error
          }
        });
      });

    } catch (e) {
      booksList.innerHTML = '<tr><td colspan="5" style="color:var(--db-red); text-align:center; padding: 20px;">' + (e.message || 'Error loading books') + '</td></tr>';
      updateStats(0);
    }
  }

  if (bookForm) {
    bookForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var imageFile = document.getElementById('bookImageFile')?.files[0];
      var imageUrl  = (document.getElementById('bookImageUrl')?.value || '').trim();
      var bookTitle = (document.getElementById('bookTitle')?.value || '').trim();
      if (!imageFile && !imageUrl) {
        setMsg(adminFormMessage, 'Please choose an image file or enter an image URL.', true);
        return;
      }
      try {
        if (imageFile) {
          setMsg(adminFormMessage, 'Uploading image...');
          var fd = new FormData();
          fd.append('image', imageFile);
          var upRes = await requestJson('/upload', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + adminToken },
            body: fd
          });
          if (!upRes.response.ok) throw new Error(upRes.data?.message || 'Image upload failed');
          imageUrl = upRes.data.imageUrl;
        }
        setMsg(adminFormMessage, 'Saving book...');
        var payload = {
          title:       bookTitle,
          author:      (document.getElementById('bookAuthor')?.value || '').trim(),
          price:       Number(document.getElementById('bookPrice')?.value || 0),
          category:    document.getElementById('bookCategory')?.value || '',
          description: (document.getElementById('bookDescription')?.value || '').trim(),
          featured:    !!document.getElementById('bookFeatured')?.checked,
          imageUrl:    imageUrl
        };
        var result = await requestJson('/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
          body: JSON.stringify(payload)
        });
        if (!result.response.ok) throw new Error(result.data?.message || 'Failed to save');
        setMsg(adminFormMessage, 'Book added successfully!');
        bookForm.reset();
        addActivity('Admin', 'Admin', 'Added book: ' + bookTitle);
        loadAdminBooks();
      } catch (e) {
        var apiUrl = localStorage.getItem('timelessPagesApiBaseUrl') || 'http://localhost:5000';
        var msg = e instanceof TypeError ? 'Cannot reach backend at ' + apiUrl : (e.message || 'Could not save.');
        setMsg(adminFormMessage, msg, true);
      }
    });
  }

  /* ── Refresh buttons ── */
  if (refreshBooksBtn) refreshBooksBtn.addEventListener('click', loadAdminBooks);
  document.getElementById('refreshBuyers')?.addEventListener('click', fetchAndRenderBuyers);
  document.getElementById('refreshSellers')?.addEventListener('click', fetchAndRenderSellers);

  /* ── Logout ── */
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function () {
      try { await requestJson('/admin/logout', { method: 'POST' }); } catch (error) {}
      localStorage.removeItem('timelessPagesAdminToken');
      localStorage.removeItem('timelessPagesAdminEmail');
      localStorage.removeItem('timelessPagesAdminName');
      localStorage.removeItem('timelessPagesIsAdmin');
      window.location.href = 'admin-login.html';
    });
  }

  /* ── Init ── */
  fetchAndRenderBuyers();
  fetchAndRenderSellers();
  renderActivity();
  loadAdminBooks();

})();
