// admin.js — Keyro Admin Panel SPA
// Loaded after api.js which provides global: apiGet, apiPost, apiPut, apiDelete, apiUpload
// Renders into <div id="adminContent"> inside admin.html

(function () {
  'use strict';

  // ─── State ───
  let currentSection = 'dashboard';
  let adminUser = null;
  let platformsCache = null;
  let genresCache = null;

  // ─── Helpers ───

  function fmtPrice(n) {
    var val = parseFloat(n);
    if (isNaN(val)) return '0,00€';
    var parts = val.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts.join(',') + '€';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    var day = String(d.getDate()).padStart(2, '0');
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var year = d.getFullYear();
    return day + '/' + month + '/' + year;
  }

  function statusBadgeHTML(status) {
    var s = (status || '').toLowerCase();
    var labels = {
      pending: 'En attente',
      paid: 'Payé',
      processing: 'En cours',
      delivered: 'Livé',
      cancelled: 'Annulé',
      refunded: 'Remboursé'
    };
    return '<span class="status-badge ' + s + '">' + (labels[s] || s) + '</span>';
  }

  function starsHTML(rating) {
    var r = parseInt(rating, 10) || 0;
    var html = '';
    for (var i = 1; i <= 5; i++) {
      html += i <= r ? '★' : '☆';
    }
    return html;
  }

  function esc(str) {
    if (str == null) return '';
    var d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  function confirmDialog(message, onConfirm) {
    var overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML =
      '<div class="confirm-dialog">' +
        '<h3>Confirmer</h3>' +
        '<p>' + esc(message) + '</p>' +
        '<div class="btn-row">' +
          '<button class="btn btn-outline" data-action="cancel">Annuler</button>' +
          '<button class="btn btn-primary" data-action="confirm">Confirmer</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      var action = e.target.dataset.action;
      if (action === 'cancel' || e.target === overlay) {
        overlay.remove();
      } else if (action === 'confirm') {
        overlay.remove();
        onConfirm();
      }
    });
  }

  function showToast(msg, isError) {
    var toast = document.createElement('div');
    toast.style.cssText =
      'position:fixed;bottom:24px;right:24px;z-index:500;padding:12px 20px;border-radius:8px;' +
      'font-size:0.875rem;color:#fff;opacity:0;transition:opacity 0.3s;' +
      'background:' + (isError ? '#EF4444' : '#10B981') + ';';
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(function () { toast.style.opacity = '1'; });
    setTimeout(function () {
      toast.style.opacity = '0';
      setTimeout(function () { toast.remove(); }, 300);
    }, 3000);
  }

  function paginationHTML(page, totalPages, onPageClick) {
    if (totalPages <= 1) return '';
    var html = '<div class="pagination">';
    html += '<button ' + (page <= 1 ? 'disabled' : '') + ' data-page="' + (page - 1) + '">&laquo;</button>';
    var start = Math.max(1, page - 2);
    var end = Math.min(totalPages, page + 2);
    for (var i = start; i <= end; i++) {
      html += '<button class="' + (i === page ? 'active' : '') + '" data-page="' + i + '">' + i + '</button>';
    }
    html += '<button ' + (page >= totalPages ? 'disabled' : '') + ' data-page="' + (page + 1) + '">&raquo;</button>';
    html += '</div>';
    return html;
  }

  function bindPagination(container, callback) {
    if (!container) return;
    var buttons = container.querySelectorAll('.pagination button[data-page]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        if (this.disabled) return;
        callback(parseInt(this.dataset.page, 10));
      });
    }
  }

  // ─── Data Cache ───

  async function loadPlatforms() {
    if (platformsCache) return platformsCache;
    var data = await apiGet('/platforms');
    platformsCache = Array.isArray(data) ? data : (data.data || []);
    return platformsCache;
  }

  async function loadGenres() {
    if (genresCache) return genresCache;
    var data = await apiGet('/genres');
    genresCache = Array.isArray(data) ? data : (data.data || []);
    return genresCache;
  }

  // ─── Auth Check ───

  async function checkAdmin() {
    var token = localStorage.getItem('access_token');
    if (token) {
      try {
        var user = await apiGet('/auth/me');
        if (user && user.role === 'admin') {
          adminUser = user;
          return true;
        }
      } catch (_) {
        localStorage.removeItem('access_token');
      }
    }
    showAdminLogin();
    return false;
  }

  function showAdminLogin() {
    var container = document.getElementById('adminContent');
    if (!container) return;
    container.innerHTML = '<div style="max-width:380px;margin:80px auto;text-align:center">' +
      '<div class="logo" style="justify-content:center;margin-bottom:24px"><div class="logo-icon">K</div><span class="logo-text">Keyro</span></div>' +
      '<h2 style="font-family:var(--font-display);margin-bottom:8px">Administration</h2>' +
      '<p style="color:var(--muted);margin-bottom:24px;font-size:.875rem">Connectez-vous avec un compte administrateur</p>' +
      '<div id="adminLoginError" style="color:var(--danger);font-size:.813rem;margin-bottom:12px;display:none"></div>' +
      '<input type="email" id="adminLoginEmail" placeholder="Email" class="input-field" style="margin-bottom:12px;width:100%">' +
      '<input type="password" id="adminLoginPassword" placeholder="Mot de passe" class="input-field" style="margin-bottom:20px;width:100%">' +
      '<button class="btn btn-primary" id="adminLoginBtn" style="width:100%">Se connecter</button>' +
      '<p style="margin-top:16px;font-size:.75rem;color:var(--muted)"><a href="/" style="color:var(--accent)">← Retour au site</a></p>' +
      '</div>';

    var btn = document.getElementById('adminLoginBtn');
    var emailEl = document.getElementById('adminLoginEmail');
    var pwEl = document.getElementById('adminLoginPassword');
    var errEl = document.getElementById('adminLoginError');

    function attemptLogin() {
      var email = emailEl.value.trim();
      var password = pwEl.value;
      if (!email || !password) {
        errEl.textContent = 'Remplissez tous les champs';
        errEl.style.display = 'block';
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Connexion…';
      apiPost('/auth/login', { email: email, password: password }).then(function (data) {
        if (data.accessToken) {
          localStorage.setItem('access_token', data.accessToken);
        }
        return apiGet('/auth/me');
      }).then(function (user) {
        if (user && user.role === 'admin') {
          adminUser = user;
          renderSidebar();
          renderSection();
        } else {
          errEl.textContent = 'Ce compte n\'est pas administrateur';
          errEl.style.display = 'block';
          btn.disabled = false;
          btn.textContent = 'Se connecter';
          localStorage.removeItem('access_token');
        }
      }).catch(function (err) {
        errEl.textContent = err.message || 'Identifiants incorrects';
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Se connecter';
      });
    }

    if (btn) btn.addEventListener('click', attemptLogin);
    if (pwEl) pwEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') attemptLogin(); });
  }

  // ─── Navigation ───

  var sections = [
    { key: 'dashboard', label: 'Tableau de bord', icon: '⌂' },
    { key: 'products', label: 'Produits', icon: '♦' },
    { key: 'keys', label: 'Clés', icon: '⚷' },
    { key: 'site', label: 'Accueil', icon: '✦' },
    { key: 'categories', label: 'Catégories', icon: '≡' },
    { key: 'orders', label: 'Commandes', icon: '☰' },
    { key: 'users', label: 'Utilisateurs', icon: '☺' },
    { key: 'reviews', label: 'Avis', icon: '★' }
  ];

  function renderSidebar() {
    var sidebar = document.querySelector('.admin-sidebar .admin-nav');
    if (!sidebar) return;
    var html = '';
    for (var i = 0; i < sections.length; i++) {
      var s = sections[i];
      var cls = s.key === currentSection ? 'admin-nav-item active' : 'admin-nav-item';
      html += '<div class="' + cls + '" data-section="' + s.key + '">' +
        '<span>' + s.icon + '</span> ' + esc(s.label) + '</div>';
    }
    sidebar.innerHTML = html;

    var items = sidebar.querySelectorAll('.admin-nav-item');
    for (var j = 0; j < items.length; j++) {
      items[j].addEventListener('click', function () {
        var key = this.dataset.section;
        if (key === currentSection) return;
        currentSection = key;
        renderSidebar();
        renderSection();
      });
    }
  }

  function renderSection() {
    var container = document.getElementById('adminContent');
    if (!container) return;
    switch (currentSection) {
      case 'dashboard': renderDashboard(container); break;
      case 'products': renderProducts(container); break;
      case 'keys': renderKeys(container); break;
      case 'site': renderSiteContent(container); break;
      case 'categories': renderCategories(container); break;
      case 'orders': renderOrders(container); break;
      case 'users': renderUsers(container); break;
      case 'reviews': renderReviews(container); break;
      default: container.innerHTML = '';
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ════════════════════════════════════════════════════════════════════

  async function renderDashboard(container) {
    container.innerHTML = '<p>Chargement...</p>';
    try {
      var stats = await apiGet('/admin/dashboard');

      // Stat cards
      var html = '<div class="stat-grid">';
      html += statCard('Revenu total', fmtPrice(stats.totalRevenue));
      html += statCard('Commandes', String(stats.totalOrders));
      html += statCard('Utilisateurs', String(stats.totalUsers));
      html += statCard('Produits', String(stats.totalProducts));
      html += '</div>';

      // Recent orders
      html += '<div class="admin-header"><h1>Commandes récentes</h1></div>';
      html += '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
        '<th>N° commande</th><th>Utilisateur</th><th>Total</th><th>Statut</th><th>Date</th>' +
        '</tr></thead><tbody>';
      var recent = stats.recentOrders || [];
      for (var i = 0; i < recent.length; i++) {
        var o = recent[i];
        html += '<tr>' +
          '<td class="mono">' + esc(o.order_number) + '</td>' +
          '<td>' + esc(o.email) + '</td>' +
          '<td>' + fmtPrice(o.total) + '</td>' +
          '<td>' + statusBadgeHTML(o.status) + '</td>' +
          '<td>' + formatDate(o.created_at) + '</td>' +
          '</tr>';
      }
      if (!recent.length) html += '<tr><td colspan="5">Aucune commande</td></tr>';
      html += '</tbody></table></div>';

      // Revenue by month chart
      var revByMonth = stats.revenueByMonth || [];
      if (revByMonth.length) {
        var maxRev = 0;
        for (var m = 0; m < revByMonth.length; m++) {
          if (parseFloat(revByMonth[m].revenue) > maxRev) maxRev = parseFloat(revByMonth[m].revenue);
        }
        maxRev = maxRev || 1;
        html += '<div class="admin-header"><h1>Revenu par mois</h1></div>';
        html += '<div class="admin-table-wrap" style="padding:20px"><div class="chart-bars">';
        for (var k = 0; k < revByMonth.length; k++) {
          var month = revByMonth[k];
          var rev = parseFloat(month.revenue);
          var pct = Math.round((rev / maxRev) * 100);
          var label = month.month ? month.month.substring(5) + '/' + month.month.substring(2, 4) : '';
          html += '<div style="flex:1;text-align:center">' +
            '<div class="chart-bar" style="height:' + pct + '%">' +
            '<span class="chart-value">' + fmtPrice(rev) + '</span></div>' +
            '<div class="chart-label">' + esc(label) + '</div></div>';
        }
        html += '</div></div>';
      }

      // Top products
      var topProducts = stats.topProducts || [];
      if (topProducts.length) {
        html += '<div class="admin-header"><h1>Top produits</h1></div>';
        html += '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
          '<th>Produit</th><th>Quantité vendue</th><th>Revenu</th>' +
          '</tr></thead><tbody>';
        for (var t = 0; t < topProducts.length; t++) {
          var tp = topProducts[t];
          html += '<tr>' +
            '<td>' + esc(tp.product_name) + '</td>' +
            '<td>' + tp.total_sold + '</td>' +
            '<td>' + fmtPrice(tp.revenue) + '</td>' +
            '</tr>';
        }
        html += '</tbody></table></div>';
      }

      container.innerHTML = html;
    } catch (err) {
      if (err.status === 401) { showAdminLogin(); return; }
      container.innerHTML = '<p class="error">Erreur: ' + esc(err.message) + '</p>';
    }
  }

  function statCard(label, value) {
    return '<div class="stat-card"><div class="stat-label">' + esc(label) +
      '</div><div class="stat-value">' + value + '</div></div>';
  }

  // ════════════════════════════════════════════════════════════════════
  // PRODUCTS MANAGEMENT
  // ════════════════════════════════════════════════════════════════════

  var productsPage = 1;
  var productsFilterPlatform = '';
  var productsFilterActive = false;

  async function renderProducts(container) {
    container.innerHTML = '<p>Chargement...</p>';
    try {
      var platforms = await loadPlatforms();
      var params = '?page=' + productsPage + '&limit=15';
      if (productsFilterPlatform) params += '&platform=' + encodeURIComponent(productsFilterPlatform);
      if (productsFilterActive) params += '&isActive=1';

      var result = await apiGet('/products' + params);
      var products = result.data || [];
      var pagination = result.pagination || { page: 1, totalPages: 1 };

      var html = '<div class="admin-header">' +
        '<h1>Produits</h1>' +
        '<div class="admin-header-bar">' +
          '<select id="filterPlatform" style="padding:8px 12px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--fg);font-size:.813rem">' +
            '<option value="">Toutes les plateformes</option>';
      for (var p = 0; p < platforms.length; p++) {
        var sel = platforms[p].slug === productsFilterPlatform ? ' selected' : '';
        html += '<option value="' + esc(platforms[p].slug) + '"' + sel + '>' + esc(platforms[p].name) + '</option>';
      }
      html += '</select>' +
        '<label style="display:flex;align-items:center;gap:6px;font-size:.813rem;color:var(--fg-secondary)">' +
          '<input type="checkbox" id="filterActiveOnly"' + (productsFilterActive ? ' checked' : '') +
          ' style="accent-color:var(--accent)"> Actifs seulement</label>' +
        '<button class="btn btn-primary" id="addProductBtn">+ Ajouter</button>' +
        '<button class="btn btn-outline" id="addSteamBtn" style="margin-left:8px">Ajouter depuis Steam</button>' +
        '</div></div>';

      // Table
      html += '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
        '<th>Nom</th><th>Plateforme</th><th>Prix</th><th>Réduction</th><th>Stock</th><th>Actif</th><th>Actions</th>' +
        '</tr></thead><tbody>';

      for (var i = 0; i < products.length; i++) {
        var pr = products[i];
        html += '<tr>' +
          '<td>' + esc(pr.name) + '</td>' +
          '<td>' + esc(pr.platform_name || pr.platform_slug) + '</td>' +
          '<td>' + fmtPrice(pr.sale_price) + '</td>' +
          '<td>' + (pr.discount_percent || 0) + '%</td>' +
          '<td>' + pr.stock + '</td>' +
          '<td>' + (pr.is_active ? '✓' : '✗') + '</td>' +
          '<td class="actions">' +
            '<button class="btn btn-outline btn-sm" data-edit-product="' + pr.id + '">Modifier</button>' +
            '<button class="btn btn-outline btn-sm" data-delete-product="' + pr.id + '" style="color:var(--danger)">Supprimer</button>' +
          '</td></tr>';
      }
      if (!products.length) html += '<tr><td colspan="7">Aucun produit</td></tr>';
      html += '</tbody></table></div>';

      html += paginationHTML(pagination.page, pagination.totalPages, function () {});

      container.innerHTML = html;

      // Bind filters
      var filterPlatEl = document.getElementById('filterPlatform');
      if (filterPlatEl) {
        filterPlatEl.addEventListener('change', function () {
          productsFilterPlatform = this.value;
          productsPage = 1;
          renderProducts(container);
        });
      }
      var filterActiveEl = document.getElementById('filterActiveOnly');
      if (filterActiveEl) {
        filterActiveEl.addEventListener('change', function () {
          productsFilterActive = this.checked;
          productsPage = 1;
          renderProducts(container);
        });
      }

      // Bind add button
      var addBtn = document.getElementById('addProductBtn');
      if (addBtn) addBtn.addEventListener('click', function () { showProductForm(container); });

      // Bind Steam button
      var steamBtn = document.getElementById('addSteamBtn');
      if (steamBtn) steamBtn.addEventListener('click', function () { showSteamBrowser(container); });

      // Bind edit buttons
      var editBtns = container.querySelectorAll('[data-edit-product]');
      for (var e = 0; e < editBtns.length; e++) {
        editBtns[e].addEventListener('click', function () {
          var id = parseInt(this.dataset.editProduct, 10);
          loadAndShowProductForm(container, id);
        });
      }

      // Bind delete buttons
      var delBtns = container.querySelectorAll('[data-delete-product]');
      for (var d = 0; d < delBtns.length; d++) {
        delBtns[d].addEventListener('click', function () {
          var id = parseInt(this.dataset.deleteProduct, 10);
          confirmDialog('Supprimer ce produit ? Il sera désactivé.', function () {
            apiDelete('/products/' + id).then(function () {
              showToast('Produit désactivé');
              renderProducts(container);
            }).catch(function (err) {
              showToast(err.message, true);
            });
          });
        });
      }

      // Bind pagination
      bindPagination(container, function (pg) {
        productsPage = pg;
        renderProducts(container);
      });
    } catch (err) {
      if (err.status === 401) { showAdminLogin(); return; }
      container.innerHTML = '<p class="error">Erreur: ' + esc(err.message) + '</p>';
    }
  }

  async function showProductForm(container, product) {
    var isEdit = !!(product && product.id);
    try {
      var platforms = await loadPlatforms();
      var genres = await loadGenres();

      var html = '<div class="admin-form"><h2>' + (isEdit ? 'Modifier le produit' : 'Ajouter un produit') + '</h2>' +
        '<form id="productForm" enctype="multipart/form-data">' +
        '<div class="form-grid">';

      // Name
      html += fieldGroup('Nom', '<input type="text" name="name" value="' + esc(product ? product.name : '') + '" required>');

      // Platform
      html += '<div class="form-group"><label>Plateforme</label><select name="platformId" required>';
      for (var i = 0; i < platforms.length; i++) {
        var sel = product && product.platform_id === platforms[i].id ? ' selected' : '';
        html += '<option value="' + platforms[i].id + '"' + sel + '>' + esc(platforms[i].name) + '</option>';
      }
      html += '</select></div>';

      // Region
      html += fieldGroup('Région', '<input type="text" name="region" value="' + esc(product ? product.region : 'Global') + '">');

      // Activation
      html += fieldGroup('Activation', '<input type="text" name="activation" value="' + esc(product ? product.activation : '') + '" required>');

      // Original price
      html += fieldGroup('Prix original', '<input type="number" step="0.01" name="originalPrice" id="pfOriginalPrice" value="' + (product ? product.original_price : '') + '" required>');

      // Sale price
      html += fieldGroup('Prix de vente', '<input type="number" step="0.01" name="salePrice" id="pfSalePrice" value="' + (product ? product.sale_price : '') + '" required>');

      // Discount (auto)
      html += fieldGroup('Réduction', '<input type="text" name="discountPercent" id="pfDiscountPercent" value="' + (product ? product.discount_percent : '0') + '" readonly style="background:var(--surface);opacity:.7"> %');

      // Image
      html += '<div class="form-group"><label>Image</label><input type="file" name="image" accept="image/*">';
      if (product && product.image_url) {
        html += '<img src="' + esc(product.image_url) + '" class="form-image-preview" alt="preview">';
        html += '<input type="hidden" name="imageUrl" value="' + esc(product.image_url) + '">';
      }
      html += '</div>';

      // Stock
      html += fieldGroup('Stock', '<input type="number" name="stock" value="' + (product ? product.stock : 100) + '">');

      // Delivery type
      var deliveryType = (product && product.delivery_type) ? product.delivery_type : 'key';
      html += '<div class="form-group"><label>Type de livraison</label>' +
        '<div style="display:flex;gap:8px">' +
          '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:8px 16px;border-radius:6px;border:2px solid ' + (deliveryType === 'key' ? 'var(--accent)' : 'var(--border)') + ';background:' + (deliveryType === 'key' ? 'rgba(99,102,241,0.1)' : 'transparent') + '">' +
            '<input type="radio" name="deliveryType" value="key"' + (deliveryType === 'key' ? ' checked' : '') + ' style="accent-color:var(--accent)"> Clé CD</label>' +
          '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:8px 16px;border-radius:6px;border:2px solid ' + (deliveryType === 'account' ? 'var(--accent)' : 'var(--border)') + ';background:' + (deliveryType === 'account' ? 'rgba(99,102,241,0.1)' : 'transparent') + '">' +
            '<input type="radio" name="deliveryType" value="account"' + (deliveryType === 'account' ? ' checked' : '') + ' style="accent-color:var(--accent)"> Compte partagé</label>' +
        '</div></div>';

      // Description
      html += '<div class="form-group full"><label>Description</label><textarea name="description">' + esc(product ? product.description : '') + '</textarea></div>';

      // System requirements
      html += fieldGroup('OS requis', '<input type="text" name="osReq" value="' + esc(product ? product.os_req : '') + '">');
      html += fieldGroup('CPU requis', '<input type="text" name="cpuReq" value="' + esc(product ? product.cpu_req : '') + '">');
      html += fieldGroup('RAM requise', '<input type="text" name="ramReq" value="' + esc(product ? product.ram_req : '') + '">');
      html += fieldGroup('GPU requise', '<input type="text" name="gpuReq" value="' + esc(product ? product.gpu_req : '') + '">');

      // Genres
      html += '<div class="form-group full"><label>Genres</label><div class="genre-checks">';
      var productGenreIds = (product && product.genres) ? product.genres.map(function (g) { return g.id; }) : [];
      for (var g = 0; g < genres.length; g++) {
        var checked = productGenreIds.indexOf(genres[g].id) !== -1 ? ' checked' : '';
        html += '<label class="genre-check"><input type="checkbox" name="genreIds" value="' + genres[g].id + '"' + checked + '> ' + esc(genres[g].name) + '</label>';
      }
      html += '</div></div>';

      // Active toggle
      var isActive = product ? product.is_active : true;
      html += '<div class="form-group"><label>Actif</label>' +
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer">' +
        '<input type="checkbox" name="isActive"' + (isActive ? ' checked' : '') + ' style="accent-color:var(--accent);width:18px;height:18px"> Produit visible</label></div>';

      html += '<div class="form-actions">' +
        '<button type="submit" class="btn btn-primary">' + (isEdit ? 'Enregistrer' : 'Créer') + '</button>' +
        '<button type="button" class="btn btn-outline" id="cancelProductForm">Annuler</button>' +
        '</div>';

      html += '</div></form></div>';

      container.innerHTML = html;

      // Auto-calculate discount
      var origEl = document.getElementById('pfOriginalPrice');
      var saleEl = document.getElementById('pfSalePrice');
      var discEl = document.getElementById('pfDiscountPercent');
      function calcDiscount() {
        var orig = parseFloat(origEl.value);
        var sale = parseFloat(saleEl.value);
        if (orig > 0 && sale >= 0) {
          discEl.value = Math.round((1 - sale / orig) * 100);
        } else {
          discEl.value = '0';
        }
      }
      if (origEl) origEl.addEventListener('input', calcDiscount);
      if (saleEl) saleEl.addEventListener('input', calcDiscount);

      // Cancel
      var cancelBtn = document.getElementById('cancelProductForm');
      if (cancelBtn) cancelBtn.addEventListener('click', function () { renderProducts(container); });

      // Submit
      var form = document.getElementById('productForm');
      if (form) form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var fd = new FormData(form);
        var body = {};
        body.name = fd.get('name');
        body.platformId = parseInt(fd.get('platformId'), 10);
        body.region = fd.get('region') || 'Global';
        body.activation = fd.get('activation');
        body.originalPrice = parseFloat(fd.get('originalPrice'));
        body.salePrice = parseFloat(fd.get('salePrice'));
        body.discountPercent = parseInt(discEl.value, 10) || 0;
        body.description = fd.get('description') || null;
        body.osReq = fd.get('osReq') || null;
        body.cpuReq = fd.get('cpuReq') || null;
        body.ramReq = fd.get('ramReq') || null;
        body.gpuReq = fd.get('gpuReq') || null;
        body.stock = parseInt(fd.get('stock'), 10) || 100;
        body.deliveryType = fd.get('deliveryType') || 'key';
        body.genreIds = fd.getAll('genreIds').map(Number);
        body.isActive = !!fd.get('isActive');
        body.imageUrl = fd.get('imageUrl') || null;

        try {
          if (isEdit) {
            // For update, we need FormData if there's a file
            var fileInput = form.querySelector('input[name="image"]');
            if (fileInput && fileInput.files && fileInput.files.length) {
              var uploadFd = new FormData();
              for (var key in body) {
                if (body.hasOwnProperty(key)) {
                  var val = body[key];
                  if (Array.isArray(val)) {
                    for (var vi = 0; vi < val.length; vi++) uploadFd.append(key, val[vi]);
                  } else {
                    uploadFd.append(key, val);
                  }
                }
              }
              uploadFd.append('image', fileInput.files[0]);
              await apiUpload('/products/' + product.id, uploadFd, 'PUT');
            } else {
              await apiPut('/products/' + product.id, body);
            }
            showToast('Produit mis à jour');
          } else {
            var fileInput2 = form.querySelector('input[name="image"]');
            if (fileInput2 && fileInput2.files && fileInput2.files.length) {
              var uploadFd2 = new FormData();
              for (var key2 in body) {
                if (body.hasOwnProperty(key2)) {
                  var val2 = body[key2];
                  if (Array.isArray(val2)) {
                    for (var vi2 = 0; vi2 < val2.length; vi2++) uploadFd2.append(key2, val2[vi2]);
                  } else {
                    uploadFd2.append(key2, val2);
                  }
                }
              }
              uploadFd2.append('image', fileInput2.files[0]);
              await apiUpload('/products', uploadFd2);
            } else {
              await apiPost('/products', body);
            }
            showToast('Produit créé');
          }
          renderProducts(container);
        } catch (err) {
          showToast(err.message, true);
        }
      });

    } catch (err) {
      if (err.status === 401) { showAdminLogin(); return; }
      container.innerHTML = '<p class="error">Erreur: ' + esc(err.message) + '</p>';
    }
  }

  async function loadAndShowProductForm(container, id) {
    container.innerHTML = '<p>Chargement...</p>';
    try {
      var product = await apiGet('/products/' + id);
      showProductForm(container, product);
    } catch (err) {
      showToast(err.message, true);
      renderProducts(container);
    }
  }

  function fieldGroup(label, inputHtml) {
    return '<div class="form-group"><label>' + esc(label) + '</label>' + inputHtml + '</div>';
  }

  // HOME CONTENT

  async function renderSiteContent(container) {
    container.innerHTML = '<p>Chargement...</p>';
    try {
      var settings = await apiGet('/admin/site/home-content');
      var result = await apiGet('/products?limit=100');
      var products = result.data || result || [];
      var featuredIds = Array.isArray(settings.featuredProductIds)
        ? settings.featuredProductIds.map(function (id) { return parseInt(id, 10); })
        : [];

      var html = '<div class="admin-header"><h1>Accueil</h1></div>';
      html += '<div class="admin-form"><h2>Hero et promotions</h2>' +
        '<form id="siteContentForm"><div class="form-grid">';

      html += '<div class="form-group full"><label>Mode du hero</label><div class="segmented-row">' +
        radioPill('heroMode', 'auto', 'Automatique', settings.heroMode === 'auto' || !settings.heroMode) +
        radioPill('heroMode', 'product', 'Produit choisi', settings.heroMode === 'product') +
        radioPill('heroMode', 'custom', 'Hero personnalise', settings.heroMode === 'custom') +
        '</div></div>';

      html += '<div class="form-group"><label>Produit du hero</label><select name="heroProductId">' +
        '<option value="">Meilleure promotion automatique</option>';
      for (var i = 0; i < products.length; i++) {
        var p = products[i];
        var selected = Number(settings.heroProductId) === Number(p.id) ? ' selected' : '';
        html += '<option value="' + p.id + '"' + selected + '>' + esc(p.name) + ' - ' + fmtPrice(p.sale_price) + '</option>';
      }
      html += '</select></div>';

      html += fieldGroup('Texte court au-dessus', '<input type="text" name="heroEyebrow" maxlength="120" value="' + esc(settings.heroEyebrow || '') + '" placeholder="Ex: Offre de la semaine">');
      html += fieldGroup('Titre personnalise', '<input type="text" name="heroTitle" maxlength="160" value="' + esc(settings.heroTitle || '') + '" placeholder="Laisser vide pour reprendre le nom du produit">');
      html += fieldGroup('Libelle du bouton', '<input type="text" name="heroButtonLabel" maxlength="80" value="' + esc(settings.heroButtonLabel || 'Acheter maintenant') + '">');
      html += '<div class="form-group full"><label>Description personnalisee</label><textarea name="heroSubtitle" maxlength="500" placeholder="Laisser vide pour reprendre la description du produit">' + esc(settings.heroSubtitle || '') + '</textarea></div>';
      html += '<div class="form-group full"><label>Image de fond du hero</label><input type="url" name="heroImageUrl" value="' + esc(settings.heroImageUrl || '') + '" placeholder="/img/products/image.jpg ou https://..."></div>';

      html += '<div class="form-group full"><label>Promotions mises en avant</label><div class="product-checks">';
      for (var j = 0; j < products.length; j++) {
        var pr = products[j];
        var checked = featuredIds.indexOf(Number(pr.id)) !== -1 ? ' checked' : '';
        html += '<label class="product-check"><input type="checkbox" name="featuredProductIds" value="' + pr.id + '"' + checked + '> ' +
          '<span>' + esc(pr.name) + '</span><small>' + (pr.discount_percent || 0) + '% - ' + fmtPrice(pr.sale_price) + '</small></label>';
      }
      html += '</div></div>';

      html += '<div class="form-actions">' +
        '<button type="submit" class="btn btn-primary">Enregistrer</button>' +
        '<button type="button" class="btn btn-outline" id="previewHomeBtn">Voir l’accueil</button>' +
        '</div></div></form></div>';

      container.innerHTML = html;

      var form = document.getElementById('siteContentForm');
      if (form) form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var fd = new FormData(form);
        var body = {
          heroMode: fd.get('heroMode') || 'auto',
          heroProductId: fd.get('heroProductId') ? parseInt(fd.get('heroProductId'), 10) : null,
          heroEyebrow: fd.get('heroEyebrow') || '',
          heroTitle: fd.get('heroTitle') || '',
          heroSubtitle: fd.get('heroSubtitle') || '',
          heroImageUrl: fd.get('heroImageUrl') || '',
          heroButtonLabel: fd.get('heroButtonLabel') || 'Acheter maintenant',
          featuredProductIds: fd.getAll('featuredProductIds').map(Number)
        };
        try {
          await apiPut('/admin/site/home-content', body);
          showToast('Accueil mis a jour');
        } catch (err) {
          showToast(err.message, true);
        }
      });

      var previewBtn = document.getElementById('previewHomeBtn');
      if (previewBtn) previewBtn.addEventListener('click', function () {
        window.open('/', '_blank');
      });
    } catch (err) {
      if (err.status === 401) { showAdminLogin(); return; }
      container.innerHTML = '<p class="error">Erreur: ' + esc(err.message) + '</p>';
    }
  }

  function radioPill(name, value, label, checked) {
    return '<label class="radio-pill"><input type="radio" name="' + esc(name) + '" value="' + esc(value) + '"' +
      (checked ? ' checked' : '') + '> ' + esc(label) + '</label>';
  }

  // ════════════════════════════════════════════════════════════════════
  // CATEGORIES (Platforms + Genres)
  // ════════════════════════════════════════════════════════════════════

  var categoriesTab = 'platforms';

  async function renderCategories(container) {
    var html = '<div class="admin-header"><h1>Catégories</h1>' +
      '<div class="admin-header-bar">' +
        '<button class="btn ' + (categoriesTab === 'platforms' ? 'btn-primary' : 'btn-outline') + '" id="tabPlatforms">Plateformes</button>' +
        '<button class="btn ' + (categoriesTab === 'genres' ? 'btn-primary' : 'btn-outline') + '" id="tabGenres">Genres</button>' +
      '</div></div>';

    container.innerHTML = html;

    document.getElementById('tabPlatforms').addEventListener('click', function () {
      categoriesTab = 'platforms';
      renderCategories(container);
    });
    document.getElementById('tabGenres').addEventListener('click', function () {
      categoriesTab = 'genres';
      renderCategories(container);
    });

    if (categoriesTab === 'platforms') {
      renderPlatformsTab(container);
    } else {
      renderGenresTab(container);
    }
  }

  async function renderPlatformsTab(container) {
    try {
      var platforms = await loadPlatforms();
      platformsCache = null; // refresh

      var html = '<div class="admin-form"><h2>Ajouter une plateforme</h2>' +
        '<form id="platformForm"><div class="form-grid">' +
        fieldGroup('Nom', '<input type="text" name="name" required>') +
        fieldGroup('Slug', '<input type="text" name="slug" required>') +
        fieldGroup('Ordre', '<input type="number" name="sortOrder" value="0">') +
        '<div class="form-actions"><button type="submit" class="btn btn-primary">Ajouter</button></div>' +
        '</div></form></div>';

      html += '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
        '<th>Nom</th><th>Slug</th><th>Ordre</th><th>Actions</th>' +
        '</tr></thead><tbody>';

      for (var i = 0; i < platforms.length; i++) {
        var pl = platforms[i];
        html += '<tr data-platform-id="' + pl.id + '">' +
          '<td class="pf-name">' + esc(pl.name) + '</td>' +
          '<td class="pf-slug">' + esc(pl.slug) + '</td>' +
          '<td class="pf-order">' + pl.sort_order + '</td>' +
          '<td class="actions">' +
            '<button class="btn btn-outline btn-sm" data-edit-platform="' + pl.id + '">Modifier</button>' +
            '<button class="btn btn-outline btn-sm" data-delete-platform="' + pl.id + '" style="color:var(--danger)">Supprimer</button>' +
          '</td></tr>';
      }
      if (!platforms.length) html += '<tr><td colspan="4">Aucune plateforme</td></tr>';
      html += '</tbody></table></div>';

      var wrapper = document.createElement('div');
      wrapper.innerHTML = html;
      container.appendChild(wrapper);

      // Add form
      var form = document.getElementById('platformForm');
      if (form) form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var fd = new FormData(form);
        var body = {
          name: fd.get('name'),
          slug: fd.get('slug'),
          sortOrder: parseInt(fd.get('sortOrder'), 10) || 0
        };
        try {
          await apiPost('/platforms', body);
          platformsCache = null;
          showToast('Plateforme ajoutée');
          renderCategories(container);
        } catch (err) {
          showToast(err.message, true);
        }
      });

      // Edit buttons
      var editBtns = wrapper.querySelectorAll('[data-edit-platform]');
      for (var e2 = 0; e2 < editBtns.length; e2++) {
        editBtns[e2].addEventListener('click', function () {
          var id = parseInt(this.dataset.editPlatform, 10);
          editPlatformInline(wrapper, id, platforms);
        });
      }

      // Delete buttons
      var delBtns = wrapper.querySelectorAll('[data-delete-platform]');
      for (var d = 0; d < delBtns.length; d++) {
        delBtns[d].addEventListener('click', function () {
          var id = parseInt(this.dataset.deletePlatform, 10);
          confirmDialog('Supprimer cette plateforme ?', function () {
            apiDelete('/platforms/' + id).then(function () {
              platformsCache = null;
              showToast('Plateforme supprimée');
              renderCategories(container);
            }).catch(function (err) { showToast(err.message, true); });
          });
        });
      }
    } catch (err) {
      showToast(err.message, true);
    }
  }

  function editPlatformInline(wrapper, id, platforms) {
    var row = wrapper.querySelector('tr[data-platform-id="' + id + '"]');
    if (!row) return;
    var plat = platforms.find(function (p) { return p.id === id; });
    if (!plat) return;

    row.innerHTML = '<td><input type="text" class="edit-pf-name" value="' + esc(plat.name) + '" style="width:100%;padding:6px;border-radius:4px;border:1px solid var(--border);background:var(--surface);color:var(--fg)"></td>' +
      '<td><input type="text" class="edit-pf-slug" value="' + esc(plat.slug) + '" style="width:100%;padding:6px;border-radius:4px;border:1px solid var(--border);background:var(--surface);color:var(--fg)"></td>' +
      '<td><input type="number" class="edit-pf-order" value="' + plat.sort_order + '" style="width:60px;padding:6px;border-radius:4px;border:1px solid var(--border);background:var(--surface);color:var(--fg)"></td>' +
      '<td class="actions">' +
        '<button class="btn btn-primary btn-sm" data-save-platform="' + id + '">OK</button>' +
        '<button class="btn btn-outline btn-sm" data-cancel-edit>Annuler</button>' +
      '</td>';

    row.querySelector('[data-save-platform]').addEventListener('click', async function () {
      var body = {
        name: row.querySelector('.edit-pf-name').value,
        slug: row.querySelector('.edit-pf-slug').value,
        sortOrder: parseInt(row.querySelector('.edit-pf-order').value, 10) || 0
      };
      try {
        await apiPut('/platforms/' + id, body);
        platformsCache = null;
        showToast('Plateforme mise à jour');
        renderCategories(document.getElementById('adminContent'));
      } catch (err) {
        showToast(err.message, true);
      }
    });

    row.querySelector('[data-cancel-edit]').addEventListener('click', function () {
      renderCategories(document.getElementById('adminContent'));
    });
  }

  async function renderGenresTab(container) {
    try {
      var genres = await loadGenres();
      genresCache = null; // refresh

      var html = '<div class="admin-form"><h2>Ajouter un genre</h2>' +
        '<form id="genreForm"><div class="form-grid">' +
        fieldGroup('Nom', '<input type="text" name="name" required>') +
        fieldGroup('Slug', '<input type="text" name="slug" required>') +
        '<div class="form-actions"><button type="submit" class="btn btn-primary">Ajouter</button></div>' +
        '</div></form></div>';

      html += '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
        '<th>Nom</th><th>Slug</th><th>Actions</th>' +
        '</tr></thead><tbody>';

      for (var i = 0; i < genres.length; i++) {
        var gn = genres[i];
        html += '<tr data-genre-id="' + gn.id + '">' +
          '<td class="gn-name">' + esc(gn.name) + '</td>' +
          '<td class="gn-slug">' + esc(gn.slug) + '</td>' +
          '<td class="actions">' +
            '<button class="btn btn-outline btn-sm" data-edit-genre="' + gn.id + '">Modifier</button>' +
            '<button class="btn btn-outline btn-sm" data-delete-genre="' + gn.id + '" style="color:var(--danger)">Supprimer</button>' +
          '</td></tr>';
      }
      if (!genres.length) html += '<tr><td colspan="3">Aucun genre</td></tr>';
      html += '</tbody></table></div>';

      var wrapper = document.createElement('div');
      wrapper.innerHTML = html;
      container.appendChild(wrapper);

      // Add form
      var form = document.getElementById('genreForm');
      if (form) form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var fd = new FormData(form);
        var body = { name: fd.get('name'), slug: fd.get('slug') };
        try {
          await apiPost('/genres', body);
          genresCache = null;
          showToast('Genre ajouté');
          renderCategories(container);
        } catch (err) {
          showToast(err.message, true);
        }
      });

      // Edit buttons
      var editBtns = wrapper.querySelectorAll('[data-edit-genre]');
      for (var e2 = 0; e2 < editBtns.length; e2++) {
        editBtns[e2].addEventListener('click', function () {
          var id = parseInt(this.dataset.editGenre, 10);
          editGenreInline(wrapper, id, genres);
        });
      }

      // Delete buttons
      var delBtns = wrapper.querySelectorAll('[data-delete-genre]');
      for (var d = 0; d < delBtns.length; d++) {
        delBtns[d].addEventListener('click', function () {
          var id = parseInt(this.dataset.deleteGenre, 10);
          confirmDialog('Supprimer ce genre ?', function () {
            apiDelete('/genres/' + id).then(function () {
              genresCache = null;
              showToast('Genre supprimé');
              renderCategories(container);
            }).catch(function (err) { showToast(err.message, true); });
          });
        });
      }
    } catch (err) {
      showToast(err.message, true);
    }
  }

  function editGenreInline(wrapper, id, genres) {
    var row = wrapper.querySelector('tr[data-genre-id="' + id + '"]');
    if (!row) return;
    var gn = genres.find(function (g) { return g.id === id; });
    if (!gn) return;

    row.innerHTML = '<td><input type="text" class="edit-gn-name" value="' + esc(gn.name) + '" style="width:100%;padding:6px;border-radius:4px;border:1px solid var(--border);background:var(--surface);color:var(--fg)"></td>' +
      '<td><input type="text" class="edit-gn-slug" value="' + esc(gn.slug) + '" style="width:100%;padding:6px;border-radius:4px;border:1px solid var(--border);background:var(--surface);color:var(--fg)"></td>' +
      '<td class="actions">' +
        '<button class="btn btn-primary btn-sm" data-save-genre="' + id + '">OK</button>' +
        '<button class="btn btn-outline btn-sm" data-cancel-edit>Annuler</button>' +
      '</td>';

    row.querySelector('[data-save-genre]').addEventListener('click', async function () {
      var body = {
        name: row.querySelector('.edit-gn-name').value,
        slug: row.querySelector('.edit-gn-slug').value
      };
      try {
        await apiPut('/genres/' + id, body);
        genresCache = null;
        showToast('Genre mis à jour');
        renderCategories(document.getElementById('adminContent'));
      } catch (err) {
        showToast(err.message, true);
      }
    });

    row.querySelector('[data-cancel-edit]').addEventListener('click', function () {
      renderCategories(document.getElementById('adminContent'));
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // ORDERS MANAGEMENT
  // ════════════════════════════════════════════════════════════════════

  var ordersPage = 1;
  var ordersFilterStatus = '';

  async function renderOrders(container) {
    container.innerHTML = '<p>Chargement...</p>';
    try {
      var params = '?page=' + ordersPage + '&limit=15';
      if (ordersFilterStatus) params += '&status=' + encodeURIComponent(ordersFilterStatus);

      var result = await apiGet('/admin/orders' + params);
      var orders = result.data || [];
      var pagination = result.pagination || { page: 1, totalPages: 1 };

      var statusOptions = ['pending', 'paid', 'processing', 'delivered', 'cancelled', 'refunded'];
      var editableStatusOptions = ['pending', 'processing', 'delivered', 'cancelled', 'refunded'];

      var html = '<div class="admin-header"><h1>Commandes</h1>' +
        '<div class="admin-header-bar">' +
          '<select id="filterOrderStatus" style="padding:8px 12px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--fg);font-size:.813rem">' +
            '<option value="">Tous les statuts</option>';
      for (var s = 0; s < statusOptions.length; s++) {
        var sel = statusOptions[s] === ordersFilterStatus ? ' selected' : '';
        html += '<option value="' + statusOptions[s] + '"' + sel + '>' + statusOptions[s] + '</option>';
      }
      html += '</select></div></div>';

      html += '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
        '<th>N° commande</th><th>Utilisateur</th><th>Référence paiement</th><th>Date</th><th>Total</th><th>Statut</th><th>Articles</th>' +
        '</tr></thead><tbody>';

      for (var i = 0; i < orders.length; i++) {
        var o = orders[i];
        var itemsCount = o.items ? o.items.length : 0;
        html += '<tr data-order-id="' + o.id + '" style="cursor:pointer">' +
          '<td class="mono">' + esc(o.order_number) + '</td>' +
          '<td>' + esc(o.user_email || o.email || '') + '</td>' +
          '<td class="mono">' + esc(o.payment_reference || '-') + '</td>' +
          '<td>' + formatDate(o.created_at) + '</td>' +
          '<td>' + fmtPrice(o.total) + '</td>' +
          '<td><select class="order-status-select" data-order-id="' + o.id + '" style="padding:4px 8px;border-radius:4px;border:1px solid var(--border);background:var(--surface);color:var(--fg);font-size:.813rem">';
        var rowStatusOptions = editableStatusOptions.slice();
        if (rowStatusOptions.indexOf(o.status) === -1) rowStatusOptions.unshift(o.status);
        for (var st = 0; st < rowStatusOptions.length; st++) {
          var optStatus = rowStatusOptions[st];
          var selSt = optStatus === o.status ? ' selected' : '';
          var disabledPaid = optStatus === 'paid' ? ' disabled' : '';
          html += '<option value="' + optStatus + '"' + selSt + disabledPaid + '>' + optStatus + '</option>';
        }
        html += '</select></td>' +
          '<td>' + itemsCount + '</td>' +
          '</tr>';

        // Expandable row for items
        if (o.items && o.items.length) {
          html += '<tr class="order-items-row" data-order-items="' + o.id + '" style="display:none"><td colspan="7" style="padding:12px 24px;background:var(--surface)">';
          html += '<table class="admin-table" style="margin:0"><thead><tr>' +
            '<th>Produit</th><th>Quantité</th><th>Prix unitaire</th><th>Sous-total</th>' +
            '</tr></thead><tbody>';
          for (var it = 0; it < o.items.length; it++) {
            var item = o.items[it];
            var sub = (parseFloat(item.unit_price) * item.quantity);
            html += '<tr>' +
              '<td>' + esc(item.product_name) + '</td>' +
              '<td>' + item.quantity + '</td>' +
              '<td>' + fmtPrice(item.unit_price) + '</td>' +
              '<td>' + fmtPrice(sub) + '</td></tr>';
          }
          html += '</tbody></table></td></tr>';
        }
      }
      if (!orders.length) html += '<tr><td colspan="7">Aucune commande</td></tr>';
      html += '</tbody></table></div>';

      html += paginationHTML(pagination.page, pagination.totalPages, function () {});

      container.innerHTML = html;

      // Filter
      var filterEl = document.getElementById('filterOrderStatus');
      if (filterEl) filterEl.addEventListener('change', function () {
        ordersFilterStatus = this.value;
        ordersPage = 1;
        renderOrders(container);
      });

      // Click row to expand
      var orderRows = container.querySelectorAll('tr[data-order-id]');
      for (var r = 0; r < orderRows.length; r++) {
        (function (row) {
          row.addEventListener('click', function (e) {
            // Don't toggle when clicking select
            if (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION') return;
            var id = row.dataset.orderId;
            var itemsRow = container.querySelector('tr[data-order-items="' + id + '"]');
            if (itemsRow) {
              itemsRow.style.display = itemsRow.style.display === 'none' ? '' : 'none';
            }
          });
        })(orderRows[r]);
      }

      // Status change
      var statusSelects = container.querySelectorAll('.order-status-select');
      for (var ss = 0; ss < statusSelects.length; ss++) {
        statusSelects[ss].addEventListener('change', async function () {
          var orderId = this.dataset.orderId;
          var newStatus = this.value;
          try {
            await apiPut('/orders/' + orderId + '/status', { status: newStatus });
            showToast('Statut mis à jour');
          } catch (err) {
            showToast(err.message, true);
            renderOrders(container);
          }
        });
      }

      // Pagination
      bindPagination(container, function (pg) {
        ordersPage = pg;
        renderOrders(container);
      });
    } catch (err) {
      if (err.status === 401) { showAdminLogin(); return; }
      container.innerHTML = '<p class="error">Erreur: ' + esc(err.message) + '</p>';
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // USERS MANAGEMENT
  // ════════════════════════════════════════════════════════════════════

  var usersPage = 1;

  async function renderUsers(container) {
    container.innerHTML = '<p>Chargement...</p>';
    try {
      var result = await apiGet('/users?page=' + usersPage + '&limit=15');
      var users = result.data || [];
      var pagination = result.pagination || { page: 1, totalPages: 1 };

      var html = '<div class="admin-header"><h1>Utilisateurs</h1></div>';

      html += '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
        '<th>Nom</th><th>Email</th><th>Rôle</th><th>Actif</th><th>Inscription</th>' +
        '</tr></thead><tbody>';

      for (var i = 0; i < users.length; i++) {
        var u = users[i];
        var fullName = ((u.first_name || '') + ' ' + (u.last_name || '')).trim() || '-';
        html += '<tr>' +
          '<td>' + esc(fullName) + '</td>' +
          '<td>' + esc(u.email) + '</td>' +
          '<td><select class="user-role-select" data-user-id="' + u.id + '" style="padding:4px 8px;border-radius:4px;border:1px solid var(--border);background:var(--surface);color:var(--fg);font-size:.813rem">' +
            '<option value="customer"' + (u.role === 'customer' ? ' selected' : '') + '>client</option>' +
            '<option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>admin</option>' +
          '</select></td>' +
          '<td><button class="btn btn-outline btn-sm user-active-toggle" data-user-id="' + u.id + '" data-active="' + (u.is_active ? '1' : '0') + '" style="font-size:.75rem;padding:4px 10px">' +
            (u.is_active ? 'Désactiver' : 'Activer') + '</button></td>' +
          '<td>' + formatDate(u.created_at) + '</td>' +
          '</tr>';
      }
      if (!users.length) html += '<tr><td colspan="5">Aucun utilisateur</td></tr>';
      html += '</tbody></table></div>';

      html += paginationHTML(pagination.page, pagination.totalPages, function () {});

      container.innerHTML = html;

      // Role change
      var roleSelects = container.querySelectorAll('.user-role-select');
      for (var rs = 0; rs < roleSelects.length; rs++) {
        roleSelects[rs].addEventListener('change', async function () {
          var userId = this.dataset.userId;
          var newRole = this.value;
          try {
            await apiPut('/users/' + userId + '/role', { role: newRole });
            showToast('Rôle mis à jour');
          } catch (err) {
            showToast(err.message, true);
            renderUsers(container);
          }
        });
      }

      // Active toggle
      var activeBtns = container.querySelectorAll('.user-active-toggle');
      for (var ab = 0; ab < activeBtns.length; ab++) {
        activeBtns[ab].addEventListener('click', async function () {
          var userId = this.dataset.userId;
          try {
            await apiPut('/users/' + userId + '/deactivate', {});
            showToast('Statut mis à jour');
            renderUsers(container);
          } catch (err) {
            showToast(err.message, true);
          }
        });
      }

      // Pagination
      bindPagination(container, function (pg) {
        usersPage = pg;
        renderUsers(container);
      });
    } catch (err) {
      if (err.status === 401) { showAdminLogin(); return; }
      container.innerHTML = '<p class="error">Erreur: ' + esc(err.message) + '</p>';
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // REVIEWS MANAGEMENT
  // ════════════════════════════════════════════════════════════════════

  var reviewsPage = 1;

  async function renderReviews(container) {
    container.innerHTML = '<p>Chargement...</p>';
    try {
      var result = await apiGet('/reviews?page=' + reviewsPage + '&limit=15');
      var reviews = result.data || [];
      var pagination = result.pagination || { page: 1, totalPages: 1 };

      var html = '<div class="admin-header"><h1>Avis</h1></div>';

      html += '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
        '<th>Produit</th><th>Auteur</th><th>Note</th><th>Texte</th><th>Approuvé</th><th>Date</th><th>Actions</th>' +
        '</tr></thead><tbody>';

      for (var i = 0; i < reviews.length; i++) {
        var rv = reviews[i];
        var reviewer = ((rv.first_name || '') + ' ' + (rv.last_name || '')).trim() || esc(rv.user_email || rv.email || '-');
        var textTrunc = (rv.text || '').length > 80 ? (rv.text || '').substring(0, 80) + '...' : (rv.text || '');
        html += '<tr>' +
          '<td>' + esc(rv.product_name || rv.product_id) + '</td>' +
          '<td>' + esc(reviewer) + '</td>' +
          '<td>' + starsHTML(rv.rating) + '</td>' +
          '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">' + esc(textTrunc) + '</td>' +
          '<td><button class="btn btn-outline btn-sm review-approve-btn" data-review-id="' + rv.id + '" data-approved="' + (rv.is_approved ? '1' : '0') + '">' +
            (rv.is_approved ? 'Approuvé' : 'En attente') + '</button></td>' +
          '<td>' + formatDate(rv.created_at) + '</td>' +
          '<td class="actions">' +
            '<button class="btn btn-outline btn-sm" data-delete-review="' + rv.id + '" style="color:var(--danger)">Supprimer</button>' +
          '</td></tr>';
      }
      if (!reviews.length) html += '<tr><td colspan="7">Aucun avis</td></tr>';
      html += '</tbody></table></div>';

      html += paginationHTML(pagination.page, pagination.totalPages, function () {});

      container.innerHTML = html;

      // Approve toggle
      var approveBtns = container.querySelectorAll('.review-approve-btn');
      for (var ap = 0; ap < approveBtns.length; ap++) {
        approveBtns[ap].addEventListener('click', async function () {
          var reviewId = this.dataset.reviewId;
          try {
            await apiPut('/reviews/' + reviewId + '/approve', {});
            showToast('Approbation mise à jour');
            renderReviews(container);
          } catch (err) {
            showToast(err.message, true);
          }
        });
      }

      // Delete buttons
      var delBtns = container.querySelectorAll('[data-delete-review]');
      for (var d = 0; d < delBtns.length; d++) {
        delBtns[d].addEventListener('click', function () {
          var reviewId = this.dataset.deleteReview;
          confirmDialog('Supprimer cet avis ?', function () {
            apiDelete('/reviews/' + reviewId).then(function () {
              showToast('Avis supprimé');
              renderReviews(container);
            }).catch(function (err) { showToast(err.message, true); });
          });
        });
      }

      // Pagination
      bindPagination(container, function (pg) {
        reviewsPage = pg;
        renderReviews(container);
      });
    } catch (err) {
      if (err.status === 401) { showAdminLogin(); return; }
      container.innerHTML = '<p class="error">Erreur: ' + esc(err.message) + '</p>';
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // KEYS MANAGEMENT
  // ════════════════════════════════════════════════════════════════════

  async function renderKeys(container) {
    container.innerHTML = '<p>Chargement...</p>';
    try {
      var products = await apiGet('/products?limit=100&isActive=1');
      var list = products.data || products || [];

      var html = '<div class="admin-header"><h1>Gestion des clés</h1></div>';

      html += '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
        '<th>Produit</th><th>Type</th><th>Disponibles</th><th>Assignées</th><th>Total</th><th>Actions</th>' +
        '</tr></thead><tbody>';

      for (var i = 0; i < list.length; i++) {
        var pr = list[i];
        var dtLabel = (pr.delivery_type === 'account') ? 'Compte' : 'Clé';
        html += '<tr data-key-product="' + pr.id + '">' +
          '<td>' + esc(pr.name) + '</td>' +
          '<td><span class="key-type-badge key-type-' + (pr.delivery_type || 'key') + '">' + dtLabel + '</span></td>' +
          '<td class="key-count-available" id="keyAvail' + pr.id + '">-</td>' +
          '<td class="key-count-assigned" id="keyAssigned' + pr.id + '">-</td>' +
          '<td class="key-count-total" id="keyTotal' + pr.id + '">-</td>' +
          '<td><button class="btn btn-outline btn-sm" data-manage-keys="' + pr.id + '">Gérer</button></td>' +
        '</tr>';
      }
      if (!list.length) html += '<tr><td colspan="6">Aucun produit</td></tr>';
      html += '</tbody></table></div>';

      container.innerHTML = html;

      // Load key counts for each product
      for (var k = 0; k < list.length; k++) {
        (function (productId) {
          apiGet('/products/' + productId + '/keys/count').then(function (counts) {
            var availEl = document.getElementById('keyAvail' + productId);
            var assignedEl = document.getElementById('keyAssigned' + productId);
            var totalEl = document.getElementById('keyTotal' + productId);
            if (availEl) availEl.textContent = counts.available;
            if (assignedEl) assignedEl.textContent = counts.assigned;
            if (totalEl) totalEl.textContent = counts.total;
          }).catch(function () {});
        })(list[k].id);
      }

      // Bind manage buttons
      var manageBtns = container.querySelectorAll('[data-manage-keys]');
      for (var m = 0; m < manageBtns.length; m++) {
        manageBtns[m].addEventListener('click', function () {
          var id = parseInt(this.dataset.manageKeys, 10);
          showKeyManager(container, id);
        });
      }
    } catch (err) {
      if (err.status === 401) { showAdminLogin(); return; }
      container.innerHTML = '<p class="error">Erreur: ' + esc(err.message) + '</p>';
    }
  }

  async function showKeyManager(container, productId) {
    container.innerHTML = '<p>Chargement...</p>';
    try {
      var product = await apiGet('/products/' + productId);
      var keys = await apiGet('/products/' + productId + '/keys');
      var isAccount = (product.delivery_type === 'account');

      var html = '<div class="admin-header"><h1>Clés — ' + esc(product.name) + '</h1>' +
        '<div class="admin-header-bar">' +
          '<span class="key-type-badge key-type-' + (product.delivery_type || 'key') + '">' + (isAccount ? 'Compte partagé' : 'Clé CD') + '</span>' +
          '<button class="btn btn-ghost" id="keysBack">← Retour</button>' +
        '</div></div>';

      // Add key form
      html += '<div class="key-add-form">';
      if (isAccount) {
        html += '<h3>Ajouter un compte</h3>' +
          '<div class="form-grid">' +
            fieldGroup('Nom d\'utilisateur', '<input type="text" id="newKeyUsername" placeholder="email@exemple.com" style="width:100%">') +
            fieldGroup('Mot de passe', '<input type="text" id="newKeyPassword" placeholder="Mot de passe du compte" style="width:100%">') +
          '</div>' +
          '<button class="btn btn-primary" id="addKeyBtn" style="margin-top:12px">+ Ajouter le compte</button>';
      } else {
        html += '<h3>Ajouter une clé</h3>' +
          '<div class="form-grid">' +
            fieldGroup('Clé CD', '<input type="text" id="newKeyValue" placeholder="XXXXX-XXXXX-XXXXX" style="width:100%">') +
          '</div>' +
          '<button class="btn btn-primary" id="addKeyBtn" style="margin-top:12px">+ Ajouter la clé</button>';
      }
      html += '</div>';

      // Keys table
      html += '<div class="admin-table-wrap" style="margin-top:24px"><table class="admin-table"><thead><tr>' +
        '<th>ID</th><th>' + (isAccount ? 'Utilisateur' : 'Clé') + '</th><th>Statut</th><th>Assignée à</th><th>Date</th><th>Actions</th>' +
        '</tr></thead><tbody>';

      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var statusLabel = { available: 'Disponible', assigned: 'Assignée', revoked: 'Révoquée' };
        var displayVal = isAccount ? esc(key.account_username || '') : esc(key.key_value || '');
        var maskedVal = isAccount
          ? maskAccountUsername(key.account_username)
          : maskKeyValue(key.key_value);
        html += '<tr>' +
          '<td>' + key.id + '</td>' +
          '<td class="mono" style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + displayVal + '">' + esc(maskedVal) + '</td>' +
          '<td><span class="key-status-badge key-status-' + key.status + '">' + (statusLabel[key.status] || key.status) + '</span></td>' +
          '<td>' + (key.assigned_order_item_id ? 'Item #' + key.assigned_order_item_id : '-') + '</td>' +
          '<td>' + formatDate(key.created_at) + '</td>' +
          '<td>' + (key.status === 'available'
            ? '<button class="btn btn-outline btn-sm" data-delete-key="' + key.id + '" style="color:var(--danger)">Supprimer</button>'
            : '<span style="color:var(--muted);font-size:.75rem">-</span>') +
          '</td></tr>';
      }
      if (!keys.length) html += '<tr><td colspan="6">Aucune clé ajoutée</td></tr>';
      html += '</tbody></table></div>';

      container.innerHTML = html;

      // Back button
      var backBtn = document.getElementById('keysBack');
      if (backBtn) backBtn.addEventListener('click', function () { renderKeys(container); });

      // Add key button
      var addBtn = document.getElementById('addKeyBtn');
      if (addBtn) addBtn.addEventListener('click', async function () {
        var body = {};
        if (isAccount) {
          body.accountUsername = document.getElementById('newKeyUsername').value.trim();
          body.accountPassword = document.getElementById('newKeyPassword').value.trim();
          if (!body.accountUsername || !body.accountPassword) {
            showToast('Remplissez le nom d\'utilisateur et le mot de passe', true);
            return;
          }
        } else {
          body.keyValue = document.getElementById('newKeyValue').value.trim();
          if (!body.keyValue) {
            showToast('Entrez une clé CD', true);
            return;
          }
        }
        try {
          await apiPost('/products/' + productId + '/keys', body);
          showToast(isAccount ? 'Compte ajouté' : 'Clé ajoutée');
          showKeyManager(container, productId);
        } catch (err) {
          showToast(err.message, true);
        }
      });

      // Delete buttons
      var delBtns = container.querySelectorAll('[data-delete-key]');
      for (var d = 0; d < delBtns.length; d++) {
        delBtns[d].addEventListener('click', function () {
          var keyId = this.dataset.deleteKey;
          confirmDialog('Supprimer cette clé ?', function () {
            apiDelete('/products/' + productId + '/keys/' + keyId).then(function () {
              showToast('Clé supprimée');
              showKeyManager(container, productId);
            }).catch(function (err) { showToast(err.message, true); });
          });
        });
      }
    } catch (err) {
      if (err.status === 401) { showAdminLogin(); return; }
      container.innerHTML = '<p class="error">Erreur: ' + esc(err.message) + '</p>';
    }
  }

  function maskKeyValue(key) {
    if (!key) return '';
    var parts = key.split(/[-\s]+/);
    if (parts.length > 1) return parts.slice(0, -1).join('-') + '-*****';
    if (key.length > 6) return key.slice(0, 6) + '*****';
    return '*****';
  }

  function maskAccountUsername(username) {
    if (!username) return '';
    if (username.length <= 2) return '*****';
    return username[0] + '*****' + username.split('@')[0].slice(-1) + (username.indexOf('@') !== -1 ? '@***' : '');
  }

  // ════════════════════════════════════════════════════════════════════
  // STEAM BROWSER
  // ════════════════════════════════════════════════════════════════════

  var POPULAR_STEAM_GAMES = [
    { id: 730, name: 'Counter-Strike 2' },
    { id: 1245620, name: 'Elden Ring' },
    { id: 1091500, name: 'Cyberpunk 2077' },
    { id: 1174180, name: 'Red Dead Redemption 2' },
    { id: 1551360, name: 'Forza Horizon 5' },
    { id: 1086940, name: "Baldur's Gate 3" },
    { id: 1172470, name: 'Apex Legends' },
    { id: 359550, name: 'Rainbow Six Siege' },
    { id: 1593500, name: 'God of War' },
    { id: 374320, name: 'Dark Souls III' },
    { id: 814380, name: 'Sekiro' },
    { id: 892970, name: 'Valheim' },
    { id: 105600, name: 'Terraria' },
    { id: 578080, name: 'PUBG' },
    { id: 548430, name: 'Deep Rock Galactic' },
    { id: 381210, name: 'Dead by Daylight' },
    { id: 413150, name: 'Stardew Valley' },
    { id: 431960, name: 'Wallpaper Engine' },
    { id: 255710, name: 'Cities: Skylines' },
    { id: 1057090, name: 'Ori and the Will of the Wisps' },
    { id: 632470, name: 'Risk of Rain 2' },
    { id: 1426210, name: 'It Takes Two' },
    { id: 1687950, name: 'Hogwarts Legacy' },
    { id: 582010, name: 'Monster Hunter: World' },
    { id: 427520, name: 'Factorio' },
    { id: 646570, name: 'Slay the Spire' },
    { id: 367520, name: 'Hollow Knight' },
    { id: 292030, name: 'The Witcher 3' },
    { id: 236390, name: 'Warhammer: Vermintide 2' },
    { id: 1203210, name: 'The Witcher 3 Next-Gen' }
  ];

  function showSteamBrowser(container) {
    var html = '<div class="admin-header">' +
      '<h1>Ajouter depuis Steam</h1>' +
      '<div class="admin-header-bar">' +
        '<input type="text" id="steamSearch" placeholder="Rechercher un jeu Steam…" style="flex:1;padding:8px 12px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--fg);font-size:.875rem">' +
        '<button class="btn btn-outline" id="steamSearchBtn">Rechercher</button>' +
        '<span style="color:var(--muted);font-size:.813rem;margin-left:8px">ou App ID :</span>' +
        '<input type="number" id="steamAppId" placeholder="730" style="width:100px;padding:8px 12px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--fg);font-size:.875rem">' +
        '<button class="btn btn-outline" id="steamAppIdBtn">OK</button>' +
        '<button class="btn btn-ghost" id="steamBack" style="margin-left:auto">← Retour</button>' +
      '</div></div>';

    html += '<h2 style="font-size:.938rem;font-weight:700;margin-bottom:14px;color:var(--fg-secondary)">Jeux populaires</h2>';
    html += '<div class="steam-grid">';
    for (var i = 0; i < POPULAR_STEAM_GAMES.length; i++) {
      var g = POPULAR_STEAM_GAMES[i];
      html += '<div class="steam-card" data-appid="' + g.id + '">' +
        '<img class="steam-card-img" src="https://cdn.akamai.steamstatic.com/steam/apps/' + g.id + '/capsule_184x69.jpg" alt="' + esc(g.name) + '" loading="lazy" onerror="this.style.display=\'none\'">' +
        '<div class="steam-card-name">' + esc(g.name) + '</div>' +
      '</div>';
    }
    html += '</div>';

    html += '<div id="steamResults" style="margin-top:24px"></div>';

    container.innerHTML = html;

    var searchInput = document.getElementById('steamSearch');
    var searchBtn = document.getElementById('steamSearchBtn');
    if (searchBtn) searchBtn.addEventListener('click', function () {
      var q = searchInput.value.trim();
      if (q) steamSearch(container, q);
    });
    if (searchInput) searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { var q = searchInput.value.trim(); if (q) steamSearch(container, q); }
    });

    var appIdInput = document.getElementById('steamAppId');
    var appIdBtn = document.getElementById('steamAppIdBtn');
    if (appIdBtn) appIdBtn.addEventListener('click', function () {
      var id = parseInt(appIdInput.value, 10);
      if (id) selectSteamGame(container, id);
    });
    if (appIdInput) appIdInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { var id = parseInt(appIdInput.value, 10); if (id) selectSteamGame(container, id); }
    });

    var backBtn = document.getElementById('steamBack');
    if (backBtn) backBtn.addEventListener('click', function () { renderProducts(container); });

    var cards = container.querySelectorAll('.steam-card');
    for (var c = 0; c < cards.length; c++) {
      cards[c].addEventListener('click', function () {
        selectSteamGame(container, parseInt(this.dataset.appid, 10));
      });
    }
  }

  async function steamSearch(container, query) {
    var resultsEl = document.getElementById('steamResults');
    if (!resultsEl) return;
    resultsEl.innerHTML = '<div class="steam-loading"><div class="loading-spinner"></div> Recherche…</div>';

    try {
      var items = await apiGet('/steam/search?q=' + encodeURIComponent(query));
      if (!items.length) {
        resultsEl.innerHTML = '<p style="color:var(--muted);padding:20px 0">Aucun résultat sur Steam.</p>';
        return;
      }

      var html = '<h2 style="font-size:.938rem;font-weight:700;margin-bottom:14px;color:var(--fg-secondary)">Résultats</h2><div class="steam-grid">';
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var img = item.image
          ? '<img class="steam-card-img" src="' + esc(item.image) + '" alt="' + esc(item.name) + '" loading="lazy" onerror="this.style.display=\'none\'">'
          : '';
        html += '<div class="steam-card" data-appid="' + item.id + '">' +
          img +
          '<div class="steam-card-name">' + esc(item.name) + '</div>' +
          '<div class="steam-card-id">App ' + item.id + '</div>' +
        '</div>';
      }
      html += '</div>';
      resultsEl.innerHTML = html;

      var cards = resultsEl.querySelectorAll('.steam-card');
      for (var c = 0; c < cards.length; c++) {
        cards[c].addEventListener('click', function () {
          selectSteamGame(container, parseInt(this.dataset.appid, 10));
        });
      }
    } catch (err) {
      resultsEl.innerHTML = '<p style="color:var(--danger)">Erreur : ' + esc(err.message) + '</p>';
    }
  }

  async function selectSteamGame(container, appId) {
    container.innerHTML = '<div class="steam-loading"><div class="loading-spinner"></div> Chargement depuis Steam…</div>';

    try {
      var g = await apiGet('/steam/game/' + appId);

      var product = {
        name: g.name,
        description: g.description,
        platform_id: 1,
        platform_name: 'Steam',
        platform_slug: 'steam',
        region: 'Global',
        activation: 'Steam Client',
        original_price: g.price ? g.price.initial : 0,
        sale_price: g.price ? g.price.final : 0,
        discount_percent: g.price ? g.price.discount_percent : 0,
        image_url: g.headerImage,
        stock: 100,
        is_active: true,
        os_req: g.requirements.os,
        cpu_req: g.requirements.cpu,
        ram_req: g.requirements.ram,
        gpu_req: g.requirements.gpu,
        genres: []
      };

      // Match Steam genres with our genre table
      var ourGenres = await loadGenres();
      var steamGenres = g.genres || [];
      var matched = [];
      for (var i = 0; i < steamGenres.length; i++) {
        var sg = steamGenres[i].toLowerCase();
        for (var j = 0; j < ourGenres.length; j++) {
          var gn = ourGenres[j].name.toLowerCase();
          if (gn === sg ||
              (sg === 'adventure' && gn === 'aventure') ||
              (sg === 'strategy' && gn === 'stratégie') ||
              (sg === 'sports' && gn === 'sport') ||
              (sg === 'horror' && gn === 'horreur') ||
              (sg === 'massively multiplayer' && gn === 'multijoueur')) {
            matched.push(ourGenres[j]);
            break;
          }
        }
      }
      product.genres = matched;

      showProductForm(container, product);
      showToast('Données Steam chargées — ajustez et enregistrez');
    } catch (err) {
      showToast(err.message, true);
      renderProducts(container);
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // INIT
  // ════════════════════════════════════════════════════════════════════

  async function initAdmin() {
    var ok = await checkAdmin();
    if (!ok) return;

    // Update user greeting
    var greetEl = document.getElementById('adminGreeting');
    if (greetEl && adminUser) {
      greetEl.textContent = 'Bonjour, ' + (adminUser.firstName || adminUser.first_name || 'Admin');
    }

    renderSidebar();
    renderSection();
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
  } else {
    initAdmin();
  }

})();
