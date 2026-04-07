/* ════════════════════════════════════════
   TimelessPages – Login / Sign Up Logic
   ════════════════════════════════════════ */
(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const requestedNextPath = params.get('next') || '';
  const allowedNextPaths = new Set(['/index.html', '/book.html']);

  function resolveNextPath(defaultPath) {
    if (!requestedNextPath) {
      return defaultPath;
    }

    if (allowedNextPaths.has(requestedNextPath)) {
      return requestedNextPath.slice(1);
    }

    return defaultPath;
  }

  /* ── Redirect if already logged in ── */
  if (localStorage.getItem('timelessPagesLoggedIn') === 'true') {
    window.location.href = resolveNextPath('index.html');
    return;
  }

  /* ── API helpers ── */
  function getApiBaseCandidates() {
    const saved = localStorage.getItem('timelessPagesApiBaseUrl');
    const { protocol, hostname, port, origin } = window.location;
    const isHttp = protocol === 'http:' || protocol === 'https:';
    const c = [];
    if (saved) c.push(saved.replace(/\/$/, ''));
    if (isHttp && port === '5000') c.push(origin);
    if (isHttp && hostname) c.push(`${protocol}//${hostname}:5000`);
    c.push('http://localhost:5000', 'http://127.0.0.1:5000');
    return [...new Set(c)];
  }

  async function getJsonSafely(res) {
    const text = await res.text();
    if (!text) return null;
    if (text.trim().startsWith('<')) {
      return { message: 'Server error — route not found. Please restart the backend.' };
    }
    try { return JSON.parse(text); } catch { return { message: text }; }
  }

  async function requestJson(path, opts = {}) {
    let last = null;
    for (const base of getApiBaseCandidates()) {
      try {
        const res  = await fetch(base + path, opts);
        const data = await getJsonSafely(res);
        localStorage.setItem('timelessPagesApiBaseUrl', base);
        return { response: res, data };
      } catch (e) { last = e; }
    }
    throw last || new Error('Cannot reach the backend server.');
  }

  /* ── Tab switching ── */
  window.switchTab = function (tab) {
    document.getElementById('tabLogin').classList.toggle('active',  tab === 'login');
    document.getElementById('tabSignup').classList.toggle('active', tab === 'signup');
    
    document.getElementById('loginPanel').classList.toggle('hidden',  tab !== 'login');
    document.getElementById('signupPanel').classList.toggle('hidden', tab !== 'signup');
    document.getElementById('otpPanel').classList.toggle('hidden',    tab !== 'otp');
    
    const panel = document.getElementById(`${tab}Panel`);
    if(panel) {
      panel.style.animation = 'none';
      requestAnimationFrame(() => { panel.style.animation = ''; });
    }
  };

  (function showVerificationStatus() {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get('verified');
    const message = params.get('message');

    if (!verified || !message) {
      return;
    }

    window.switchTab('login');
    setMsg('loginMsg', message, verified === 'success' ? 'success' : 'error');
    window.history.replaceState({}, document.title, window.location.pathname);
  })();

  /* ── Message helper ── */
  function setMsg(id, text, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = `form-message ${type}`;
  }

  function resetOtpState() {
    const otpCode = document.getElementById('otpCode');
    const resetPassword = document.getElementById('resetPassword');
    const otpSub = document.getElementById('otpSub');
    const otpBtn = document.getElementById('otpBtn');
    if (otpCode) otpCode.value = '';
    if (resetPassword) resetPassword.value = '';
    if (otpSub) otpSub.textContent = 'Verify your email and set a new password to continue.';
    if (otpBtn) otpBtn.textContent = 'Verify & Reset Password';
    setMsg('otpMsg', '', '');
  }

  /* ── Session helpers ── */
  function clearAdminSession() {
    ['timelessPagesAdminToken', 'timelessPagesAdminEmail',
     'timelessPagesAdminName', 'timelessPagesIsAdmin'].forEach(k => localStorage.removeItem(k));
  }

  function saveUserSession(name, email, token, cart = [], wishlist = []) {
    clearAdminSession();
    localStorage.setItem('timelessPagesLoggedIn',  'true');
    localStorage.setItem('timelessPagesUserName',  name);
    localStorage.setItem('timelessPagesUserEmail', email);
    localStorage.setItem('timelessPagesUserToken', token);
    localStorage.setItem('timelessPagesCart', JSON.stringify(cart));
    localStorage.setItem('timelessPagesWishlist', JSON.stringify(wishlist));
  }

  /* ════════════════════════════════════════
     LOGIN FORM
     ════════════════════════════════════════ */
  const loginForm = document.getElementById('loginForm');
  const loginBtn  = document.getElementById('loginBtn');
  let currentLoginEmail = '';

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;

    if (!email || !password) {
      setMsg('loginMsg', 'Please enter your email and password.', 'error');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';
    setMsg('loginMsg', '', '');

    try {
      const { response, data } = await requestJson('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error(data?.message || 'Login failed.');
      }

      saveUserSession(data.user.name, data.user.email, data.token, data.user.cart, data.user.wishlist);
      setMsg('loginMsg', '✓ Logged in! Redirecting...', 'success');
      setTimeout(() => { window.location.href = resolveNextPath('index.html'); }, 700);

    } catch (err) {
      setMsg('loginMsg', err.message || 'Could not connect to server.', 'error');
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In';
    }
  });

  const forgotPwdBtn = document.getElementById('forgotPwdBtn');
  forgotPwdBtn?.addEventListener('click', async () => {
    const email = document.getElementById('loginEmail')?.value.trim();
    if (!email) {
      setMsg('loginMsg', 'Please enter your email address first.', 'error');
      return;
    }

    forgotPwdBtn.disabled = true;
    setMsg('loginMsg', 'Sending verification code...', 'info');

    try {
      const { response, data } = await requestJson('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to send OTP.');
      }

      currentLoginEmail = email; // Store for OTP verification
      window.switchTab('otp');
      setMsg('otpMsg', 'Verification code sent to ' + email, 'success');

    } catch (err) {
      setMsg('loginMsg', err.message, 'error');
    } finally {
      forgotPwdBtn.disabled = false;
    }
  });

  /* ════════════════════════════════════════
     SIGN UP FORM
     ════════════════════════════════════════ */
  const signupForm = document.getElementById('signupForm');
  const signupBtn  = document.getElementById('signupBtn');

  signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name  = document.getElementById('signupName')?.value.trim();
    const email = document.getElementById('signupEmail')?.value.trim();
    const phone = document.getElementById('signupPhone')?.value.trim();
    const password = document.getElementById('signupPassword')?.value;
    const age   = Number(document.getElementById('signupAge')?.value);

    if (!name || !email || !phone || !password || !age || age < 1) {
      setMsg('signupMsg', 'Please fill all fields correctly.', 'error');
      return;
    }

    signupBtn.disabled = true;
    signupBtn.textContent = 'Creating account...';
    setMsg('signupMsg', 'Saving your account...', 'info');

    try {
      const { response, data } = await requestJson('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password, age })
      });

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to create account.');
      }

      setMsg('signupMsg', data?.message || 'Account created. Please verify your email first.', 'success');
      signupForm.reset();
      resetOtpState();

    } catch (err) {
      const msg = err instanceof TypeError
        ? 'Cannot reach the server.'
        : (err.message || 'Something went wrong.');
      setMsg('signupMsg', msg, 'error');
    } finally {
      signupBtn.disabled = false;
      signupBtn.textContent = 'Create Account';
    }
  });

  /* ════════════════════════════════════════
     OTP FORM
     ════════════════════════════════════════ */
  const otpForm = document.getElementById('otpForm');
  const otpBtn = document.getElementById('otpBtn');
  const resendBtn = document.getElementById('resendOtpBtn');

  otpForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = document.getElementById('otpCode')?.value.trim();
    const newPassword = document.getElementById('resetPassword')?.value || '';
    if (!otp) {
      setMsg('otpMsg', 'Please enter the 6-digit code.', 'error');
      return;
    }
    if (newPassword.trim().length < 6) {
      setMsg('otpMsg', 'Please enter a new password with at least 6 characters.', 'error');
      return;
    }

    otpBtn.disabled = true;
    otpBtn.textContent = 'Verifying...';
    setMsg('otpMsg', '', '');

    try {
      const { response, data } = await requestJson('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentLoginEmail, otp, newPassword })
      });

      if (!response.ok) {
        throw new Error(data?.message || 'Verification failed.');
      }

      resetOtpState();
      saveUserSession(data.user.name, data.user.email, data.token, data.user.cart, data.user.wishlist);
      setMsg('otpMsg', '✓ Verified! Redirecting...', 'success');
      setTimeout(() => { window.location.href = resolveNextPath('index.html'); }, 700);
    } catch (err) {
      setMsg('otpMsg', err.message || 'Network error.', 'error');
      otpBtn.disabled = false;
      otpBtn.textContent = 'Verify & Reset Password';
    }
  });

  resendBtn?.addEventListener('click', async () => {
    if (!currentLoginEmail) {
        setMsg('otpMsg', 'Email context lost. Please try logging in again.', 'error');
        return;
    }
    setMsg('otpMsg', 'Resending OTP...', 'info');
    resendBtn.disabled = true;
    try {
      await requestJson('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentLoginEmail })
      });
      setMsg('otpMsg', 'A new OTP has been sent.', 'success');
    } catch(err) {
      setMsg('otpMsg', 'Failed to resend OTP.', 'error');
    } finally {
      setTimeout(() => { resendBtn.disabled = false; }, 3000);
    }
  });

  if (params.get('reason') === 'protected') {
    setMsg('loginMsg', 'Please log in first. Direct protected URL access is blocked.', 'info');
  }

})();
