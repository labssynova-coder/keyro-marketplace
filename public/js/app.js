// app.js — SPA router + initialization
let currentPage = 'home';
let currentProductId = null;
let currentInfoSlug = null;

function escHTML(value) {
  if (value == null) return '';
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
}

function handleRoute() {
  const hash = window.location.hash || '#/';
  const parts = hash.replace('#', '').split('/').filter(Boolean);

  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  if (parts.length === 0 || parts[0] === '') {
    currentPage = 'home';
    document.getElementById('page-home').classList.add('active');
    renderHome();
  } else if (parts[0] === 'product' && parts[1]) {
    currentPage = 'product';
    currentProductId = parseInt(parts[1], 10);
    document.getElementById('page-product').classList.add('active');
    renderProduct(currentProductId);
  } else if (parts[0] === 'cart') {
    currentPage = 'cart';
    document.getElementById('page-cart').classList.add('active');
    renderCart();
  } else if (parts[0] === 'account') {
    currentPage = 'account';
    document.getElementById('page-account').classList.add('active');
    renderAccount();
  } else if (parts[0] === 'info' && parts[1]) {
    currentPage = 'info';
    currentInfoSlug = parts[1];
    document.getElementById('page-info').classList.add('active');
    renderInfo(currentInfoSlug);
  } else {
    currentPage = 'home';
    document.getElementById('page-home').classList.add('active');
    renderHome();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  updateCartBadge();
}

function navigate(page, param) {
  switch (page) {
    case 'home': window.location.hash = '#/'; break;
    case 'product': window.location.hash = '#/product/' + param; break;
    case 'cart': window.location.hash = '#/cart'; break;
    case 'account': window.location.hash = '#/account'; break;
    default: window.location.hash = '#/';
  }
}

async function updateCartBadge() {
  const badge = document.getElementById('cartCount');
  if (!badge) return;
  const user = getCurrentUser();
  if (!user) { badge.style.display = 'none'; return; }
  try {
    const data = await apiGet('/cart');
    const count = data.count || 0;
    if (count > 0) { badge.textContent = count; badge.style.display = 'flex'; }
    else badge.style.display = 'none';
  } catch (_) { badge.style.display = 'none'; }
}

let toastTimeout = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toastMsg');
  if (toast && msgEl) {
    msgEl.textContent = msg;
    toast.classList.add('show');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 2500);
  }
}

async function init() {
  // Bind header nav buttons
  const navCart = document.getElementById('navCart');
  if (navCart) navCart.addEventListener('click', () => navigate('cart'));
  const navWishlist = document.getElementById('navWishlist');
  if (navWishlist) navWishlist.addEventListener('click', () => navigate('account'));

  // Bind search
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
  }

  // Restore auth session
  await initAuth();
  updateAuthUI();

  // Handle initial route
  handleRoute();

  // Listen for hash changes
  window.addEventListener('hashchange', handleRoute);
}

document.addEventListener('DOMContentLoaded', init);

// Make showLoginModal/showRegisterModal available from HTML onclick
function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  login(email, password).then(() => {
    hideModal();
    showToast('Connecté avec succès');
    handleRoute();
  }).catch(err => showToast(err.message || 'Erreur de connexion'));
}

function handleRegister() {
  const firstName = document.getElementById('regFirstName').value.trim();
  const lastName = document.getElementById('regLastName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  register(email, password, firstName, lastName).then(() => {
    hideModal();
    showToast('Compte créé avec succès');
    handleRoute();
  }).catch(err => showToast(err.message || 'Erreur lors de l\'inscription'));
}
