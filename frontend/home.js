const loginLink = document.getElementById('loginLink');
const userSession = document.getElementById('userSession');
const userGreeting = document.getElementById('userGreeting');
const logoutButton = document.getElementById('logoutButton');

function getStoredUserName() {
  const userName = localStorage.getItem('timelessPagesUserName');
  return userName ? userName.trim() : '';
}

function updateSessionUi() {
  const sessionBox = document.querySelector(".session-box");
  if (!sessionBox) return;

  const isLoggedIn = localStorage.getItem('timelessPagesLoggedIn') === 'true';
  const userName = localStorage.getItem('timelessPagesUserName');

  if (isLoggedIn && userName) {
    sessionBox.innerHTML = `
      <div class="user-session" id="userSession">
        <a href="orders.html" class="session-link">Orders</a>
        <span class="user-greeting">Hi, ${userName}</span>
        <button type="button" class="logout-btn" id="logoutButton">Logout</button>
      </div>
    `;
    
    document.getElementById('logoutButton')?.addEventListener('click', async () => {
      await requestLogout();
      clearSession();
      window.location.href = 'login.html';
    });
    return;
  }

  sessionBox.innerHTML = `
    <a href="login.html" id="loginLink">Login</a>
  `;
}

function clearSession() {
  localStorage.removeItem('timelessPagesLoggedIn');
  localStorage.removeItem('timelessPagesUserName');
  localStorage.removeItem('timelessPagesUserEmail');
  localStorage.removeItem('timelessPagesUserToken');
  localStorage.removeItem('timelessPagesIsAdmin');
  localStorage.removeItem('timelessPagesAdminToken');
}

async function requestLogout() {
  const apiBaseUrl = localStorage.getItem('timelessPagesApiBaseUrl') || 'http://localhost:5000';
  try {
    await fetch(`${apiBaseUrl}/api/auth/logout`, { method: 'POST' });
  } catch (error) {
    console.warn('Logout request failed:', error);
  }
}

updateSessionUi();
