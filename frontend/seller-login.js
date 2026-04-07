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
  var currentLoginEmail = '';

  function resolveSellerNextPath() {
    return requestedNextPath === '/seller-dashboard.html' ? 'seller-dashboard.html' : 'seller-dashboard.html';
  }

  window.switchTab = function (tab) {
    tabLogin.classList.toggle('active', tab === 'login');
    tabSignup.classList.toggle('active', tab === 'signup');
    
    loginPanel.classList.toggle('hidden', tab !== 'login');
    signupPanel.classList.toggle('hidden', tab !== 'signup');
    document.getElementById('otpPanel').classList.toggle('hidden', tab !== 'otp');

    if (tab === 'login') {
      loginMsg.textContent = '';
      loginMsg.className = 'form-message';
    } else if (tab === 'signup') {
      signupMsg.textContent = '';
      signupMsg.className = 'form-message';
    }
  };

  function setMsg(elId, text, type) {
    var el = typeof elId === 'string' ? document.getElementById(elId) : elId;
    if (!el) return;
    el.textContent = text;
    el.className = 'form-message ' + type;
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
        setMsg(loginMsg, 'Please fill in both email and password.', 'error');
        return;
      }

      setMsg(loginMsg, 'Connecting...', 'info');
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

        setMsg(loginMsg, 'Welcome ' + data.seller.storeName + '!', 'success');
        localStorage.setItem('tp_sellerToken', data.token);
        localStorage.setItem('tp_sellerId', data.seller.id);
        localStorage.setItem('tp_sellerName', data.seller.name);
        localStorage.setItem('tp_sellerStore', data.seller.storeName);
        localStorage.setItem('tp_sellerEmail', data.seller.email);

        setTimeout(function () {
          window.location.href = resolveSellerNextPath();
        }, 1000);

      } catch (err) {
        setMsg(loginMsg, err.message, 'error');
        loginBtn.disabled = false;
      }
    });
  }

  // Handle Forgot Password
  var forgotPwdBtn = document.getElementById('forgotPwdBtn');
  forgotPwdBtn?.addEventListener('click', async function() {
    var email = document.getElementById('loginEmail').value.trim();
    if (!email) {
      setMsg(loginMsg, 'Please enter your business email first.', 'error');
      return;
    }

    forgotPwdBtn.disabled = true;
    setMsg(loginMsg, 'Sending security code...', 'info');

    try {
      var res = await fetch(apiUrl + '/seller-send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      });
      var data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to send OTP.');

      currentLoginEmail = email;
      switchTab('otp');
      setMsg('otpMsg', 'Verification code sent to ' + email, 'success');
    } catch (err) {
      setMsg(loginMsg, err.message, 'error');
    } finally {
      forgotPwdBtn.disabled = false;
    }
  });

  // Handle OTP Verification
  var otpForm = document.getElementById('otpForm');
  otpForm?.addEventListener('submit', async function(e) {
    e.preventDefault();
    var otp = document.getElementById('otpCode').value.trim();
    var newPassword = document.getElementById('resetPassword').value;
    var otpBtn = document.getElementById('otpBtn');

    if (!otp || newPassword.length < 6) {
      setMsg('otpMsg', 'Please enter the code and a new password (min 6 chars).', 'error');
      return;
    }

    otpBtn.disabled = true;
    setMsg('otpMsg', 'Verifying...', 'info');

    try {
      var res = await fetch(apiUrl + '/seller-verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentLoginEmail, otp: otp, newPassword: newPassword })
      });
      var data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Verification failed.');

      setMsg('otpMsg', '✓ Success! Dashboard access granted.', 'success');
      localStorage.setItem('tp_sellerToken', data.token);
      localStorage.setItem('tp_sellerId', data.seller.id);
      localStorage.setItem('tp_sellerName', data.seller.name);
      localStorage.setItem('tp_sellerStore', data.seller.storeName);
      localStorage.setItem('tp_sellerEmail', data.seller.email);

      setTimeout(function () {
        window.location.href = resolveSellerNextPath();
      }, 1000);
    } catch (err) {
      setMsg('otpMsg', err.message, 'error');
      otpBtn.disabled = false;
    }
  });

  // Handle Resend
  var resendBtn = document.getElementById('resendOtpBtn');
  resendBtn?.addEventListener('click', async function() {
    if (!currentLoginEmail) return;
    setMsg('otpMsg', 'Resending...', 'info');
    resendBtn.disabled = true;
    try {
      await fetch(apiUrl + '/seller-send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentLoginEmail })
      });
      setMsg('otpMsg', 'A new code has been sent.', 'success');
    } catch(err) {
      setMsg('otpMsg', 'Failed to resend.', 'error');
    } finally {
      setTimeout(function() { resendBtn.disabled = false; }, 3000);
    }
  });

  // Handle Signup
  if (signupForm) {
    signupForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var name = document.getElementById('signupName').value.trim();
      var email = document.getElementById('signupEmail').value.trim();
      var storeName = document.getElementById('signupStore').value.trim();
      var password = document.getElementById('signupPassword').value;

      if (!name || !email || !storeName || !password) {
        setMsg(signupMsg, 'All fields are required.', 'error');
        return;
      }
      if (password.length < 6) {
        setMsg(signupMsg, 'Password must be at least 6 characters.', 'error');
        return;
      }

      setMsg(signupMsg, 'Creating store...', 'info');
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

        setMsg(signupMsg, 'Registration successful! Switching to login...', 'success');
        
        setTimeout(function () {
          document.getElementById('loginEmail').value = email;
          document.getElementById('loginPassword').value = '';
          switchTab('login');
          signupBtn.disabled = false;
          signupForm.reset();
        }, 1500);

      } catch (err) {
        setMsg(signupMsg, err.message, 'error');
        signupBtn.disabled = false;
      }
    });
  }

  if (loginParams.get('reason') === 'protected') {
    setMsg(loginMsg, 'Please log in first. Direct seller URL access is blocked.', 'error');
  }

})();
