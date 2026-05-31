/**
 * ============================================================
 * SHEKSS — NAVIGATION & LOCATION
 * scripts/nav-location.js
 * ============================================================
 * Page switching, mobile menu, gov/city selectors.
 *
 * FIXES APPLIED:
 *   BUG-B: article pushState('/') overwrites home URL — skip pushState for article
 *   BUG-C: showPage('home') via popstate didn't reload home deals
 *   BUG-E: filterCatsByDeals — cached per-mode to avoid extra DB round-trips
 * ============================================================
 */

// ===== CATEGORY FILTER CACHE (BUG-E fix) =====
// Caches which categories have active deals per mode,
// so switching category doesn't fire a new DB call.
const _catCache = {};

async function filterCatsByDeals(ctx) {
  const mode    = ctx === 'home' ? homeMode : dealsMode;
  const cats    = mode === 'online' ? ONLINE_CATS : OFFLINE_CATS;
  const cacheKey = ctx + '-' + mode;

  // Use cache if available
  if (_catCache[cacheKey]) {
    _applyCatFilter(ctx, cats, _catCache[cacheKey]);
    return;
  }

  const { data } = await sb.from('deals')
    .select('category')
    .eq('is_offline', mode === 'offline')
    .neq('status', 'expired');

  const existingCats = new Set((data || []).map(d => d.category));
  _catCache[cacheKey] = existingCats;
  _applyCatFilter(ctx, cats, existingCats);
}

function _applyCatFilter(ctx, cats, existingCats) {
  cats.forEach(c => {
    if (c.id === 'all') return;
    const chip = document.getElementById(ctx + '-cat-chip-' + c.id);
    if (chip) chip.style.display = existingCats.has(c.id) ? '' : 'none';
  });
}

// Invalidate cache when new deals might have been added
function invalidateCatCache() {
  Object.keys(_catCache).forEach(k => delete _catCache[k]);
}

// ===== PAGE NAVIGATION =====
function showPage(p) {
  document.querySelectorAll('.page').forEach(x => x.style.display = 'none');

  const target = document.getElementById('page-' + p);
  if (target) target.style.display = 'block';

  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  const navLink = document.getElementById('nav-' + p);
  if (navLink) navLink.classList.add('active');

  currentPage = p;
  window.scrollTo(0, 0);

  // BUG-B fix: skip pushState for 'article' — it's a sub-view of blog,
  // not a standalone page with its own URL.
  updateSEO(p);

  _loadPageData(p);
}

// Centralised data-loading — used by showPage() AND popstate handler
function _loadPageData(p) {
  if (p === 'home')               { buildHomeCats(); loadHomeDeals(); loadRecommend(); }
  if (p === 'deals')              { buildDealsCats(); loadDeals(); }
  if (p === 'expired')            { buildExpiredCats(); loadExpiredPage(); }
  if (p === 'coupons')            loadCoupons();
  if (p === 'blog')               loadBlog();
  if (p === 'merchant-dashboard') initMerchantDashboard();
  if (p === 'admin-dashboard')    initAdminDashboard();
  if (p === 'profile')            renderProfilePage();
}

// ===== MOBILE NAV =====
function toggleMob() {
  document.getElementById('mob-nav').classList.toggle('open');
}

// Close mobile nav when clicking outside — registered once at module load
document.addEventListener('click', function(e) {
  const mobNav = document.getElementById('mob-nav');
  if (
    mobNav.classList.contains('open') &&
    !mobNav.contains(e.target) &&
    !e.target.closest('.mob-menu-btn')
  ) {
    mobNav.classList.remove('open');
  }
});

// ===== BROWSER BACK / FORWARD =====
window.addEventListener('popstate', function(e) {
  if (e.state && e.state.page) {
    const p = e.state.page;
    document.querySelectorAll('.page').forEach(x => x.style.display = 'none');
    const target = document.getElementById('page-' + p);
    if (target) target.style.display = 'block';
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    const n = document.getElementById('nav-' + p);
    if (n) n.classList.add('active');
    currentPage = p;
    _loadPageData(p); // BUG-C fix: uses shared loader, including home
  }
});

