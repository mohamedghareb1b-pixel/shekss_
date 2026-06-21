/**
 * ============================================================
 * SHEKSS — STORE PAGE
 * scripts/store.js
 * ============================================================
 * URL: /?p=store&slug=diva-wear
 *
 * Flow:
 *   loadStorePage(slug)
 *     → fetch profile by business_slug
 *     → fetch approved deals by merchant_id
 *     → render full store page
 *
 * Public API:
 *   loadStorePage(slug)   — called by _loadPageData
 *   shareStore()          — WhatsApp share
 *   storeFilterCat(catId) — filter deals by category
 * ============================================================
 */

// ===== ENTRY =====
async function loadStorePage(slug) {
  const wrap = document.getElementById('store-inner');
  if (!wrap) return;

  if (!slug) {
    wrap.innerHTML = _storeErr('لم يتم تحديد المتجر');
    return;
  }

  wrap.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:50vh;">
      <div style="text-align:center;color:var(--gray-400);">
        <div style="font-size:36px;margin-bottom:12px;">⏳</div>
        <p style="font-size:14px;font-weight:700;">جاري تحميل المتجر...</p>
      </div>
    </div>`;

  // Fetch profile + deals in parallel
  const [profileRes, dealsRes] = await Promise.all([
    sb.from('profiles')
      .select('id, full_name, business_name, company_name, business_logo, business_description, description, whatsapp, phone, governorate, city, address, location_link, business_category, business_subcategory, working_hours, business_slug, created_at')
      .eq('business_slug', slug)
      .eq('role', 'merchant')
      .eq('approval_status', 'approved')
      .single(),
    sb.from('deals')
      .select('*')
      .eq('approval_status', 'approved')
      .neq('status', 'expired')
      .order('created_at', { ascending: false }),
  ]);

  if (profileRes.error || !profileRes.data) {
    wrap.innerHTML = _storeErr('المتجر غير موجود أو غير متاح');
    return;
  }

  const profile = profileRes.data;

  // Filter deals for this merchant
  const allDeals = (dealsRes.data || []).filter(d => d.merchant_id === profile.id);

  _renderStorePage(wrap, profile, allDeals);
}

// ===== RENDER =====
function _renderStorePage(wrap, p, deals) {
  const name     = p.business_name  || p.company_name  || '—';
  const desc     = p.business_description || p.description || '';
  const logo     = p.business_logo;
  const gov      = p.governorate ? `${p.governorate}${p.city ? ' — ' + p.city : ''}` : '';
  const catLabel = p.business_category ? (CAT_LABELS[p.business_category] || p.business_category) : '';
  const joined   = p.created_at
    ? new Date(p.created_at).toLocaleDateString('ar-EG', { year:'numeric', month:'long' })
    : '';

  // Build unique cats from deals
  const dealCats = [...new Set(deals.map(d => d.category).filter(Boolean))];

  wrap.innerHTML = `

    <!-- ── STORE HERO ── -->
    <div class="store-hero">
      <div class="store-hero-bg"></div>
      <div class="store-hero-content">

        <div class="store-logo-wrap">
          ${logo
            ? `<img src="${_stEsc(logo)}" alt="${_stEsc(name)}"
                    class="store-logo-img">`
            : `<div class="store-logo-placeholder">
                 ${name.charAt(0).toUpperCase()}
               </div>`}
        </div>

        <div class="store-hero-info">
          <h1 class="store-name">${_stEsc(name)}</h1>
          ${catLabel ? `<div class="store-cat-badge">📂 ${_stEsc(catLabel)}</div>` : ''}
          ${gov      ? `<div class="store-location">📍 ${_stEsc(gov)}</div>` : ''}
          ${desc     ? `<p class="store-desc">${_stEsc(desc)}</p>` : ''}
        </div>

        <!-- Stats bar -->
        <div class="store-stats-bar">
          <div class="store-stat">
            <span class="store-stat-val">${deals.length}</span>
            <span class="store-stat-lbl">عرض نشط</span>
          </div>
          ${p.working_hours ? `
          <div class="store-stat">
            <span class="store-stat-val" style="font-size:12px;">⏰</span>
            <span class="store-stat-lbl">${_stEsc(p.working_hours)}</span>
          </div>` : ''}
          ${joined ? `
          <div class="store-stat">
            <span class="store-stat-val" style="font-size:11px;">منذ</span>
            <span class="store-stat-lbl">${_stEsc(joined)}</span>
          </div>` : ''}
        </div>

        <!-- Action buttons -->
        <div class="store-actions">
          ${p.whatsapp || p.phone ? `
          <a href="https://wa.me/2${(p.whatsapp || p.phone).replace(/\D/g,'')}"
             target="_blank" rel="noopener"
             class="store-action-btn store-wa-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            واتساب
          </a>` : ''}
          ${p.location_link ? `
          <a href="${_stEsc(p.location_link)}" target="_blank" rel="noopener"
             class="store-action-btn store-map-btn">
            🗺️ الموقع
          </a>` : ''}
          <button class="store-action-btn store-share-btn"
                  onclick="shareStore('${_stEsc(name)}', '${_stEsc(p.business_slug || '')}')">
            📤 مشاركة
          </button>
        </div>

      </div>
    </div>

    <!-- ── DEALS SECTION ── -->
    <div class="store-deals-section">

      <!-- Category filter -->
      ${dealCats.length > 1 ? `
      <div class="store-cat-filter" id="store-cat-filter">
        <button class="store-cat-chip active" data-cat="all"
                onclick="storeFilterCat('all')">
          🏷️ الكل (${deals.length})
        </button>
        ${dealCats.map(cat => {
          const count = deals.filter(d => d.category === cat).length;
          const label = CAT_LABELS[cat] || cat;
          return `<button class="store-cat-chip" data-cat="${_stEsc(cat)}"
                          onclick="storeFilterCat('${_stEsc(cat)}')">
                    ${_stEsc(label)} (${count})
                  </button>`;
        }).join('')}
      </div>` : ''}

      <!-- Deals count -->
      <div class="store-deals-header">
        <h2 class="store-deals-title">
          🏷️ عروض ${_stEsc(name)}
        </h2>
        <span id="store-deals-count" style="font-size:13px;color:var(--gray-400);font-weight:700;">
          ${deals.length} عرض
        </span>
      </div>

      <!-- Deals grid -->
      <div class="deals-grid" id="store-deals-grid">
        ${!deals.length
          ? `<div class="no-deals" style="grid-column:1/-1;">
               <div style="font-size:48px;margin-bottom:12px;">🏷️</div>
               <h3>لا توجد عروض متاحة حالياً</h3>
               <p>تابع هذا المتجر للحصول على أحدث العروض</p>
             </div>`
          : deals.map(d => dealCard(d, d.is_offline ? 'offline' : 'online')).join('')}
      </div>

    </div>`;

  // Full SEO update — title, meta, canonical, OG, LocalBusiness schema
  updateStoreSEO(p, deals.length);
}

// ===== CATEGORY FILTER =====
function storeFilterCat(catId) {
  // Update chip active state
  document.querySelectorAll('.store-cat-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.cat === catId);
  });

  // Show/hide deal cards
  const grid = document.getElementById('store-deals-grid');
  if (!grid) return;

  let visible = 0;
  grid.querySelectorAll('.deal-card').forEach(card => {
    const cardCat = card.dataset.cat || '';
    const show    = catId === 'all' || cardCat === catId;
    card.style.display = show ? '' : 'none';
    if (show) visible++;
  });

  // Update count
  const countEl = document.getElementById('store-deals-count');
  if (countEl) countEl.textContent = `${visible} عرض`;
}

// ===== SHARE =====
function shareStore(name, slug) {
  const url      = `${window.location.origin}${window.location.pathname}?p=store&slug=${slug}`;
  const countEl  = document.getElementById('store-deals-count');
  const count    = countEl ? countEl.textContent.trim() : '';
  const text     = `🏪 تفضل بزيارة ${name} على شيكس\n${count ? `عندهم ${count} حصري! 🏷️` : ''}\n`;

  if (navigator.share) {
    navigator.share({ title: name, text, url }).catch(() => {});
  } else {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text + url)}`;
    window.open(waUrl, '_blank');
  }
}

// ===== HELPERS =====
function _storeErr(msg) {
  return `
    <div style="display:flex;align-items:center;justify-content:center;min-height:60vh;">
      <div style="text-align:center;color:var(--gray-400);max-width:320px;">
        <div style="font-size:52px;margin-bottom:16px;">🏪</div>
        <h3 style="font-size:18px;font-weight:900;color:var(--gray-700);margin-bottom:8px;">
          ${msg}
        </h3>
        <p style="font-size:13px;margin-bottom:20px;">
          تأكد من الرابط أو تصفح العروض المتاحة
        </p>
        <button class="btn-primary" onclick="showPage('home')">
          ← العودة للرئيسية
        </button>
      </div>
    </div>`;
}

function _stEsc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
