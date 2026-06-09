// product.js — Product detail page
async function renderProduct(id) {
  const el = document.getElementById('productContent');
  el.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';

  try {
    const g = await apiGet('/products/' + id);
    if (!g) { el.innerHTML = '<p>Produit introuvable.</p>'; return; }

    const slug = g.platform_slug || 'giftcard';
    const gradient = PLATFORM_GRADIENTS[slug] || PLATFORM_GRADIENTS.giftcard;
    const d = g.discount_percent > 0;
    const imageBlock = g.image_url
      ? `<img src="${escHTML(g.image_url)}" alt="${escHTML(g.name)}" style="width:100%;height:100%;object-fit:cover">`
      : `<div class="img-inner" style="background:${gradient}">${escHTML(g.name)}</div>`;

    // Reviews
    let reviews = [];
    try {
      const rData = await apiGet('/products/' + id + '/reviews');
      reviews = rData.data || rData;
    } catch (_) {}

    const reviewsHTML = reviews.map(r => {
      const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      return `<div class="review-card" style="margin-bottom:10px"><div class="review-header"><span class="reviewer" style="font-size:.75rem">${escHTML(r.first_name || '')} ${escHTML(r.last_name || '')}</span><span class="stars">${stars}</span></div><div class="review-text">${escHTML(r.text || '')}</div></div>`;
    }).join('');

    // Similar products
    let similarHTML = '';
    try {
      const sData = await apiGet('/products?platform=' + encodeURIComponent(slug) + '&limit=5');
      const similar = (sData.data || sData).filter(x => x.id !== g.id).slice(0, 4);
      if (similar.length) similarHTML = `<div class="section"><h2 class="section-title">Produits similaires</h2><div class="product-grid">${similar.map(cardHTML).join('')}</div></div>`;
    } catch (_) {}

    // Config req
    const configHTML = g.os_req && g.os_req !== '—' ? `<h2>Configuration requise</h2><ul>
      ${g.os_req ? `<li><strong>OS :</strong> ${escHTML(g.os_req)}</li>` : ''}
      ${g.cpu_req && g.cpu_req !== '—' ? `<li><strong>Processeur :</strong> ${escHTML(g.cpu_req)}</li>` : ''}
      ${g.ram_req && g.ram_req !== '—' ? `<li><strong>Mémoire :</strong> ${escHTML(g.ram_req)}</li>` : ''}
      ${g.gpu_req && g.gpu_req !== '—' ? `<li><strong>GPU :</strong> ${escHTML(g.gpu_req)}</li>` : ''}
    </ul>` : '';

    el.innerHTML = `
    <button class="btn btn-ghost" onclick="navigate('home')" style="margin-bottom:20px;color:var(--muted);font-size:.875rem">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><polyline points="15 18 9 12 15 6"/></svg>
      Retour
    </button>
    <div class="detail-grid">
      <div class="detail-gallery">
        <div class="detail-main">${imageBlock}</div>
        <div class="detail-desc">
          <h2>Description</h2><p>${escHTML(g.description || '')}</p>
          ${configHTML}
        </div>
      </div>
      <div class="detail-sidebar">
        <h1 class="game-name">${escHTML(g.name)}</h1>
        <div class="platform-badge">${escHTML(g.platform_name || g.platform_slug || '')}</div>
        <div class="detail-meta-grid">
          <dt>Plateforme</dt><dd>${escHTML(g.platform_name || '')}</dd>
          <dt>Région</dt><dd>${escHTML(g.region || 'Global')}</dd>
          <dt>Activation</dt><dd>${escHTML(g.activation || '')}</dd>
        </div>
        <div class="detail-price-block">
          <div class="detail-price-row">
            ${d ? `<span class="price-old" style="font-size:1.063rem">${fmtPrice(g.original_price)}</span>` : ''}
            <span class="price-new" style="font-size:1.75rem">${fmtPrice(g.sale_price)}</span>
            ${d ? `<span class="badge-discount" style="font-size:.813rem;padding:5px 10px">—${g.discount_percent}%</span>` : ''}
          </div>
          <button class="btn btn-primary btn-lg" style="width:100%" onclick="addToCart(${g.id})">Ajouter au panier</button>
        </div>
        <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--border)">
          <h2 style="font-size:.938rem;font-weight:700;margin-bottom:14px;letter-spacing:-.01em">Avis clients</h2>
          ${reviewsHTML || '<p style="color:var(--muted);font-size:.813rem">Aucun avis pour le moment.</p>'}
        </div>
      </div>
    </div>
    ${similarHTML}`;

  } catch (err) {
    el.innerHTML = `<p style="color:var(--danger);text-align:center;padding:60px 0">Erreur : ${err.message}</p>`;
  }
}
