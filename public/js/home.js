// home.js — Home page rendering
const PLATFORM_GRADIENTS = {
  steam:       'linear-gradient(135deg,#1b2838 0%,#2a475e 100%)',
  xbox:        'linear-gradient(135deg,#107c10 0%,#0a5a0a 100%)',
  playstation: 'linear-gradient(135deg,#003087 0%,#00008b 100%)',
  nintendo:    'linear-gradient(135deg,#e60012 0%,#3d7a3a 100%)',
  giftcard:    'linear-gradient(135deg,#1b2838 0%,#2a475e 100%)',
  software:    'linear-gradient(135deg,#0078d4 0%,#004578 100%)'
};

function fmtPrice(n) {
  return Number(n).toFixed(2).replace('.', ',') + '€';
}

function cardHTML(product) {
  const slug = product.platform_slug || 'giftcard';
  const gradient = PLATFORM_GRADIENTS[slug] || PLATFORM_GRADIENTS.giftcard;
  const imageBlock = product.image_url
    ? `<img src="${escHTML(product.image_url)}" alt="${escHTML(product.name)}" loading="lazy">`
    : `<div class="card-img-inner" style="background:${gradient}">${escHTML(product.name)}</div>`;

  const discountTag = product.discount_percent > 0
    ? `<div class="discount-badge"><span class="badge-discount">—${product.discount_percent}%</span></div>` : '';

  const originalPrice = product.discount_percent > 0 && product.original_price != product.sale_price
    ? `<span class="price-old">${fmtPrice(product.original_price)}</span>` : '';

  return `
    <div class="product-card" onclick="navigate('product',${product.id})">
      <div class="card-img">${imageBlock}${discountTag}</div>
      <div class="card-body">
        <div class="badge-platform">${escHTML(product.platform_name || '')}</div>
        <div class="name">${escHTML(product.name)}</div>
        <div class="card-bottom">
          <div>${originalPrice}<span class="price-new">${fmtPrice(product.sale_price)}</span></div>
          <button class="card-buy-btn" onclick="event.stopPropagation();addToCart(${product.id})">Acheter</button>
        </div>
      </div>
    </div>`;
}

function sectionHTML(title, products) {
  if (!products || !products.length) return '';
  return `<div class="section"><h2 class="section-title">${escHTML(title)}</h2><div class="product-grid">${products.map(cardHTML).join('')}</div></div>`;
}

let currentCat = 'all';
let searchQ = '';
let homeContentCache = null;

async function loadHomeContent() {
  if (homeContentCache) return homeContentCache;
  try {
    homeContentCache = await apiGet('/site/home-content');
  } catch (_) {
    homeContentCache = {};
  }
  return homeContentCache;
}

