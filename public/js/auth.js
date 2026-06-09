// auth.js — Auth state + UI
let currentUser = null;

function getAccessToken() {
  return localStorage.getItem('access_token');
}

function getCurrentUser() {
  return currentUser;
}

async function initAuth() {
  const token = getAccessToken();
  if (!token) { updateAuthUI(); return; }
  try {
    const user = await apiGet('/auth/me');
    currentUser = user;
  } catch (_) {
    currentUser = null;
    localStorage.removeItem('access_token');
  }
  updateAuthUI();
}

async function login(email, password) {
  const data = await apiPost('/auth/login', { email, password });
  if (data.accessToken) localStorage.setItem('access_token', data.accessToken);
  currentUser = data.user;
  updateAuthUI();
  return currentUser;
}

async function register(email, password, firstName, lastName) {
  const data = await apiPost('/auth/register', { email, password, firstName, lastName });
  if (data.accessToken) localStorage.setItem('access_token', data.accessToken);
  currentUser = data.user;
  updateAuthUI();
  return currentUser;
}

async function logout() {
  try { await apiPost('/auth/logout', {}); } catch (_) {}
  currentUser = null;
  localStorage.removeItem('access_token');
  updateAuthUI();
  window.location.hash = '#/';
}

function showLoginModal() {
  document.getElementById('loginModal').style.display = 'block';
  document.getElementById('registerModal').style.display = 'none';
  document.getElementById('modalOverlay').classList.add('show');
}

function showRegisterModal() {
  document.getElementById('loginModal').style.display = 'none';
  document.getElementById('registerModal').style.display = 'block';
  document.getElementById('modalOverlay').classList.add('show');
}

function hideModal() {
  document.getElementById('modalOverlay').classList.remove('show');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.id === 'modalOverlay') hideModal();
});

function updateAuthUI() {
  const loginBtn = document.getElementById('loginBtn');
  const avatarBtn = document.getElementById('avatarBtn');
  const navCart = document.getElementById('navCart');

  if (currentUser) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (avatarBtn) {
      avatarBtn.style.display = 'flex';
      const initial = ((currentUser.first_name || currentUser.email || '?')[0] || '?').toUpperCase();
      avatarBtn.textContent = initial;
      avatarBtn.onclick = () => navigate('account');
    }
    if (navCart) navCart.style.display = '';
  } else {
    if (loginBtn) loginBtn.style.display = '';
    if (avatarBtn) avatarBtn.style.display = 'none';
  }
}