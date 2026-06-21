/**
 * ============================================================
 * SHEKSS — ADMIN: ALL DEALS MANAGEMENT
 * scripts/admin-all-deals.js
 * ============================================================
 * Full admin control over ALL approved/active deals —
 * both admin-owned (merchant_id = null) and merchant-owned.
 * Unlike the merchant's own edit/delete flow (which requires
 * admin approval), this gives the admin DIRECT edit/delete
 * power over any deal on the platform — no approval needed
 * since the admin IS the approver.
 *
 * Depends on: admin-dashboard.js (_aesc, _setBadge),
 *             supabase.js, utils.js, data.js (CAT_LABELS, ONLINE_CATS, OFFLINE_CATS)
 * ============================================================
 */

let _aadAllDealsCache = [];

// ===== RENDER LIST =====
async function renderAdminAllDeals() {
  const content = document.getElementById('adm-content');
  if (!content) return;

  content.innerHTML = '<div class="mdm-loading">⏳ جاري تحميل العروض...</div>';

  const { data, error } = await sb
    .from('deals')
    .select('*')
    .eq('approval_status', 'approved')
    .neq('status', 'expired')
    .order('created_at', { ascending: false });

  if (error) { content.innerHTML = _adm_err(error.message); return; }

  _aadAllDealsCache = data || [];

  if (!_aadAllDealsCache.length) {
    content.innerHTML = _adm_empty('🏷️', 'لا توجد عروض نشطة', 'لم يتم نشر أي عروض بعد');
    return;
  }

  content.innerHTML = `
    <div style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap;">
      <button class="store-cat-chip active" data-filter="all" onclick="aadFilterDeals('all')">
        الكل (${_aadAllDealsCache.length})
      </button>
      <button class="store-cat-chip" data-filter="admin" onclick="aadFilterDeals('admin')">
        🛡️ عروض الإدارة (${_aadAllDealsCache.filter(d => !d.merchant_id).length})
      </button>
      <button class="store-cat-chip" data-filter="merchant" onclick="aadFilterDeals('merchant')">
        🏪 عروض التجار (${_aadAllDealsCache.filter(d => d.merchant_id).length})
      </button>
    </div>
    <div class="adm-list" id="aad-all-list">
      ${_aadAllDealsCache.map(d => _allDealCard(d)).join('')}
    </div>`;
}

// ===== FILTER =====
function aadFilterDeals(type) {
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === type);
  });

  const list = document.getElementById('aad-all-list');
  if (!list) return;

  const filtered = type === 'all'
    ? _aadAllDealsCache
    : type === 'admin'
      ? _aadAllDealsCache.filter(d => !d.merchant_id)
      : _aadAllDealsCache.filter(d => d.merchant_id);

  list.innerHTML = filtered.map(d => _allDealCard(d)).join('')
    || `<div style="text-align:center;padding:32px;color:var(--gray-400);">لا توجد عروض في هذا القسم</div>`;
}

