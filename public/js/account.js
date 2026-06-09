// account.js — Account page
let activeTab = 'orders';

async function renderAccount() {
  const el = document.getElementById('accountContent');
  const user = getCurrentUser();

  if (!user) {
    el.innerHTML = `<div class="cart-empty"><h2 style="font-family:var(--font-display);margin-bottom:8px">Mon compte</h2><p style="color:var(--muted);margin-bottom:20px;font-size:.875rem">Connectez-vous pour accéder à votre compte</p><button class="btn btn-primary" onclick="showLoginModal()">Se connecter</button></div>`;
    return;
  }

  const initial = ((user.first_name || user.email || '?')[0] || '?').toUpperCase();

  el.innerHTML = `<div class="account-layout">
    <aside class="account-sidebar">
      <div class="account-avatar">${escHTML(initial)}</div>
      <div class="name">${escHTML(user.first_name || '')} ${escHTML(user.last_name || '')}</div>
      <div class="email">${escHTML(user.email || '')}</div>
      <nav class="account-nav">
        <button class="${activeTab==='orders'?'active':''}" onclick="switchAccountTab('orders',this)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Commandes
        </button>
        <button class="${activeTab==='wishlist'?'active':''}" onclick="switchAccountTab('wishlist',this)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          Favoris
        </button>
        <button class="${activeTab==='settings'?'active':''}" onclick="switchAccountTab('settings',this)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Paramètres
        </button>
        <button onclick="logout();navigate('home')" style="color:var(--danger);margin-top:12px">Déconnexion</button>
      </nav>
    </aside>
    <div id="accountPanel" class="account-panel"></div>
  </div>`;

  switchAccountTab(activeTab);
}

function switchAccountTab(tab, btn) {
  activeTab = tab;
  document.querySelectorAll('.account-nav button').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const panel = document.getElementById('accountPanel');
  if (!panel) return;

  if (tab === 'orders') renderOrders(panel);
  else if (tab === 'wishlist') renderWishlist(panel);
  else if (tab === 'settings') renderSettings(panel);
}