// ===== LOCATION FALLBACK =====
function showLocFallback(ctx) {
  const el = document.getElementById(ctx + '-loc-fallback');
  if (el) el.style.display = 'block';
}

function hideLocFallback(ctx) {
  const el = document.getElementById(ctx + '-loc-fallback');
  if (el) el.style.display = 'none';
  selectedGov  = '';
  selectedCity = '';
}

// ===== GOV/CITY DROPDOWNS =====
function initGovSelects() {
  ['home-gov-select', 'deals-gov-select'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    Object.keys(EGYPT_GOVS).forEach(gov => {
      const opt       = document.createElement('option');
      opt.value       = gov;
      opt.textContent = gov;
      sel.appendChild(opt);
    });
  });
}

function onGovChange(ctx) {
  const govSel  = document.getElementById(ctx + '-gov-select');
  const citySel = document.getElementById(ctx + '-city-select');
  selectedGov   = govSel.value;
  selectedCity  = '';

  citySel.innerHTML = '<option value="">كل المراكز</option>';
  if (selectedGov && EGYPT_GOVS[selectedGov]) {
    EGYPT_GOVS[selectedGov].forEach(city => {
      const opt       = document.createElement('option');
      opt.value       = city;
      opt.textContent = city;
      citySel.appendChild(opt);
    });
  }

  if (ctx === 'home') loadHomeDeals();
  else                loadDeals();
}

function onCityChange(ctx) {
  selectedCity = document.getElementById(ctx + '-city-select').value;
  if (ctx === 'home') loadHomeDeals();
  else                loadDeals();
}

// ===== FAQ ACCORDION =====
function toggleFaq(el) {
  const item   = el.closest('.faq-item');
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

// ===== LOGIN PAGE TABS =====
function switchLoginTab(tab) {
  document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.login-form-section').forEach(s => s.style.display = 'none');
  const activeTab     = document.querySelector(`.login-tab[data-tab="${tab}"]`);
  const activeSection = document.getElementById('login-' + tab);
  if (activeTab)     activeTab.classList.add('active');
  if (activeSection) activeSection.style.display = 'flex';
}

// ===== INIT APP =====
function showApp() {
  document.getElementById('main-nav').style.display    = 'flex';
  document.getElementById('main-footer').style.display = 'block';

  // Init auth first (restores session from localStorage — no extra DB call)
  // then render the correct page
  initAuth().then(() => {
    const urlParam = new URLSearchParams(window.location.search).get('p');
    if (urlParam && URL_PAGE_MAP[urlParam]) {
      showPage(URL_PAGE_MAP[urlParam]);
    } else {
      initHomePage();
    }
  });
}

async function initHomePage() {
  const [r1, r2, r3] = await Promise.all([
    sb.from('deals').select('*', { count: 'exact', head: true }).neq('status', 'expired'),
    sb.from('coupons').select('*', { count: 'exact', head: true }),
    sb.from('deals').select('*', { count: 'exact', head: true }).eq('status', 'expired'),
  ]);
  const fmt = n => n ? (+n).toLocaleString('ar-EG') + '+' : '0';
  document.getElementById('stat-deals').textContent   = fmt(r1.count);
  document.getElementById('stat-coupons').textContent = fmt(r2.count);
  document.getElementById('stat-expired').textContent = fmt(r3.count);

  buildHomeCats();
  loadHomeDeals();
  loadRecommend();
  initGovSelects();
  autoExpireDeals();
}

// NOTE: initPGovSelect() and fillPCities() removed — were for partners page (removed).
// NOTE: requestLocation() removed — GPS not wired in UI.
// Both will be re-added in Merchant Dashboard phase.
