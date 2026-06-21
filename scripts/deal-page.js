/**
 * ============================================================
 * SHEKSS — DEAL DETAIL PAGE
 * scripts/deal-page.js
 * ============================================================
 * URL: /?p=deal&id=uuid
 *
 * Flow:
 *   loadDealPage(id)
 *     → fetch deal + merchant profile
 *     → increment views (fire & forget)
 *     → render full deal page
 *
 * Public API:
 *   loadDealPage(id)
 *   dealPageCopyCode(code, btn)
 *   dealPageOpenLink(url, dealId)
 *   shareDeal(name, id)
 * ============================================================
 */

// ===== ENTRY =====
async function loadDealPage(id) {
  const wrap = document.getElementById('deal-page-inner');
  if (!wrap) return;

  if (!id) { wrap.innerHTML = _dpErr('لم يتم تحديد العرض'); return; }

  wrap.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:50vh;">
      <div style="text-align:center;color:var(--gray-400);">
        <div style="font-size:36px;margin-bottom:12px;">⏳</div>
        <p style="font-size:14px;font-weight:700;">جاري تحميل العرض...</p>
      </div>
    </div>`;

  // Fetch deal
  const { data: deal, error } = await sb.from('deals')
    .select('*')
    .eq('id', id)
    .eq('approval_status', 'approved')
    .single();

  if (error || !deal) {
    wrap.innerHTML = _dpErr('العرض غير موجود أو انتهت صلاحيته');
    return;
  }

  // Increment views (fire & forget — don't await)
  sb.from('deals').update({ views: (deal.views || 0) + 1 }).eq('id', id).then(() => {});

  // Fetch merchant profile if exists
  let merchant = null;
  if (deal.merchant_id) {
    const { data: m } = await sb.from('profiles')
      .select('full_name, business_name, company_name, business_logo, business_slug, governorate, city, whatsapp, phone')
      .eq('id', deal.merchant_id)
      .single();
    merchant = m;
  }

  _renderDealPage(wrap, deal, merchant);
}

// ===== RENDER =====
function _renderDealPage(wrap, d, merchant) {
  const name      = d.name || d.title || '—';
  const desc      = d.description || '';
  const details   = d.details || '';
  const img       = d.main_image || d.image || null;
  const img2      = d.second_image || null;
  const hasImg2   = !!img2;
  const company   = d.company_name || merchant?.business_name || merchant?.company_name || '';
  const coupon    = d.coupon_code || '';
  const link      = d.link || d.location_link || '';
  const isOffline = d.is_offline;
  const isExpired = d.status === 'expired';
  const catLabel  = d.category ? (CAT_LABELS[d.category] || d.category) : '';
  const subLabel  = d.subcategory ? ` / ${d.subcategory}` : '';

  // Expiry countdown
  const expiresAt = d.expires_at ? new Date(d.expires_at) : null;
  const now       = new Date();
  let expiryHtml  = '';
  if (expiresAt && !isExpired) {
    const diff   = expiresAt - now;
    const days   = Math.floor(diff / 86400000);
    const hours  = Math.floor((diff % 86400000) / 3600000);
    if (diff > 0) {
      expiryHtml = `
        <div class="dp-expiry">
          ⏳ ينتهي بعد:
          <strong>${days > 0 ? days + ' يوم' : ''} ${hours} ساعة</strong>
          — ${expiresAt.toLocaleDateString('ar-EG', { weekday:'long', month:'long', day:'numeric' })}
        </div>`;
    }
  }

  // Discount badge — supports fixed % or range (from-to)
  let discountBadge = '';
  if (d.discount_from && d.discount_to) {
    discountBadge = `<span class="dp-discount-badge">خصم ${d.discount_from}%-${d.discount_to}%</span>`;
  } else if (d.discount_percent || d.discount) {
    discountBadge = `<span class="dp-discount-badge">-${d.discount_percent || d.discount}%</span>`;
  }

  // Price section
  let priceHtml = '';
  if (d.new_price || d.old_price || discountBadge) {
    priceHtml = `
      <div class="dp-price-row">
        ${d.new_price ? `<span class="dp-new-price">${Number(d.new_price).toLocaleString('ar-EG')} جنيه</span>` : ''}
        ${d.old_price ? `<span class="dp-old-price">${Number(d.old_price).toLocaleString('ar-EG')} جنيه</span>` : ''}
        ${discountBadge}
      </div>`;
  }

  // Merchant card
  const merchantHtml = merchant ? `
    <div class="dp-merchant-card"
         ${merchant.business_slug
           ? `onclick="showPage('store');history.pushState({},'','/?p=store&slug=${_dpEsc(merchant.business_slug)}');loadStorePage('${_dpEsc(merchant.business_slug)}')"
              style="cursor:pointer;"`
           : ''}>
      ${merchant.business_logo
        ? `<img src="${_dpEsc(merchant.business_logo)}" alt="${_dpEsc(company)}"
               class="dp-merchant-logo">`
        : `<div class="dp-merchant-avatar">${(company || '؟').charAt(0).toUpperCase()}</div>`}
      <div>
        <div class="dp-merchant-name">${_dpEsc(company)}</div>
        ${merchant.governorate
          ? `<div class="dp-merchant-loc">📍 ${_dpEsc(merchant.governorate)}${merchant.city ? ' — ' + merchant.city : ''}</div>`
          : ''}
        ${merchant.business_slug
          ? `<div style="font-size:11px;color:var(--blue);font-weight:700;margin-top:2px;">
               عرض صفحة المتجر ←
             </div>`
          : ''}
      </div>
    </div>` : (company ? `
    <div class="dp-merchant-card">
      <div class="dp-merchant-avatar">${company.charAt(0).toUpperCase()}</div>
      <div class="dp-merchant-name">${_dpEsc(company)}</div>
    </div>` : '');

  // Description — truncated with "show more" if longer than ~120 chars
  const DESC_LIMIT = 120;
  const descTruncated = desc.length > DESC_LIMIT;
  const descShort = descTruncated ? desc.substring(0, DESC_LIMIT).trim() + '…' : desc;

  wrap.innerHTML = `

    <!-- Back button -->
    <div class="dp-back-row">
      <button class="dp-back-btn" onclick="dpGoBack()">
        ← رجوع
      </button>
      <button class="dp-share-btn" onclick="shareDeal('${_dpEsc(name)}', '${_dpEsc(d.id)}')">
        📤 مشاركة
      </button>
    </div>

    <div class="dp-wrap">

      <!-- ── IMAGES: carousel if 2 images, single otherwise ── -->
      <div class="dp-images">
        <div class="dp-carousel" id="dp-carousel">
          <div class="dp-carousel-track" id="dp-carousel-track">
            <div class="dp-slide">
              ${img
                ? `<img src="${_dpEsc(img)}" alt="${_dpEsc(name)}" loading="eager">`
                : `<div class="dp-img-placeholder">🏷️</div>`}
            </div>
            ${hasImg2 ? `
            <div class="dp-slide">
              <img src="${_dpEsc(img2)}" alt="${_dpEsc(name)}" loading="lazy">
            </div>` : ''}
          </div>

          ${isExpired ? '<div class="dp-expired-overlay">انتهى العرض</div>' : ''}
          ${(d.status === 'hot') ? '<div class="dp-hot-badge">🔥 هوت ديل</div>' : ''}
          ${isOffline ? '<div class="dp-offline-badge">📍 عروض المنطقة</div>' : ''}

          ${hasImg2 ? `
          <button class="dp-carousel-arrow dp-arrow-prev" onclick="dpCarouselGo(-1)" aria-label="الصورة السابقة">
            ‹
          </button>
          <button class="dp-carousel-arrow dp-arrow-next" onclick="dpCarouselGo(1)" aria-label="الصورة التالية">
            ›
          </button>
          <div class="dp-carousel-dots">
            <span class="dp-dot active" data-i="0"></span>
            <span class="dp-dot" data-i="1"></span>
          </div>` : ''}
        </div>
      </div>

      <!-- ── INFO ── -->
      <div class="dp-info">

        <!-- Category breadcrumb -->
        ${catLabel ? `
        <div class="dp-cat-row">
          <span class="dp-cat">${_dpEsc(catLabel)}${_dpEsc(subLabel)}</span>
          ${isOffline ? '<span class="dp-mode-tag">📍 عروض المنطقة</span>' : '<span class="dp-mode-tag">🌐 أونلاين</span>'}
        </div>` : ''}

        <!-- Title -->
        <h1 class="dp-title">${_dpEsc(name)}</h1>

        <!-- Merchant -->
        ${merchantHtml}

        <!-- Price -->
        ${priceHtml}

        <!-- Expiry -->
        ${expiryHtml}

        <!-- Short description right under title (always visible, brief) -->
        ${desc ? `
        <div class="dp-desc-block">
          <p class="dp-section-body" id="dp-desc-text">${_dpEsc(descTruncated ? descShort : desc)}</p>
          ${descTruncated ? `
          <button class="dp-show-more-btn" id="dp-show-more-btn"
                  onclick="dpToggleDescription('${_dpEsc(desc).replace(/'/g, "\\'")}')">
            اظهر المزيد ▾
          </button>` : ''}
        </div>` : ''}

        <!-- Coupon code -->
        ${coupon ? `
        <div class="dp-coupon-box">
          <div class="dp-coupon-label">🎟️ كود الخصم</div>
          <div class="dp-coupon-row">
            <code class="dp-coupon-code" id="dp-coupon-${d.id}">${_dpEsc(coupon)}</code>
            <button class="dp-copy-btn" id="dp-copy-btn-${d.id}"
                    onclick="dealPageCopyCode('${_dpEsc(coupon)}', 'dp-copy-btn-${d.id}')">
              📋 نسخ
            </button>
          </div>
        </div>` : ''}

        <!-- CTA Button -->
        <div class="dp-cta">
          ${isExpired
            ? `<button class="dp-btn-disabled" disabled>انتهى العرض 📦</button>`
            : link
            ? `<a href="${_dpEsc(link)}" target="_blank" rel="noopener"
                  class="dp-btn-primary"
                  onclick="dealPageOpenLink('${_dpEsc(d.id)}')">
                 الحق الفرصة 🔥
               </a>`
            : `<button class="dp-btn-disabled" disabled>لا يوجد رابط</button>`}
        </div>

        <!-- Additional details — always BELOW the CTA button -->
        ${details ? `
        <div class="dp-section">
          <div class="dp-section-title">ℹ️ تفاصيل العرض</div>
          <p class="dp-section-body">${_dpEsc(details)}</p>
        </div>` : ''}

        <!-- Location for offline deals -->
        ${isOffline && (d.governorate || d.location_link) ? `
        <div class="dp-section">
          <div class="dp-section-title">📍 الموقع</div>
          ${d.governorate ? `<p class="dp-section-body">${_dpEsc(d.governorate)}${d.city ? ' — ' + d.city : ''}</p>` : ''}
          ${d.location_link ? `
          <a href="${_dpEsc(d.location_link)}" target="_blank" rel="noopener"
             class="dp-map-link">🗺️ فتح Google Maps</a>` : ''}
        </div>` : ''}

        <!-- Share -->
        <div class="dp-share-row">
          <span style="font-size:13px;color:var(--gray-400);font-weight:700;">شارك العرض:</span>
          <button class="dp-share-wa"
                  onclick="shareDeal('${_dpEsc(name)}', '${_dpEsc(d.id)}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            واتساب
          </button>
        </div>

      </div>
    </div>`;

  // Full SEO update — title, meta, canonical, OG, Product schema
  updateDealSEO(d, merchant);
}

// ===== CAROUSEL =====
let _dpCarouselIndex = 0;

function dpCarouselGo(direction) {
  const track = document.getElementById('dp-carousel-track');
  if (!track) return;
  const slides = track.children.length;
  _dpCarouselIndex = (_dpCarouselIndex + direction + slides) % slides;
  track.style.transform = `translateX(${_dpCarouselIndex * 100}%)`;

  document.querySelectorAll('.dp-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === _dpCarouselIndex);
  });
}

// ===== DESCRIPTION SHOW MORE =====
function dpToggleDescription(fullText) {
  const textEl = document.getElementById('dp-desc-text');
  const btnEl  = document.getElementById('dp-show-more-btn');
  if (!textEl || !btnEl) return;

  const expanded = btnEl.dataset.expanded === 'true';
  if (expanded) {
    textEl.textContent = fullText.length > 120 ? fullText.substring(0, 120).trim() + '…' : fullText;
    btnEl.textContent = 'اظهر المزيد ▾';
    btnEl.dataset.expanded = 'false';
  } else {
    textEl.textContent = fullText;
    btnEl.textContent = 'اظهر أقل ▴';
    btnEl.dataset.expanded = 'true';
  }
}

// ===== COPY COUPON CODE =====
function dealPageCopyCode(code, btnId) {
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById(btnId);
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = '✅ تم النسخ';
      btn.style.background = 'var(--green)';
      btn.style.color      = 'white';
      setTimeout(() => {
        btn.textContent      = orig;
        btn.style.background = '';
        btn.style.color      = '';
      }, 2000);
    }
    toast('✅ تم نسخ الكود!');
  }).catch(() => toast('❌ فشل النسخ — انسخ الكود يدوياً'));
}

// ===== REGISTER CLICK (called on link click) =====
function dealPageOpenLink(dealId) {
  if (!dealId) return;
  // Fire & forget — don't block navigation
  sb.from('deals')
    .select('clicks')
    .eq('id', dealId)
    .single()
    .then(({ data }) => {
      if (data) {
        sb.from('deals')
          .update({ clicks: (data.clicks || 0) + 1 })
          .eq('id', dealId)
          .then(() => {});
      }
    });
}

// ===== SHARE =====
function shareDeal(name, id) {
  const url  = `${window.location.origin}${window.location.pathname}?p=deal&id=${id}`;
  const text = `🏷️ ${name}\nعرض حصري على شيكس!\n`;

  if (navigator.share) {
    navigator.share({ title: name, text, url }).catch(() => {});
  } else {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text + url)}`;
    window.open(waUrl, '_blank');
  }
}

// ===== SAFE BACK NAVIGATION =====
// Avoids landing on a stale /?p=deal (no id) history entry —
// goes to deals listing directly instead of relying on history.back()
function dpGoBack() {
  history.pushState({ page: 'deals' }, '', '/?p=deals');
  showPage('deals');
}

// ===== HELPERS =====
function _dpErr(msg) {
  return `
    <div style="display:flex;align-items:center;justify-content:center;min-height:60vh;">
      <div style="text-align:center;color:var(--gray-400);max-width:320px;">
        <div style="font-size:52px;margin-bottom:16px;">🏷️</div>
        <h3 style="font-size:18px;font-weight:900;color:var(--gray-700);margin-bottom:8px;">
          ${msg}
        </h3>
        <p style="font-size:13px;margin-bottom:20px;">
          العرض قد ينتهي أو يكون الرابط غير صحيح
        </p>
        <button class="btn-primary" onclick="dpGoBack()">← رجوع</button>
      </div>
    </div>`;
}

function _dpEsc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