// ===== DEAL CARD =====
function _allDealCard(d) {
  const title   = d.title || d.name || '—';
  const img     = d.main_image || d.image;
  const isAdmin = !d.merchant_id;
  const cat     = d.category ? (CAT_LABELS[d.category] || d.category) : '—';

  return `
    <div class="adm-card" id="aad-card-${d.id}">
      <div class="adm-card-body">
        ${img ? `
          <div style="width:56px;height:56px;flex-shrink:0;border-radius:8px;overflow:hidden;background:var(--gray-50);">
            <img src="${_aadEsc(img)}" alt="" style="width:100%;height:100%;object-fit:cover;">
          </div>` : `
          <div style="width:56px;height:56px;flex-shrink:0;border-radius:8px;background:var(--blue-light);
                      display:flex;align-items:center;justify-content:center;font-size:22px;">🏷️</div>`}
        <div class="adm-card-info">
          <div class="adm-card-title">${_aadEsc(title)}</div>
          <div class="adm-card-meta">
            <span>${isAdmin ? '🛡️ عرض إدارة' : '🏪 ' + _aadEsc(d.company_name || 'تاجر')}</span>
            <span>📂 ${_aadEsc(cat)}</span>
            ${d.is_offline ? '<span>📍 عروض المنطقة</span>' : '<span>🌐 أونلاين</span>'}
            ${d.status === 'hot' ? '<span>🔥 هوت ديل</span>' : ''}
          </div>
        </div>
      </div>
      <div class="adm-action-btns">
        <button class="adm-btn adm-btn-approve" onclick="aadOpenEditModal('${d.id}')">
          ✏️ تعديل
        </button>
        <button class="adm-btn adm-btn-reject" onclick="aadDeleteDeal('${d.id}')">
          🗑️ حذف
        </button>
      </div>
    </div>`;
}

// ===== DELETE (direct, no approval flow — admin has full authority) =====
async function aadDeleteDeal(dealId) {
  if (!confirm('هل تريد حذف هذا العرض نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.')) return;

  const { error } = await sb.from('deals').delete().eq('id', dealId);

  if (error) { toast('❌ ' + error.message); return; }

  document.getElementById(`aad-card-${dealId}`)?.remove();
  _aadAllDealsCache = _aadAllDealsCache.filter(d => d.id !== dealId);
  toast('🗑️ تم حذف العرض');
}

// ===== EDIT MODAL =====
function aadOpenEditModal(dealId) {
  const d = _aadAllDealsCache.find(x => x.id === dealId);
  if (!d) return;

  const allCats = [...ONLINE_CATS, ...OFFLINE_CATS].filter(c => c.id !== 'all');
  const seenIds = new Set();
  const cats = allCats.filter(c => { if (seenIds.has(c.id)) return false; seenIds.add(c.id); return true; });

  const overlay = document.createElement('div');
  overlay.id = 'aad-edit-overlay';
  overlay.className = 'aad-modal-overlay';
  overlay.innerHTML = `
    <div class="aad-modal">
      <div class="aad-modal-head">
        <h3>✏️ تعديل العرض</h3>
        <button class="aad-modal-close" onclick="aadCloseEditModal()">✕</button>
      </div>

      <div class="aad-modal-body">
        <div class="form-msg error" id="aad-edit-err"></div>

        <div class="form-group">
          <label class="form-label">عنوان العرض</label>
          <input class="form-input" type="text" id="aad-edit-title"
                 value="${_aadEsc(d.title || d.name || '')}" maxlength="100">
        </div>

        <div class="form-group">
          <label class="form-label">الوصف</label>
          <textarea class="form-input form-textarea" id="aad-edit-desc" rows="3"
                    maxlength="500">${_aadEsc(d.description || '')}</textarea>
        </div>

        <div class="price-row">
          <div class="form-group">
            <label class="form-label">السعر قبل</label>
            <input class="form-input" type="number" id="aad-edit-old-price"
                   value="${d.old_price || ''}" min="0" step="0.01">
          </div>
          <div class="form-group">
            <label class="form-label">السعر بعد</label>
            <input class="form-input" type="number" id="aad-edit-new-price"
                   value="${d.new_price || ''}" min="0" step="0.01">
          </div>
        </div>

        <div class="price-row">
          <div class="form-group">
            <label class="form-label">التصنيف</label>
            <select class="form-input" id="aad-edit-category">
              ${cats.map(c => `<option value="${c.id}" ${d.category === c.id ? 'selected' : ''}>${c.ico} ${c.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">الحالة</label>
            <select class="form-input" id="aad-edit-status">
              <option value="active" ${d.status === 'active' ? 'selected' : ''}>✅ نشط</option>
              <option value="hot" ${d.status === 'hot' ? 'selected' : ''}>🔥 هوت ديل</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">اسم المتجر / النشاط</label>
          <input class="form-input" type="text" id="aad-edit-company"
                 value="${_aadEsc(d.company_name || '')}">
        </div>

        <div class="form-group">
          <label class="form-label">كود الكوبون</label>
          <input class="form-input" type="text" id="aad-edit-coupon"
                 value="${_aadEsc(d.coupon_code || '')}" dir="ltr">
        </div>

        <div class="form-group">
          <label class="form-label">الرابط</label>
          <input class="form-input" type="url" id="aad-edit-link"
                 value="${_aadEsc(d.link || d.location_link || '')}" dir="ltr">
        </div>
      </div>

      <div class="aad-modal-foot">
        <button class="dash-btn dash-btn-ghost" onclick="aadCloseEditModal()">إلغاء</button>
        <button class="dash-btn dash-btn-primary" id="aad-edit-save-btn"
                onclick="aadSaveEdit('${d.id}')">💾 حفظ التعديلات</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
}

function aadCloseEditModal() {
  document.getElementById('aad-edit-overlay')?.remove();
}

async function aadSaveEdit(dealId) {
  const title    = document.getElementById('aad-edit-title')?.value.trim();
  const desc     = document.getElementById('aad-edit-desc')?.value.trim();
  const oldP     = parseFloat(document.getElementById('aad-edit-old-price')?.value) || null;
  const newP     = parseFloat(document.getElementById('aad-edit-new-price')?.value) || null;
  const category = document.getElementById('aad-edit-category')?.value;
  const status   = document.getElementById('aad-edit-status')?.value;
  const company  = document.getElementById('aad-edit-company')?.value.trim();
  const coupon   = document.getElementById('aad-edit-coupon')?.value.trim();
  const link     = document.getElementById('aad-edit-link')?.value.trim();

  const errEl = document.getElementById('aad-edit-err');
  const btn   = document.getElementById('aad-edit-save-btn');

  if (!title) { _aadMsg(errEl, '⚠️ عنوان العرض مطلوب', true); return; }

  btn.disabled = true; btn.textContent = '⏳ جاري الحفظ...';

  let discPct = null;
  if (oldP && newP && oldP > newP) {
    discPct = Math.round((1 - newP / oldP) * 100);
  }

  const updateData = {
    title, name: title,
    description: desc,
    old_price: oldP, price: oldP,
    new_price: newP,
    discount: discPct,
    discount_percent: discPct,
    category,
    status,
    company_name: company,
    coupon_code: coupon || 'شيكس',
    link, location_link: link,
  };

  const { error } = await sb.from('deals').update(updateData).eq('id', dealId);

  if (error) {
    _aadMsg(errEl, '❌ ' + error.message, true);
    btn.disabled = false; btn.textContent = '💾 حفظ التعديلات';
    return;
  }

  toast('✅ تم تحديث العرض بنجاح');
  aadCloseEditModal();

  // Update cache + re-render card in place
  const idx = _aadAllDealsCache.findIndex(d => d.id === dealId);
  if (idx !== -1) {
    Object.assign(_aadAllDealsCache[idx], updateData);
    const cardEl = document.getElementById(`aad-card-${dealId}`);
    if (cardEl) cardEl.outerHTML = _allDealCard(_aadAllDealsCache[idx]);
  }
}

// ===== HELPERS =====
function _aadMsg(el, msg, show) {
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('show', show);
}

function _aadEsc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