function buildHeroHTML(heroProduct, homeContent) {
  const mode = homeContent.heroMode || 'auto';
  const isCustom = mode === 'custom';
  const productId = heroProduct && heroProduct.id ? heroProduct.id : null;
  const title = isCustom && homeContent.heroTitle ? homeContent.heroTitle : (heroProduct ? heroProduct.name : 'Keyro');
  const deck = isCustom && homeContent.heroSubtitle
    ? homeContent.heroSubtitle
    : (heroProduct && heroProduct.description ? heroProduct.description.substring(0, 120) + '...' : '');
  const eyebrow = homeContent.heroEyebrow || (heroProduct ? `Promotion — ${heroProduct.discount_percent || 0}% de réduction` : 'Offres digitales');
  const buttonLabel = homeContent.heroButtonLabel || 'Acheter maintenant';
  const imageUrl = homeContent.heroImageUrl || (heroProduct && heroProduct.image_url) || '';
  const safeImageUrl = String(imageUrl).replace(/['")\\]/g, '');
  const bgStyle = imageUrl
    ? `background-image:url('${safeImageUrl}');background-size:cover;background-position:center right`
    : 'background:radial-gradient(ellipse at 70% 30%,#1a1040 0%,#0d1b2a 30%,#0B0E14 80%)';
  const clickAction = productId ? ` onclick="navigate('product',${productId})"` : '';
  const cta = productId
    ? `<button class="btn btn-primary btn-lg" onclick="event.stopPropagation();addToCart(${productId})">${buttonLabel} →</button>`
    : `<button class="btn btn-primary btn-lg" onclick="event.stopPropagation();filterCategory('all')">${buttonLabel} →</button>`;
  const priceBlock = heroProduct ? `<div class="hero-price">
    <span class="price-old" style="font-size:1.063rem">${fmtPrice(heroProduct.original_price)}</span>
    <span class="price-new" style="font-size:1.375rem">${fmtPrice(heroProduct.sale_price)}</span>
    ${(heroProduct.discount_percent || 0) > 0 ? `<span class="badge-discount" style="font-size:.75rem;padding:4px 9px">—${heroProduct.discount_percent}%</span>` : ''}
  </div>` : '';

  return `<div class="hero"${clickAction}>
    <div class="hero-bg" style="${bgStyle}"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(232,154,45,.08) 0%,transparent 50%)"></div>
    <div class="hero-content">
      <span class="hero-eyebrow"><span class="dot"></span> ${escHTML(eyebrow)}</span>
      <h1 class="hero-title">${escHTML(title)}</h1>
      <p class="hero-deck">${escHTML(deck)}</p>
      ${priceBlock}
      <div class="hero-cta">${cta}</div>
    </div>
  </div>`;
}

async function renderHome() {
  const el = document.getElementById('homeContent');
  if (!el) return;
  el.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';

  try {
    const user = getCurrentUser();
    let products;
    if (searchQ) {
      const data = await apiGet('/products?search=' + encodeURIComponent(searchQ) + '&limit=50');
      products = data.data || data;
      el.innerHTML = products.length
        ? sectionHTML(`Résultats pour « ${searchQ} »`, products)
        : '<p style="color:var(--muted);text-align:center;padding:60px 0">Aucun résultat trouvé.</p>';
      return;
    }

    if (currentCat !== 'all') {
      const data = await apiGet('/products?platform=' + encodeURIComponent(currentCat) + '&limit=50');
      products = data.data || data;
      const label = document.querySelector(`[data-cat="${currentCat}"]`)?.textContent || currentCat;
      el.innerHTML = sectionHTML(label, products);
      return;
    }

    const homeContent = await loadHomeContent();
    const data = await apiGet('/products?limit=50');
    products = data.data || data;

    // Build sections
    const topSales = [...products].sort((a, b) => b.discount_percent - a.discount_percent).slice(0, 4);
    const selectedPromoIds = Array.isArray(homeContent.featuredProductIds) ? homeContent.featuredProductIds.map(Number) : [];
    const selectedPromos = selectedPromoIds
      .map(id => products.find(p => Number(p.id) === id))
      .filter(Boolean);
    const promos = selectedPromos.length
      ? selectedPromos
      : products.filter(g => g.discount_percent >= 25).sort((a, b) => b.discount_percent - a.discount_percent);
    const steam = products.filter(g => g.platform_slug === 'steam');
    const xbox = products.filter(g => g.platform_slug === 'xbox');
    const ps = products.filter(g => g.platform_slug === 'playstation');
    const latest = products.slice(0, 4);

    // Hero (top discount product)
    let heroProduct = topSales[0] || products[0];
    if (homeContent.heroMode === 'product' && homeContent.heroProductId) {
      heroProduct = products.find(p => Number(p.id) === Number(homeContent.heroProductId)) || heroProduct;
    }

    let h = `<div class="hero" onclick="navigate('product',${heroProduct.id})">
      <div class="hero-bg" style="background:radial-gradient(ellipse at 70% 30%,#1a1040 0%,#0d1b2a 30%,#0B0E14 80%)"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(232,154,45,.06) 0%,transparent 50%)"></div>
      <div class="hero-content">
        <span class="hero-eyebrow"><span class="dot"></span> Promotion — ${heroProduct.discount_percent}% de réduction</span>
        <h1 class="hero-title">${heroProduct.name}</h1>
        <p class="hero-deck">${heroProduct.description ? heroProduct.description.substring(0, 120) + '...' : ''}</p>
        <div class="hero-price">
          <span class="price-old" style="font-size:1.063rem">${fmtPrice(heroProduct.original_price)}</span>
          <span class="price-new" style="font-size:1.375rem">${fmtPrice(heroProduct.sale_price)}</span>
          <span class="badge-discount" style="font-size:.75rem;padding:4px 9px">—${heroProduct.discount_percent}%</span>
        </div>
        <div class="hero-cta"><button class="btn btn-primary btn-lg" onclick="event.stopPropagation();addToCart(${heroProduct.id})">Acheter maintenant →</button></div>
      </div>
    </div>`;

    h = buildHeroHTML(heroProduct, homeContent);

    // Category bar
    h += `<div class="cat-bar" id="categoryBar">
      <button class="cat-pill ${currentCat==='all'?'active':''}" data-cat="all" onclick="filterCategory('all')">Tous</button>
      <button class="cat-pill ${currentCat==='steam'?'active':''}" data-cat="steam" onclick="filterCategory('steam')">Steam</button>
      <button class="cat-pill ${currentCat==='xbox'?'active':''}" data-cat="xbox" onclick="filterCategory('xbox')">Xbox</button>
      <button class="cat-pill ${currentCat==='playstation'?'active':''}" data-cat="playstation" onclick="filterCategory('playstation')">PlayStation</button>
      <button class="cat-pill ${currentCat==='nintendo'?'active':''}" data-cat="nintendo" onclick="filterCategory('nintendo')">Nintendo</button>
      <button class="cat-pill ${currentCat==='giftcard'?'active':''}" data-cat="giftcard" onclick="filterCategory('giftcard')">Cartes Cadeaux</button>
      <button class="cat-pill ${currentCat==='software'?'active':''}" data-cat="software" onclick="filterCategory('software')">Logiciels</button>
    </div>`;

    h += sectionHTML('Top ventes', topSales);
    h += sectionHTML('Promotions', promos);
    h += sectionHTML('Steam', steam);
    h += sectionHTML('Xbox', xbox);
    h += sectionHTML('PlayStation', ps);
    h += sectionHTML('Nouveautés', latest);

    // Reviews section
    h += `<div class="section"><h2 class="section-title">Avis clients</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">
        <div class="review-card"><div class="review-header"><span class="reviewer">Marc D.</span><span class="stars">★★★★★</span></div><div class="review-text">Livraison instantanée, clé fonctionnelle. Keyro est devenu mon site de référence.</div></div>
        <div class="review-card"><div class="review-header"><span class="reviewer">Sophie L.</span><span class="stars">★★★★☆</span></div><div class="review-text">Bon prix et activation rapide. Je recommande.</div></div>
        <div class="review-card"><div class="review-header"><span class="reviewer">Thomas R.</span><span class="stars">★★★★★</span></div><div class="review-text">Acheté Elden Ring à moitié prix, clé reçue en 30 secondes.</div></div>
        <div class="review-card"><div class="review-header"><span class="reviewer">Émilie B.</span><span class="stars">★★★★★</span></div><div class="review-text">Interface propre et professionnelle. Site sérieux.</div></div>
      </div></div>`;

    el.innerHTML = h;
  } catch (err) {
    el.innerHTML = `<p style="color:var(--danger);text-align:center;padding:60px 0">Erreur de chargement : ${err.message}</p>`;
  }
}

function filterCategory(cat) {
  currentCat = cat;
  searchQ = '';
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';
  renderHome();
}

function handleSearch(q) {
  searchQ = q;
  currentCat = 'all';
  renderHome();
}
