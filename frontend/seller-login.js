(function () {
  var apiUrl = localStorage.getItem('timelessPagesApiBaseUrl') || 'http://localhost:5000';
  var loginParams = new URLSearchParams(window.location.search);
  var requestedNextPath = loginParams.get('next') || '';

  if (loginParams.get('reason') === 'protected') {
    localStorage.removeItem('tp_sellerToken');
    localStorage.removeItem('tp_sellerId');
    localStorage.removeItem('tp_sellerName');
    localStorage.removeItem('tp_sellerStore');
    localStorage.removeItem('tp_sellerEmail');
  }

  var tabLogin = document.getElementById('tabLogin');
  var tabSignup = document.getElementById('tabSignup');
  var loginPanel = document.getElementById('loginPanel');
  var signupPanel = document.getElementById('signupPanel');

  var loginForm = document.getElementById('loginForm');
  var signupForm = document.getElementById('signupForm');
  var loginMsg = document.getElementById('loginMsg');
  var signupMsg = document.getElementById('signupMsg');
  var loginBtn = document.getElementById('loginBtn');
  var signupBtn = document.getElementById('signupBtn');

  function resolveSellerNextPath() {
    return requestedNextPath === '/seller-dashboard.html' ? 'seller-dashboard.html' : 'seller-dashboard.html';
  }

  window.switchTab = function (tab) {
    if (tab === 'login') {
      tabLogin.classList.add('active');
      tabSignup.classList.remove('active');
      loginPanel.classList.remove('hidden');
      signupPanel.classList.add('hidden');
      loginMsg.textContent = '';
      loginMsg.className = 'form-message';
    } else {
      tabSignup.classList.add('active');
      tabLogin.classList.remove('active');
      signupPanel.classList.remove('hidden');
      loginPanel.classList.add('hidden');
      signupMsg.textContent = '';
      signupMsg.className = 'form-message';
    }
  };

  function setMsg(el, text, isError) {
    el.textContent = text;
    el.className = 'form-message ' + (isError ? 'error' : 'success');
  }

  function htmlToText(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    return d.textContent || d.innerText || '';
  }

  // Handle Login
  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var email = document.getElementById('loginEmail').value.trim();
      var password = document.getElementById('loginPassword').value;

      if (!email || !password) {
        setMsg(loginMsg, 'Please fill in both email and password.', true);
        return;
      }

      setMsg(loginMsg, 'Connecting...', false);
      loginBtn.disabled = true;

      try {
        var res = await fetch(apiUrl + '/seller-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, password: password })
        });

        var text = await res.text();
        var data;
        try { data = JSON.parse(text); } catch(ex) { data = { message: htmlToText(text) || 'Unknown error occurred from server.' }; }

        if (!res.ok) {
          throw new Error(data.message || 'Login failed.');
        }

        setMsg(loginMsg, 'Welcome ' + data.seller.storeName + '!', false);
        localStorage.setItem('tp_sellerToken', data.token);
        localStorage.setItem('tp_sellerId', data.seller.id);
        localStorage.setItem('tp_sellerName', data.seller.name);
        localStorage.setItem('tp_sellerStore', data.seller.storeName);
        localStorage.setItem('tp_sellerEmail', data.seller.email);

        setTimeout(function () {
          window.location.href = resolveSellerNextPath();
        }, 1000);

      } catch (err) {
        setMsg(loginMsg, err.message, true);
        loginBtn.disabled = false;
      }
    });
  }

  // Handle Signup
  if (signupForm) {
    signupForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var name = document.getElementById('signupName').value.trim();
      var email = document.getElementById('signupEmail').value.trim();
      var storeName = document.getElementById('signupStore').value.trim();
      var password = document.getElementById('signupPassword').value;

      if (!name || !email || !storeName || !password) {
        setMsg(signupMsg, 'All fields are required.', true);
        return;
      }
      if (password.length < 6) {
        setMsg(signupMsg, 'Password must be at least 6 characters.', true);
        return;
      }

      setMsg(signupMsg, 'Creating store...', false);
      signupBtn.disabled = true;

      try {
        var res = await fetch(apiUrl + '/seller-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name, email: email, storeName: storeName, password: password })
        });

        var text = await res.text();
        var data;
        try { data = JSON.parse(text); } catch(ex) { data = { message: htmlToText(text) || 'Unknown server error.' }; }

        if (!res.ok) {
          throw new Error(data.message || 'Failed to create account.');
        }

        setMsg(signupMsg, 'Registration successful! Switching to login...', false);
        
        setTimeout(function () {
          document.getElementById('loginEmail').value = email;
          document.getElementById('loginPassword').value = '';
          switchTab('login');
          signupBtn.disabled = false;
          signupForm.reset();
        }, 1500);

      } catch (err) {
        setMsg(signupMsg, err.message, true);
        signupBtn.disabled = false;
      }
    });
  }

  if (loginParams.get('reason') === 'protected') {
    setMsg(loginMsg, 'Please log in first. Direct seller URL access is blocked.', true);
  }

})();