async function renderOrders(panel) {
  panel.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
  try {
    const data = await apiGet('/orders');
    const orders = data.data || data;
    if (!orders.length) { panel.innerHTML = '<h2>Historique des commandes</h2><p style="color:var(--muted)">Aucune commande pour le moment.</p>'; return; }

    panel.innerHTML = `<h2>Historique des commandes</h2>${orders.map(o => {
      const date = o.created_at ? new Date(o.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      const statusClass = o.status === 'delivered' ? 'delivered' : o.status === 'cancelled' || o.status === 'refunded' ? 'cancelled' : 'pending';
      const statusLabel = {pending:'En attente',paid:'Payé',processing:'En cours',delivered:'Livré',cancelled:'Annulé',refunded:'Remboursé'}[o.status] || o.status;
      const hasKey = (o.items || []).some(i => i.assigned_key || i.account_username);
      const keyIcon = hasKey ? ' 🔑' : '';
      return `<div class="order-row" style="cursor:pointer" onclick="showOrderDetail(${o.id})"><div><div class="game-name">${escHTML((o.items||[]).map(i=>i.product_name).join(', '))}${keyIcon}</div><div class="order-id">#${escHTML(o.order_number)}</div><div class="order-date">${date}</div></div><div style="text-align:right"><div style="font-family:var(--font-mono);font-weight:700;font-size:.938rem">${fmtPrice(o.total)}</div><span class="order-status ${statusClass}">${statusLabel}</span></div></div>`;
    }).join('')}`;
  } catch (err) { panel.innerHTML = `<p style="color:var(--danger)">Erreur : ${err.message}</p>`; }
}

async function showOrderDetail(orderId) {
  const panel = document.getElementById('accountPanel');
  if (!panel) return;
  panel.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';

  try {
    const order = await apiGet('/orders/' + orderId);
    const date = order.created_at ? new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    const statusLabel = {pending:'En attente',paid:'Payé',processing:'En cours',delivered:'Livré',cancelled:'Annulé',refunded:'Remboursé'}[order.status] || order.status;
    const statusClass = order.status === 'delivered' ? 'delivered' : order.status === 'cancelled' || order.status === 'refunded' ? 'cancelled' : 'pending';
    const isPaidOrDelivered = ['paid', 'delivered'].includes(order.status);

    let html = `<button class="btn btn-ghost" onclick="switchAccountTab('orders')" style="margin-bottom:16px">← Retour aux commandes</button>`;
    html += `<h2>Commande #${escHTML(order.order_number)}</h2>`;
    html += `<div style="display:flex;gap:24px;align-items:center;margin:16px 0;flex-wrap:wrap">`;
    html += `<span class="order-status ${statusClass}">${statusLabel}</span>`;
    html += `<span style="color:var(--muted);font-size:.875rem">${date}</span>`;
    html += `<span style="font-family:var(--font-mono);font-weight:700;font-size:1rem">${fmtPrice(order.total)}</span>`;
    html += `</div>`;
    if (order.payment_reference && order.status === 'pending') {
      html += `<div style="margin-top:12px;padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface)"><div style="font-size:.75rem;color:var(--muted);margin-bottom:4px">Référence de paiement</div><div class="mono" style="font-weight:700">${escHTML(order.payment_reference)}</div></div>`;
    }

    html += `<div style="margin-top:20px">`;
    for (const item of (order.items || [])) {
      html += `<div class="order-detail-item">`;
      html += `<div class="order-detail-item-header">`;
      html += `<span style="font-weight:600">${escHTML(item.product_name)}</span>`;
      html += `<span style="color:var(--muted);font-size:.875rem">${fmtPrice(item.unit_price)}</span>`;
      html += `</div>`;

      if (item.assigned_key || item.account_username) {
        const isAccount = item.delivery_type === 'account';
        html += `<div class="key-card" data-order-item="${item.id}">`;
        html += `<div class="key-card__type">${isAccount ? '🔐 Compte partagé' : '🔑 Clé CD'}</div>`;

        if (isAccount) {
          html += `<div class="key-card__account">`;
          html += `<div class="key-card__field"><span class="key-card__label">Utilisateur</span><span class="key-card__masked" id="maskedUser${item.id}">${escHTML(item.account_username)}</span></div>`;
          html += `<div class="key-card__field"><span class="key-card__label">Mot de passe</span><span class="key-card__masked" id="maskedPass${item.id}">${escHTML(item.account_password)}</span></div>`;
          html += `</div>`;
          html += `<button class="btn btn-primary key-card__reveal-btn" data-reveal-item="${item.id}" data-reveal-order="${order.id}" ${!isPaidOrDelivered ? 'disabled' : ''}>Révéler mes identifiants</button>`;
        } else {
          html += `<div class="key-card__key-display"><span class="key-card__masked" id="maskedKey${item.id}">${escHTML(item.assigned_key)}</span></div>`;
          html += `<button class="btn btn-primary key-card__reveal-btn" data-reveal-item="${item.id}" data-reveal-order="${order.id}" ${!isPaidOrDelivered ? 'disabled' : ''}>Révéler ma clé</button>`;
        }

        if (item.key_revealed_at) {
          const revealDate = new Date(item.key_revealed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          html += `<div class="key-card__revealed-at">Révélée le ${revealDate}</div>`;
        }
        html += `</div>`;
      } else if (isPaidOrDelivered) {
        html += `<div class="key-card key-card--waiting">`;
        html += `<div class="key-card__type">⏳ En attente de livraison</div>`;
        html += `<p style="color:var(--muted);font-size:.875rem;margin:8px 0">Votre clé sera disponible prochainement.</p>`;
        html += `</div>`;
      }

      html += `</div>`;
    }
    html += `</div>`;

    panel.innerHTML = html;

    const revealBtns = panel.querySelectorAll('.key-card__reveal-btn');
    revealBtns.forEach(btn => {
      btn.addEventListener('click', async function () {
        const itemId = this.dataset.revealItem;
        const orderId = this.dataset.revealOrder;
        this.disabled = true;
        this.textContent = 'Chargement...';

        try {
          const result = await apiPost('/orders/' + orderId + '/items/' + itemId + '/reveal');
          const isAccount = result.deliveryType === 'account';

          if (isAccount) {
            const userEl = document.getElementById('maskedUser' + itemId);
            const passEl = document.getElementById('maskedPass' + itemId);
            if (userEl) { userEl.textContent = result.accountUsername; userEl.classList.add('key-card__revealed'); }
            if (passEl) { passEl.textContent = result.accountPassword; passEl.classList.add('key-card__revealed'); }
            const copyRow = document.createElement('div');
            copyRow.className = 'key-card__copy-row';
            copyRow.innerHTML = `<button class="btn btn-outline btn-sm key-card__copy-btn" data-copy-text="${encodeURIComponent(result.accountUsername)}">Copier l'utilisateur</button>` +
              `<button class="btn btn-outline btn-sm key-card__copy-btn" data-copy-text="${encodeURIComponent(result.accountPassword)}">Copier le mot de passe</button>`;
            this.replaceWith(copyRow);
            copyRow.querySelectorAll('.key-card__copy-btn').forEach(cb => {
              cb.addEventListener('click', function () { copyToClipboard(decodeURIComponent(this.dataset.copyText)); });
            });
          } else {
            const keyEl = document.getElementById('maskedKey' + itemId);
            if (keyEl) { keyEl.textContent = result.key; keyEl.classList.add('key-card__revealed'); }
            this.textContent = 'Copier la clé';
            this.classList.remove('btn-primary');
            this.classList.add('btn-outline');
            const revealBtn = this;
            const keyText = result.key;
            this.addEventListener('click', function () { copyToClipboard(keyText); });
          }
        } catch (err) {
          this.disabled = false;
          this.textContent = 'Erreur — Réessayer';
          showToast(err.message, true);
        }
      });
    });
  } catch (err) {
    panel.innerHTML = `<p style="color:var(--danger)">Erreur : ${err.message}</p>`;
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copié dans le presse-papiers');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast('Copié dans le presse-papiers');
  });
}

