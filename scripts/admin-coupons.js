/**
 * ============================================================
 * SHEKSS — ADMIN: SPECIALTY COUPONS
 * scripts/admin-coupons.js
 * ============================================================
 * Admin manages platform-level specialty coupons.
 * Not tied to any merchant — شيكس curated coupons.
 * Writes to: public.coupons table
 * ============================================================
 */

// ===== RENDER =====
async function renderAdminCoupons() {
  const content = document.getElementById('adm-content');
  if (!content) return;

  content.innerHTML = '<div class="mdm-loading">⏳ جاري تحميل الكوبونات...</div>';

  const { data, error } = await sb.from('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { content.innerHTML = _adm_err(error.message); return; }

  content.innerHTML = `
    <div style="max-width:700px;">

      <!-- Add Form -->
      <div class="form-card" style="margin-bottom:24px;">
        <div class="form-card-title">🎟️ إضافة كوبون تخصصي جديد</div>

        <div class="form-msg error"  id="acp-err"></div>
        <div class="form-msg success" id="acp-ok"></div>

        <div class="price-row">
          <div class="form-group">
            <label class="form-label">اسم الموقع / المتجر <span class="req">*</span></label>
            <input class="form-input" type="text" id="acp-site"
                   placeholder="مثال: Noon، Amazon، Namshi">
          </div>
          <div class="form-group">
            <label class="form-label">كود الكوبون <span class="req">*</span></label>
            <input class="form-input" type="text" id="acp-code"
                   placeholder="مثال: SHEKSS50" dir="ltr"
                   style="text-transform:uppercase;"
                   oninput="this.value=this.value.toUpperCase()">
          </div>
        </div>

        <div class="price-row">
          <div class="form-group">
            <label class="form-label">نوع الخصم</label>
            <select class="form-input" id="acp-type">
              <option value="percent">نسبة مئوية %</option>
              <option value="fixed">مبلغ ثابت جنيه</option>
              <option value="free_shipping">شحن مجاني</option>
              <option value="other">أخرى</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">قيمة الخصم</label>
            <input class="form-input" type="number" id="acp-discount"
                   placeholder="مثال: 50" min="0" step="0.01">
          </div>
        </div>

        <div class="price-row">
          <div class="form-group">
            <label class="form-label">رابط الشعار (Logo URL)</label>
            <input class="form-input" type="url" id="acp-logo"
                   placeholder="https://..." dir="ltr">
          </div>
          <div class="form-group">
            <label class="form-label">تاريخ الانتهاء</label>
            <input class="form-input" type="date" id="acp-expires">
          </div>
        </div>

        <button class="dash-btn dash-btn-primary" style="width:100%;justify-content:center;"
                id="acp-submit-btn" onclick="submitAdminCoupon()">
          🎟️ إضافة الكوبون
        </button>
      </div>

      <!-- Coupons List -->
      <div class="form-card-title" style="margin-bottom:12px;">
        📋 الكوبونات الحالية (${(data || []).length})
      </div>

      ${!(data || []).length
        ? _adm_empty('🎟️', 'لا توجد كوبونات', 'أضف أول كوبون تخصصي لشيكس')
        : `<div class="adm-list" id="acp-list">
             ${(data || []).map(c => _couponCard(c)).join('')}
           </div>`}
    </div>`;
}

// ===== COUPON CARD =====
function _couponCard(c) {
  const typeLabel = {
    percent:      `${c.discount || ''}%`,
    fixed:        `${c.discount || ''} جنيه`,
    free_shipping: 'شحن مجاني',
    other:        'خصم خاص',
  }[c.type] || '—';

  const expired = c.expires_at && new Date(c.expires_at) < new Date();

  return `
    <div class="adm-card" id="acp-card-${c.id}"
         style="${expired ? 'opacity:0.6;' : ''}">
      <div class="adm-card-body">
        ${c.logo ? `
          <div style="width:52px;height:52px;flex-shrink:0;border-radius:8px;overflow:hidden;
                      background:var(--gray-50);border:1px solid var(--gray-200);">
            <img src="${_acpEsc(c.logo)}" alt=""
                 style="width:100%;height:100%;object-fit:contain;">
          </div>` : `
          <div style="width:52px;height:52px;flex-shrink:0;border-radius:8px;
                      background:var(--blue-light);display:flex;align-items:center;
                      justify-content:center;font-size:22px;">🎟️</div>`}
        <div class="adm-card-info">
          <div class="adm-card-title">${_acpEsc(c.site_name || '—')}</div>
          <div class="adm-card-meta">
            <span style="background:var(--gray-800);color:white;padding:3px 10px;
                         border-radius:6px;font-family:monospace;font-size:13px;
                         font-weight:900;letter-spacing:1px;">
              ${_acpEsc(c.code)}
            </span>
            <span>💰 ${typeLabel}</span>
            ${c.expires_at
              ? `<span ${expired ? 'style="color:var(--red);"' : ''}>
                   📅 ${expired ? '❌ منتهي — ' : ''}
                   ${new Date(c.expires_at).toLocaleDateString('ar-EG')}
                 </span>`
              : '<span>♾️ بدون انتهاء</span>'}
          </div>
        </div>
      </div>
      <div class="adm-action-btns">
        <button class="adm-btn adm-btn-delete"
                onclick="deleteAdminCoupon('${c.id}')">
          🗑️ حذف
        </button>
      </div>
    </div>`;
}

// ===== SUBMIT COUPON =====
async function submitAdminCoupon() {
  const site     = document.getElementById('acp-site')?.value.trim();
  const code     = document.getElementById('acp-code')?.value.trim().toUpperCase();
  const type     = document.getElementById('acp-type')?.value    || 'percent';
  const discount = parseFloat(document.getElementById('acp-discount')?.value) || null;
  const logo     = document.getElementById('acp-logo')?.value.trim()    || null;
  const expires  = document.getElementById('acp-expires')?.value || null;

  const errEl = document.getElementById('acp-err');
  const okEl  = document.getElementById('acp-ok');
  const btn   = document.getElementById('acp-submit-btn');

  _acpMsg(errEl, '', false);
  _acpMsg(okEl,  '', false);

  if (!site) { _acpMsg(errEl, '⚠️ اسم الموقع مطلوب', true); return; }
  if (!code) { _acpMsg(errEl, '⚠️ كود الكوبون مطلوب', true); return; }

  btn.disabled = true; btn.textContent = '⏳ جاري الإضافة...';

  const { data, error } = await sb.from('coupons').insert({
    site_name:  site,
    code,
    type,
    discount,
    logo,
    expires_at: expires ? new Date(expires).toISOString() : null,
  }).select().single();

  if (error) {
    _acpMsg(errEl, '❌ ' + error.message, true);
    btn.disabled = false; btn.textContent = '🎟️ إضافة الكوبون';
    return;
  }

  _acpMsg(okEl, '✅ تم إضافة الكوبون بنجاح!', true);
  btn.disabled = false; btn.textContent = '🎟️ إضافة الكوبون';

  // Clear form
  ['acp-site','acp-code','acp-logo','acp-expires'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const discountEl = document.getElementById('acp-discount');
  if (discountEl) discountEl.value = '';

  // Prepend to list
  const list = document.getElementById('acp-list');
  if (list && data) {
    list.insertAdjacentHTML('afterbegin', _couponCard(data));
  }
}

// ===== DELETE COUPON =====
async function deleteAdminCoupon(couponId) {
  if (!confirm('هل تريد حذف هذا الكوبون نهائياً؟')) return;

  const { error } = await sb.from('coupons')
    .delete().eq('id', couponId);

  if (error) { toast('❌ ' + error.message); return; }

  document.getElementById(`acp-card-${couponId}`)?.remove();
  toast('🗑️ تم حذف الكوبون');
}

// ===== HELPERS =====
function _acpMsg(el, msg, show) {
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('show', show);
}

function _acpEsc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
