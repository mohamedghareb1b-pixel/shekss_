/**
 * ============================================================
 * SHEKSS — EXPIRED DEALS
 * scripts/expired.js
 * ============================================================
 */

let expiredMode = 'online';
let expiredCat  = 'all';
let expiredSort = 'newest';
let expiredPage = 0;
const EXPIRED_PAGE_SIZE = 20;
let expiredHasMore = false;
let expiredAllData = [];

function expiredSetMode(m) {
  expiredMode = m;
  expiredCat  = 'all';
  document.getElementById('expired-mode-online').classList.toggle('active', m === 'online');
  document.getElementById('expired-mode-offline').classList.toggle('active', m === 'offline');
  buildExpiredCats();
  loadExpiredPage();
}

function expiredSetSort(s, btn) {
  expiredSort = s;
  document.querySelectorAll('#page-expired .sort-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  loadExpiredPage();
}

function buildExpiredCats() {
  const cats = expiredMode === 'online' ? ONLINE_CATS : OFFLINE_CATS;
  const wrap = document.getElementById('expired-cats');
  wrap.innerHTML = cats.map(c => `
    <div class="cat-chip ${expiredCat === c.id ? 'active' : ''}" onclick="expiredPickCat('${c.id}')">
      <span class="ico">${c.ico}</span>
      <span class="lbl">${c.label}</span>
    </div>`).join('');
}

function expiredPickCat(id) {
  expiredCat = id;
  buildExpiredCats();
  loadExpiredPage();
}

async function loadExpiredPage() {
  const grid = document.getElementById('expired-grid');
  clearAllCountdowns();                                     // BUG-F fix
  grid.innerHTML = '<div class="skel sk-card"></div>'.repeat(6);
  expiredPage = 0;

  let q = sb.from('deals').select('*').eq('status', 'expired');
  if (expiredMode === 'offline') q = q.eq('is_offline', true);
  else                           q = q.neq('is_offline', true);
  if (expiredCat !== 'all')      q = q.eq('category', expiredCat);
  if (expiredSort === 'discount') q = q.order('discount', { ascending: false });
  else                            q = q.order('expires_at', { ascending: false });

  // Parallel: fetch page data + total count
  const countQ = sb.from('deals').select('*', { count: 'exact', head: true }).eq('status', 'expired');
  const [{ data }, { count: total }] = await Promise.all([
    q.range(0, EXPIRED_PAGE_SIZE - 1),
    countQ,
  ]);

  expiredAllData = data || [];

  if (total !== null) {
    document.getElementById('expired-total-count').textContent = (+total).toLocaleString('ar-EG') + '+';
    const heroStat = document.getElementById('stat-expired');
    if (heroStat) heroStat.textContent = (+total).toLocaleString('ar-EG') + '+';
  }

  grid.innerHTML = expiredAllData.length
    ? expiredAllData.map(d => dealCard(d, expiredMode, true)).join('')
    : emptyHtml('📦', 'لا توجد عروض منتهية بعد');

  expiredHasMore = expiredAllData.length === EXPIRED_PAGE_SIZE;
  const btn = document.getElementById('expired-loadmore-btn');
  btn.style.display = expiredHasMore ? 'inline-block' : 'none';
}

async function loadMoreExpired() {
  expiredPage++;
  const from = expiredPage * EXPIRED_PAGE_SIZE;
  const to   = from + EXPIRED_PAGE_SIZE - 1;

  let q = sb.from('deals').select('*').eq('status', 'expired');
  if (expiredMode === 'offline') q = q.eq('is_offline', true);
  else                           q = q.neq('is_offline', true);
  if (expiredCat !== 'all')      q = q.eq('category', expiredCat);
  if (expiredSort === 'discount') q = q.order('discount', { ascending: false });
  else                            q = q.order('expires_at', { ascending: false });

  const { data } = await q.range(from, to);
  const newData = data || [];
  expiredAllData = [...expiredAllData, ...newData];

  const grid = document.getElementById('expired-grid');
  newData.forEach(d => grid.insertAdjacentHTML('beforeend', dealCard(d, expiredMode, true)));

  expiredHasMore = newData.length === EXPIRED_PAGE_SIZE;
  document.getElementById('expired-loadmore-btn').style.display = expiredHasMore ? 'inline-block' : 'none';
}
