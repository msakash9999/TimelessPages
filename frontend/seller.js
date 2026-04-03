(function () {
  var apiUrl = localStorage.getItem('timelessPagesApiBaseUrl') || 'http://localhost:5000';
  var sellerToken = localStorage.getItem('tp_sellerToken');
  var sellerId = localStorage.getItem('tp_sellerId');
  var sellerName = localStorage.getItem('tp_sellerName');
  var sellerStore = localStorage.getItem('tp_sellerStore');

  // Must be logged in
  if (!sellerToken || !sellerId) {
    window.location.href = 'seller-login.html';
    return;
  }

  // Set Nav Info
  var greeting = document.getElementById('sellerGreeting');
  if (greeting) greeting.textContent = 'Welcome, ' + (sellerStore || sellerName);

  document.getElementById('logoutBtn')?.addEventListener('click', async function () {
    try {
      await fetch(apiUrl + '/seller/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Seller logout request failed:', error);
    }
    localStorage.removeItem('tp_sellerToken');
    localStorage.removeItem('tp_sellerId');
    localStorage.removeItem('tp_sellerName');
    localStorage.removeItem('tp_sellerStore');
    localStorage.removeItem('tp_sellerEmail');
    window.location.href = 'seller-login.html';
  });

  /* ── DOM Elements ── */
  var bookForm = document.getElementById('sellerBookForm');
  var formMessage = document.getElementById('sellerFormMessage');
  var booksList = document.getElementById('booksList');

  // Helper for requests
  async function requestJson(endpoint, options) {
    options = options || {};
    options.headers = options.headers || {};
    options.headers.Authorization = 'Bearer ' + sellerToken;
    
    var res = await fetch(apiUrl + endpoint, options);
    var text = await res.text();
    var data;
    try { data = JSON.parse(text); } catch(e) { data = { message: text || 'Unknown response' }; }
    return { response: res, data: data };
  }

  function setMsg(msgText, isError) {
    if (!formMessage) return;
    formMessage.textContent = msgText;
    formMessage.className = 'panel-message ' + (isError ? 'error' : 'success');
  }

  /* ── My Catalog ── */
  async function loadSellerBooks() {
    booksList.innerHTML = '<p style="color:var(--text-muted); grid-column: 1/-1;">Loading your catalog...</p>';
    
    try {
      var res = await requestJson('/books?sellerId=' + sellerId);
      if (!res.response.ok) throw new Error(res.data.message || 'Failed to load books');
      
      var books = res.data;
      if (books.length === 0) {
        booksList.innerHTML = '<p style="color:var(--text-muted); grid-column: 1/-1;">You haven\'t published any books yet.</p>';
        return;
      }

      booksList.innerHTML = books.map(function(book) {
        return '<article class="mini-book-card">' +
          '<img src="' + (book.imageUrl || 'assets/placeholder.png') + '" alt="' + book.title + '">' +
          '<h3>' + book.title + '</h3>' +
          '<p class="price">₹' + book.price + '</p>' +
          '<button class="logout-btn" style="margin-top:10px; width:100%" data-delete="' + book._id + '">Delete</button>' +
        '</article>';
      }).join('');

      // Bind delete buttons
      booksList.querySelectorAll('[data-delete]').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          if (!confirm('Delete this book permanently?')) return;
          var id = this.getAttribute('data-delete');
          this.disabled = true;
          this.textContent = '...';
          try {
            var del = await requestJson('/books/' + id, { method: 'DELETE' });
            if (!del.response.ok) throw new Error(del.data.message || 'Delete failed');
            loadSellerBooks();
          } catch(e) {
            alert('Could not delete: ' + e.message);
            this.textContent = 'Delete';
            this.disabled = false;
          }
        });
      });

    } catch (err) {
      booksList.innerHTML = '<p style="color:var(--danger); grid-column: 1/-1;">Error: ' + err.message + '</p>';
    }
  }

  /* ── Submit Book ── */
  if (bookForm) {
    bookForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      var imageFile = document.getElementById('bookImageFile')?.files[0];
      var imageUrl  = (document.getElementById('bookImageUrl')?.value || '').trim();
      var bookTitle = (document.getElementById('bookTitle')?.value || '').trim();

      if (!imageFile && !imageUrl) {
        setMsg('Please choose an image file or enter an image URL.', true);
        return;
      }

      try {
        var finalImageUrl = imageUrl;

        // Step 1: upload image file to Cloudinary
        if (imageFile) {
          setMsg('Uploading cover image...');
          var fd = new FormData();
          fd.append('image', imageFile);
          var upRes = await fetch(apiUrl + '/upload', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + sellerToken },
            body: fd
          });
          var upData = await upRes.json();
          if (!upRes.ok) throw new Error(upData.message || 'Upload failed');
          finalImageUrl = upData.imageUrl;
        }

        // Step 2: save book
        setMsg('Publishing book...');
        var payload = {
          title: bookTitle,
          author: document.getElementById('bookAuthor')?.value || '',
          price: Number(document.getElementById('bookPrice')?.value || 0),
          category: document.getElementById('bookCategory')?.value || '',
          imageUrl: finalImageUrl,
          description: document.getElementById('bookDescription')?.value || ''
        };

        var saveRes = await requestJson('/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!saveRes.response.ok) throw new Error(saveRes.data.message || 'Failed to publish');
        
        setMsg('Book published successfully!');
        bookForm.reset();
        document.getElementById('bookImageUrl').value = '';
        loadSellerBooks();

      } catch (err) {
        setMsg(err.message || 'Publishing failed.', true);
      }
    });
  }

  // Init
  loadSellerBooks();

})();
