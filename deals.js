/**
 * ============================================================
 * SHEKSS — DEALS ENGINE
 * scripts/deals.js
 * ============================================================
 * All deals-related logic: query builder, card renderer,
 * home page deals, deals page, expired page, recommendations.
 * ============================================================
 */

// ===== APP STATE =====
let currentPage  = 'home';
let homeMode     = 'online';
let dealsMode    = 'online';
let homeSort     = 'newest';
let dealsSort    = 'newest';
let homeCat      = 'all';
let homeSubcat   = '';
let dealsCat     = 'all';
let dealsSubcat  = '';
let homeHotType  = 'all';
let selectedGov  = '';
let selectedCity = '';
let userLat = null, userLng = null;

// ===== DEAL CARD RENDERER =====
function dealCard(d, mode, isExpired = false) {
  let imgHtml;
  if (d.image2) {
    const uid = 'sl-' + (d.id || Math.random().toString(36).slice(2));
    imgHtml = `
      <div class="dimg-slider" id="${uid}">
        <img src="${d.image}" alt="${d.name}" class="dslide active" onerror="this.style.display='none'">
        <img src="${d.image2}" alt="${d.name}" class="dslide" onerror="this.style.display='none'">
        <button class="dslide-dot dot-0 active" onclick="slideImg('${uid}',0)"></button>
        <button class="dslide-dot dot-1" onclick="slideImg('${uid}',1)"></button>
      </div>`;
  } else if (d.image) {
    imgHtml = `<img src="${d.image}" alt="${d.name}" onerror="this.parentElement.innerHTML='<div class=dimg-placeholder>🏷️</div>'">`;
  } else {
    imgHtml = '<div class="dimg-placeholder">🏷️</div>';
  }

  const hot     = (!isExpired && d.status === 'hot') ? '<span class="badge-hot">ساخن 🔥</span>' : '';
  const offline = mode === 'offline' ? '<span class="badge-offline">📍 جمبي</span>' : '';
  const link    = d.link || d.online_link || '#';
  const catLabel    = CAT_LABELS[d.category] || d.category || '';
  const subcatLabel = d.subcategory ? ` · ${d.subcategory}` : '';

  // Price HTML
  let priceHtml = '';
  if (d.price && d.discount) {
    const orig  = parseFloat(d.price);
    const disc  = parseFloat(d.discount);
    const after = Math.round(orig * (1 - disc / 100));
    priceHtml = `<div class="dprice-wrap">
      <span class="dprice-old">${orig.toLocaleString('ar-EG')} ج</span>
      <span class="dprice-new">${after.toLocaleString('ar-EG')} ج</span>
      <span class="dprice-save">وفّر ${(orig - after).toLocaleString('ar-EG')} ج</span>
    </div>`;
  } else if (d.price) {
    priceHtml = `<div class="dprice-wrap"><span class="dprice-new">${parseFloat(d.price).toLocaleString('ar-EG')} ج</span></div>`;
  }

  const coupon    = (!isExpired && d.coupon_code) ? `<div class="coupon-wrap"><span class="coupon-code">${d.coupon_code}</span><button class="coupon-copy" onclick="copyCoupon('${d.coupon_code}',this)">نسخ</button></div>` : '';
  const dist      = d._dist ? `<div class="dist-badge">📍 على بعد ${d._dist.toFixed(1)} كم</div>` : '';
  const storeName = (mode === 'offline' && d.store_name) ? `<div class="store-name-badge">🏪 ${d.store_name}</div>` : '';

  // Countdown or expired badge
  let timerHtml = '';
  if (isExpired) {
    const endDate = d.expires_at ? new Date(d.expires_at).toLocaleDateString('ar-EG') : '';
    timerHtml = `<div style="background:#f1f5f9;border-radius:8px;padding:6px 10px;margin-bottom:8px;text-align:center;font-size:12px;font-weight:700;color:#94a3b8;">📦 انتهى ${endDate}</div>`;
  } else if (d.expires_at) {
    const uid = 'cd-' + (d.id || Math.random().toString(36).slice(2));
    timerHtml = `<div class="deal-countdown" id="${uid}" data-expires="${d.expires_at}">⏳ جاري الحساب...</div>`;
    _countdownQueue.push(uid);
  }

  const expiredOverlay = isExpired
    ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;border-radius:4px;">
         <span style="background:#1e293b;color:white;font-size:13px;font-weight:900;padding:6px 16px;border-radius:20px;">📦 انتهى العرض</span>
       </div>`
    : '';

  const cardStyle = isExpired ? 'opacity:0.75;' : '';
  const btnHtml   = isExpired
    ? `<button class="btn-deal" disabled style="background:var(--gray-200);color:var(--gray-400);cursor:not-allowed;">انتهى العرض 📦</button>`
    : `<button class="btn-deal" onclick="window.open('${link}','_blank')">الحق الفرصة 🔥</button>`;

  return `<div class="deal-card" style="${cardStyle}">
    <div class="dimg" style="position:relative;">${imgHtml}<span class="badge-disc">${d.discount}%</span>${hot}${offline}${expiredOverlay}</div>
    <div class="dbody">
      <div class="dcat">${catLabel}${subcatLabel}</div>
      ${storeName}
      <div class="dname">${d.name}</div>
      <div class="ddesc">${d.description || ''}</div>
      ${priceHtml}${dist}${timerHtml}${coupon}
      <div class="card-footer">${btnHtml}</div>
    </div>
  </div>`;
}

// ===== QUERY BUILDER =====
async function buildQuery(mode, cat, subcat, sort, hotType) {
  let q = sb.from('deals').select('*')
    .eq('approval_status', 'approved')   // C1 FIX: only approved deals for public
    .neq('status', 'expired');
  if (mode === 'offline') q = q.eq('is_offline', true);
  else                    q = q.neq('is_offline', true);
  if (cat && cat !== 'all') q = q.eq('category', cat);
  if (subcat)               q = q.eq('subcategory', subcat);
  if (hotType === 'hot')    q = q.eq('status', 'hot');
  else if (hotType === 'limited') q = q.not('expires_at', 'is', null);
  if (sort === 'discount')      q = q.order('discount', { ascending: false });
  else if (sort === 'price_asc') q = q.order('price', { ascending: true, nullsFirst: false });
  else                           q = q.order('created_at', { ascending: false });

  const { data } = await q;
  let result = data || [];
  if (hotType === 'top_discount') result = [...result].sort((a, b) => b.discount - a.discount);
  if (mode === 'offline' && selectedGov) {
    result = result.filter(d => {
      if (selectedCity) return d.governorate === selectedGov && d.city === selectedCity;
      return d.governorate === selectedGov;
    });
  }
  return result;
}

// ===== HOME PAGE =====
function homeSetMode(m) {
  homeMode  = m;
  homeCat   = 'all';
  homeSubcat = '';
  document.getElementById('home-mode-online').classList.toggle('active', m === 'online');
  document.getElementById('home-mode-offline').classList.toggle('active', m === 'offline');
  buildHomeCats();
  if (m === 'offline') { showLocFallback('home'); loadHomeDeals(); }
  else                 { hideLocFallback('home'); loadHomeDeals(); }
}

function homeSetSort(s, btn) {
  homeSort = s;
  document.querySelectorAll('#page-home .sort-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  loadHomeDeals();
}

// NOTE: homeHotFilter() removed — hot-strip UI was removed from homepage.

function buildHomeCats() {
  const cats = homeMode === 'online' ? ONLINE_CATS : OFFLINE_CATS;
  document.getElementById('home-cats-title').textContent = homeMode === 'online' ? '📂 أقسام أونلاين' : '📍 أقسام جمبي';
  const wrap = document.getElementById('home-cats');
  wrap.innerHTML = cats.map(c => `
    <div class="cat-chip ${homeCat === c.id ? 'active' : ''}" id="home-cat-chip-${c.id}" onclick="homePickCat('${c.id}')">
      <span class="ico">${c.ico}</span>
      <span class="lbl">${c.label}</span>
    </div>`).join('');
  buildHomeSubcats();
  filterCatsByDeals('home');
}

function buildHomeSubcats() {
  const cats = homeMode === 'online' ? ONLINE_CATS : OFFLINE_CATS;
  const cat  = cats.find(c => c.id === homeCat);
  const wrap = document.getElementById('home-subcats');
  if (!cat || !cat.subs.length) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = ['الكل', ...cat.subs].map(s =>
    `<button class="subcat-pill ${homeSubcat === s || (!homeSubcat && s === 'الكل') ? 'active' : ''}" onclick="homePickSubcat('${s}')">${s}</button>`
  ).join('');
}

function homePickCat(id)    { homeCat = id; homeSubcat = ''; buildHomeCats(); loadHomeDeals(); }
function homePickSubcat(s)  { homeSubcat = s === 'الكل' ? '' : s; buildHomeSubcats(); loadHomeDeals(); }

// filterCatsByDeals() moved to nav-location.js (with cache — BUG-E fix)

async function loadHomeDeals() {
  const grid = document.getElementById('home-deals');
  clearAllCountdowns();                                     // BUG-F fix
  grid.innerHTML = '<div class="skel sk-card"></div>'.repeat(4);
  const data = await buildQuery(homeMode, homeCat, homeSubcat, homeSort, homeHotType);
  const show = data.slice(0, 8);
  grid.innerHTML = show.length
    ? show.map(d => dealCard(d, homeMode)).join('')
    : emptyHtml('🏷️', 'لا توجد عروض في هذا القسم');
  setTimeout(initCountdowns, 50);
}

async function loadRecommend() {
  const grid = document.getElementById('home-recommend-deals');
  const { data } = await sb.from('deals').select('*').eq('is_offline', false).eq('status', 'hot').order('discount', { ascending: false }).limit(3);
  if (!data || !data.length) { document.getElementById('home-recommend').style.display = 'none'; return; }
  grid.innerHTML = data.map(d => dealCard(d, 'online')).join('');
}

// ===== DEALS PAGE =====
function dealsSetMode(m) {
  dealsMode  = m;
  dealsCat   = 'all';
  dealsSubcat = '';
  document.getElementById('deals-mode-online').classList.toggle('active', m === 'online');
  document.getElementById('deals-mode-offline').classList.toggle('active', m === 'offline');
  buildDealsCats();
  if (m === 'offline') { showLocFallback('deals'); loadDeals(); }
  else                 { hideLocFallback('deals'); loadDeals(); }
}

function dealsSetSort(s, btn) {
  dealsSort = s;
  document.querySelectorAll('#page-deals .sort-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  loadDeals();
}

function buildDealsCats() {
  const cats = dealsMode === 'online' ? ONLINE_CATS : OFFLINE_CATS;
  const wrap = document.getElementById('deals-cats');
  wrap.innerHTML = cats.map(c => `
    <div class="cat-chip ${dealsCat === c.id ? 'active' : ''}" id="deals-cat-chip-${c.id}" onclick="dealsPickCat('${c.id}')">
      <span class="ico">${c.ico}</span>
      <span class="lbl">${c.label}</span>
    </div>`).join('');
  buildDealsSubcats();
  filterCatsByDeals('deals');
}

function buildDealsSubcats() {
  const cats = dealsMode === 'online' ? ONLINE_CATS : OFFLINE_CATS;
  const cat  = cats.find(c => c.id === dealsCat);
  const wrap = document.getElementById('deals-subcats');
  if (!cat || !cat.subs.length) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = ['الكل', ...cat.subs].map(s =>
    `<button class="subcat-pill ${dealsSubcat === s || (!dealsSubcat && s === 'الكل') ? 'active' : ''}" onclick="dealsPickSubcat('${s}')">${s}</button>`
  ).join('');
}

function dealsPickCat(id)   { dealsCat = id; dealsSubcat = ''; buildDealsCats(); loadDeals(); }
function dealsPickSubcat(s) { dealsSubcat = s === 'الكل' ? '' : s; buildDealsSubcats(); loadDeals(); }

async function loadDeals() {
  const grid = document.getElementById('deals-grid');
  clearAllCountdowns();                                     // BUG-F fix
  grid.innerHTML = '<div class="skel sk-card"></div>'.repeat(6);
  const data = await buildQuery(dealsMode, dealsCat, dealsSubcat, dealsSort, 'all');
  grid.innerHTML = data.length
    ? data.map(d => dealCard(d, dealsMode)).join('')
    : emptyHtml('🏷️', 'لا توجد عروض في هذا القسم');
  setTimeout(initCountdowns, 50);
}

// ===== AUTO-EXPIRE (client-side fallback) =====
async function autoExpireDeals() {
  const now = new Date().toISOString();
  const { data } = await sb.from('deals')
    .select('id')
    .neq('status', 'expired')
    .not('expires_at', 'is', null)
    .lt('expires_at', now);

  if (data && data.length > 0) {
    const ids = data.map(d => d.id);
    await sb.from('deals').update({ status: 'expired' }).in('id', ids);
    invalidateCatCache(); // refresh category filter cache after status changes
  }
}