async function renderWishlist(panel) {
  panel.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
  try {
    const items = await apiGet('/wishlist');
    const wl = Array.isArray(items) ? items : items.value || items.data || [];
    if (!wl.length) { panel.innerHTML = '<h2>Favoris</h2><p style="color:var(--muted)">Votre liste de favoris est vide.</p>'; return; }

    panel.innerHTML = `<h2>Favoris</h2><div class="wishlist-grid">${wl.map(i => {
      const slug = i.platform_slug || 'giftcard';
      const gradient = PLATFORM_GRADIENTS[slug] || PLATFORM_GRADIENTS.giftcard;
      const imgBlock = i.image_url
        ? `<img src="${escHTML(i.image_url)}" style="width:100%;height:100%;object-fit:cover">`
        : `<div class="img-inner" style="background:${gradient}">${escHTML(i.name)}</div>`;
      return `<div class="wishlist-item" onclick="navigate('product',${i.product_id})"><div class="wl-img">${imgBlock}</div><div class="wl-name">${escHTML(i.name)}</div><div class="badge-platform">${escHTML(i.platform_name || '')}</div><div class="price-new" style="margin-top:6px">${fmtPrice(i.sale_price)}</div></div>`;
    }).join('')}</div>`;
  } catch (err) { panel.innerHTML = `<p style="color:var(--danger)">Erreur : ${err.message}</p>`; }
}

async function renderSettings(panel) {
  const user = getCurrentUser() || {};
  panel.innerHTML = `<h2>Paramètres du compte</h2>
    <div style="margin-top:16px"><label style="display:block;font-size:.813rem;color:var(--muted);margin-bottom:6px">Prénom</label><input type="text" value="${escHTML(user.first_name || '')}" class="input-field" id="settingsFirstName"><label style="display:block;font-size:.813rem;color:var(--muted);margin-bottom:6px;margin-top:20px">Email</label><input type="email" value="${escHTML(user.email || '')}" class="input-field" id="settingsEmail"><button class="btn btn-primary" style="margin-top:20px" onclick="saveSettings()">Enregistrer</button></div>`;
}

async function saveSettings() {
  const firstName = document.getElementById('settingsFirstName')?.value?.trim();
  const email = document.getElementById('settingsEmail')?.value?.trim();
  try {
    await apiPut('/auth/me', { firstName, email });
    await initAuth();
    showToast('Profil mis à jour');
  } catch (err) { showToast(err.message || 'Erreur'); }
}
