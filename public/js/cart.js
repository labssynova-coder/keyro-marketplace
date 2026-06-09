// cart.js — Cart page
async function addToCart(productId) {
  const user = getCurrentUser();
  if (!user) { showLoginModal(); return; }
  try {
    await apiPost('/cart/items', { productId, quantity: 1 });
    showToast('Ajouté au panier');
    updateCartBadge();
  } catch (err) {
    showToast(err.message || 'Erreur');
  }
}

async function renderCart() {
  const el = document.getElementById('cartContent');
  const user = getCurrentUser();

  if (!user) {
    el.innerHTML = `<div class="cart-empty"><div class="empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></div><h2 style="font-family:var(--font-display);margin-bottom:8px;font-size:1.25rem">Connectez-vous</h2><p style="color:var(--muted);margin-bottom:20px;font-size:.875rem">Connectez-vous pour voir votre panier</p><button class="btn btn-primary" onclick="showLoginModal()">Se connecter</button></div>`;
    return;
  }

  el.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';

  try {
    const data = await apiGet('/cart');
    const items = data.items || [];

    if (!items.length) {
      el.innerHTML = `<div class="cart-empty"><div class="empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></div><h2 style="font-family:var(--font-display);margin-bottom:8px;font-size:1.25rem">Votre panier est vide</h2><p style="color:var(--muted);margin-bottom:20px;font-size:.875rem">Découvrez nos jeux et clés digitales</p><button class="btn btn-primary" onclick="navigate('home')">Voir les jeux</button></div>`;
      return;
    }

    const sub = items.reduce((s, c) => s + Number(c.sale_price) * c.quantity, 0);
    const orig = items.reduce((s, c) => s + Number(c.original_price) * c.quantity, 0);
    const save = orig - sub;

    el.innerHTML = `<div class="cart-layout"><div style="display:flex;flex-direction:column;gap:14px">
      ${items.map(c => {
        const slug = c.platform_slug || 'giftcard';
        const gradient = PLATFORM_GRADIENTS[slug] || PLATFORM_GRADIENTS.giftcard;
        const imgBlock = c.image_url
          ? `<img src="${escHTML(c.image_url)}" style="width:100%;height:100%;object-fit:cover">`
          : `<div class="img-inner" style="background:${gradient}">${escHTML(c.name)}</div>`;
        return `<div class="cart-item"><div class="cart-item-img">${imgBlock}</div><div class="cart-item-info"><div class="name">${escHTML(c.name)}</div><div class="meta">${escHTML(c.platform_name || '')} · ${escHTML(c.region || 'Global')}</div></div><div class="cart-item-actions"><div>${c.discount_percent > 0 ? `<span class="price-old">${fmtPrice(c.original_price)}</span>` : ''}<span class="price-new">${fmtPrice(Number(c.sale_price) * c.quantity)}</span></div><div class="qty-control"><button onclick="updateCartItem(${c.id},-1)">−</button><span class="qty-num">${c.quantity}</span><button onclick="updateCartItem(${c.id},1)">+</button></div><span class="remove-btn" onclick="removeCartItem(${c.id})">Supprimer</span></div></div>`;
      }).join('')}
    </div><div class="cart-summary"><h2>Résumé</h2><div class="summary-line"><span>Sous-total</span><span>${fmtPrice(sub)}</span></div>${save > 0 ? `<div class="summary-line savings"><span>Économie</span><span>−${fmtPrice(save)}</span></div>` : ''}<div class="summary-line total"><span>Total</span><span>${fmtPrice(sub)}</span></div><button class="btn btn-primary btn-lg" style="width:100%;margin-top:20px" onclick="placeOrder()">Payer maintenant</button><button class="btn btn-outline" style="width:100%;margin-top:8px" onclick="navigate('home')">Continuer les achats</button></div></div>`;
  } catch (err) {
    el.innerHTML = `<p style="color:var(--danger)">Erreur : ${err.message}</p>`;
  }
}

async function updateCartItem(cartItemId, delta) {
  try {
    const data = await apiGet('/cart');
    const items = data.items || [];
    const item = items.find(i => i.id === cartItemId);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) { await removeCartItem(cartItemId); return; }
    await apiPut('/cart/items/' + cartItemId, { quantity: newQty });
    renderCart();
    updateCartBadge();
  } catch (err) { showToast(err.message || 'Erreur'); }
}

async function removeCartItem(cartItemId) {
  try {
    await apiDelete('/cart/items/' + cartItemId);
    renderCart();
    updateCartBadge();
  } catch (err) { showToast(err.message || 'Erreur'); }
}

async function placeOrder() {
  try {
    const data = await apiPost('/payments/initiate', {});
    showToast('Commande créée. Finalisez le paiement avec la référence ' + data.paymentReference);
    updateCartBadge();
    navigate('account');
  } catch (err) { showToast(err.message || 'Erreur lors du paiement'); }
}
