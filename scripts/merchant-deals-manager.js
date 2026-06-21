/**
 * ============================================================
 * SHEKSS — MERCHANT DEALS MANAGER
 * scripts/merchant-deals-manager.js
 * ============================================================
 * Owns the "عروضي" section inside the merchant dashboard.
 * Replaces the stub _renderDeals / _loadMerchantDeals /
 * _merchantDealRow that lived in merchant-dashboard.js.
 *
 * Public API (called by merchant-dashboard.js):
 *   renderDealsSection()   → HTML string for the section shell
 *   loadMerchantDeals()    → async, populates #merchant-deals-list
 *
 * Internal flow:
 *   loadMerchantDeals()
 *     → _fetchMerchantDeals()      DB query
 *     → _renderDealsList()         builds HTML rows
 *     → _updateDealsCounts()       updates sidebar badge
 *
 *   showDealDetail(dealId)         full-screen deal view
 *   openEditRequest(dealId)        inline edit form
 *   submitEditRequest(dealId)      sends PATCH to DB
 *   requestDelete(dealId)          confirmation + PATCH to DB
 *
 * Depends on: auth.js (AuthState), utils.js (toast), supabase.js (sb)
 * ============================================================
 */

// ===== MODULE STATE =====
let _merchantDeals  = [];   // cached deals array
let _viewingDealId  = null; // currently open deal detail
let _editingDealId  = null; // currently open edit form

// ===== SECTION SHELL (called from switchDashSection) =====
function renderDealsSection() {
  return `
    <div class="mdm-wrap">
      <div class="mdm-toolbar">
        <div class="mdm-toolbar-left">
          <span class="mdm-count" id="mdm-total">جاري التحميل...</span>
        </div>
        <button class="dash-btn dash-btn-primary"
                onclick="switchDashSection('add-deal')">
          + إضافة عرض جديد
        </button>
      </div>

      <!-- Filter tabs -->
      <div class="mdm-tabs" id="mdm-tabs">
        <button class="mdm-tab active" data-filter="all"
                onclick="filterMerchantDeals('all',this)">الكل</button>
        <button class="mdm-tab" data-filter="approved"
                onclick="filterMerchantDeals('approved',this)">مُعتمدة</button>
        <button class="mdm-tab" data-filter="pending_approval"
                onclick="filterMerchantDeals('pending_approval',this)">في الانتظار</button>
        <button class="mdm-tab" data-filter="rejected"
                onclick="filterMerchantDeals('rejected',this)">مرفوضة</button>
        <button class="mdm-tab" data-filter="expired"
                onclick="filterMerchantDeals('expired',this)">منتهية</button>
      </div>

      <!-- List area -->
      <div id="merchant-deals-list">
        <div class="mdm-loading">⏳ جاري تحميل عروضك...</div>
      </div>
    </div>`;
}

// ===== FETCH + RENDER =====
async function loadMerchantDeals() {
  _merchantDeals = await _fetchMerchantDeals();
  _renderDealsList(_merchantDeals);
  _updateDealsBadge(_merchantDeals.length);
}

async function _fetchMerchantDeals() {
  const { data, error } = await sb
    .from('deals')
    .select(`
      id, title, name, description, details,
      main_image, image, second_image,
      category, subcategory, status, approval_status,
      old_price, price, new_price, discount, discount_percent,
      company_name, coupon_code, location_link, link,
      expires_at, created_at, updated_at,
      reject_reason,
      edit_request_status, delete_request_status,
      views, clicks,
      is_offline
    `)
    .eq('merchant_id', AuthState.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    toast('❌ خطأ في تحميل العروض');
    return [];
  }
  return data || [];
}

function _renderDealsList(deals) {
  const listEl = document.getElementById('merchant-deals-list');
  if (!listEl) return;

  // Update counter
  const countEl = document.getElementById('mdm-total');
  if (countEl) countEl.textContent = `${deals.length} عرض`;

  if (!deals.length) {
    listEl.innerHTML = `
      <div class="mdm-empty">
        <div class="mdm-empty-ico">🏷️</div>
        <h4>لا توجد عروض</h4>
        <p>اضغط "+ إضافة عرض جديد" لإرسال أول عرض لمراجعة فريق شيكس</p>
      </div>`;
    return;
  }

  listEl.innerHTML = deals.map(d => _dealRow(d)).join('');
}

// ===== FILTER TABS =====
function filterMerchantDeals(filter, btn) {
  // Update active tab
  document.querySelectorAll('.mdm-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const filtered = filter === 'all'
    ? _merchantDeals
    : _merchantDeals.filter(d => {
        if (filter === 'expired')    return d.status === 'expired';
        if (filter === 'approved')   return d.approval_status === 'approved' && d.status !== 'expired';
        if (filter === 'rejected')   return d.approval_status === 'rejected';
        if (filter === 'pending_approval') return d.approval_status === 'pending_approval';
        return true;
      });

  _renderDealsList(filtered);
}

// ===== DEAL ROW =====
function _dealRow(d) {
  const title    = d.title || d.name || '—';
  const img      = d.main_image || d.image;
  const disc     = d.discount_percent || d.discount;
  const oldP     = d.old_price || d.price;
  const newP     = d.new_price;
  const created  = _fmtDate(d.created_at);
  const expires  = d.expires_at ? _fmtDate(d.expires_at) : '—';
  const views    = (d.views || 0).toLocaleString('ar-EG');
  const clicks   = (d.clicks || 0).toLocaleString('ar-EG');

  // Approval badge
  const approvalBadge = _approvalBadge(d.approval_status);

  // Status badge (active/hot/expired)
  const statusBadge = _statusBadge(d.status);

  // Request badges
  const editBadge   = d.edit_request_status === 'pending'
    ? '<span class="mdm-req-badge req-edit">طلب تعديل معلّق</span>' : '';
  const deleteBadge = d.delete_request_status === 'pending'
    ? '<span class="mdm-req-badge req-delete">طلب حذف معلّق</span>' : '';

  // Reject reason box
  const rejectBox = (d.approval_status === 'rejected' && d.reject_reason)
    ? `<div class="mdm-reject-reason">
         <strong>سبب الرفض:</strong> ${_mdmEsc(d.reject_reason)}
       </div>` : '';

  // Action buttons
  const canEdit   = d.approval_status === 'approved' && !d.edit_request_status && d.status !== 'expired';
  const canDelete = d.approval_status !== 'rejected'  && !d.delete_request_status;

  const editBtn   = canEdit
    ? `<button class="mdm-action-btn mdm-edit-btn"
               onclick="openEditRequest('${d.id}')">✏️ طلب تعديل</button>` : '';
  const deleteBtn = canDelete
    ? `<button class="mdm-action-btn mdm-delete-btn"
               onclick="requestDelete('${d.id}')">🗑️ طلب حذف</button>` : '';

  return `
    <div class="mdm-row" id="deal-row-${d.id}">
      <div class="mdm-row-img" onclick="showDealDetail('${d.id}')">
        ${img
          ? `<img src="${_mdmEsc(img)}" alt="${_mdmEsc(title)}" loading="lazy">`
          : '<div class="mdm-img-placeholder">🏷️</div>'}
      </div>

      <div class="mdm-row-body">
        <div class="mdm-row-top">
          <span class="mdm-row-title" onclick="showDealDetail('${d.id}')">${_mdmEsc(title)}</span>
          <div class="mdm-row-badges">
            ${approvalBadge} ${statusBadge} ${editBadge} ${deleteBadge}
          </div>
        </div>

        ${rejectBox}

        <div class="mdm-row-meta">
          ${disc  ? `<span>🏷️ خصم ${disc}%</span>` : ''}
          ${oldP  ? `<span>💰 ${Number(oldP).toLocaleString('ar-EG')} ج</span>` : ''}
          ${newP  ? `<span>✅ ${Number(newP).toLocaleString('ar-EG')} ج</span>` : ''}
          <span>📅 ${created}</span>
          <span>⏰ ${expires}</span>
        </div>

        <div class="mdm-row-stats">
          <span class="mdm-stat">👁️ ${views} مشاهدة</span>
          <span class="mdm-stat">🖱️ ${clicks} نقرة</span>
        </div>
      </div>

      <div class="mdm-row-actions">
        <button class="mdm-action-btn mdm-view-btn"
                onclick="showDealDetail('${d.id}')">🔍 تفاصيل</button>
        ${editBtn}
        ${deleteBtn}
      </div>
    </div>`;
}

// ===== DEAL DETAIL VIEW =====
function showDealDetail(dealId) {
  _viewingDealId = dealId;
  const d = _merchantDeals.find(x => x.id === dealId);
  if (!d) return;

  const contentEl = document.getElementById('dash-section-content');
  if (!contentEl) return;

  const title   = d.title || d.name || '—';
  const img     = d.main_image || d.image;
  const img2    = d.second_image;
  const disc    = d.discount_percent || d.discount;
  const oldP    = d.old_price || d.price;
  const newP    = d.new_price;
  const savings = (oldP && newP) ? (oldP - newP).toLocaleString('ar-EG') : null;

  contentEl.innerHTML = `
    <div class="mdm-detail-wrap">

      <div class="mdm-detail-header">
        <button class="dash-btn dash-btn-ghost"
                onclick="switchDashSection('deals')">← العودة لعروضي</button>
        <div class="mdm-detail-badges">
          ${_approvalBadge(d.approval_status)}
          ${_statusBadge(d.status)}
        </div>
      </div>

      ${(d.approval_status === 'rejected' && d.reject_reason) ? `
        <div class="mdm-reject-reason mdm-reject-large">
          <strong>❌ سبب الرفض:</strong> ${_mdmEsc(d.reject_reason)}
        </div>` : ''}

      <div class="mdm-detail-grid">

        <!-- Images -->
        <div class="mdm-detail-imgs">
          ${img  ? `<img src="${_mdmEsc(img)}"  alt="${_mdmEsc(title)}" class="mdm-detail-img main-img">` : ''}
          ${img2 ? `<img src="${_mdmEsc(img2)}" alt="${_mdmEsc(title)}" class="mdm-detail-img">` : ''}
        </div>

        <!-- Info -->
        <div class="mdm-detail-info">
          <h2 class="mdm-detail-title">${_mdmEsc(title)}</h2>
          ${d.company_name ? `<p class="mdm-detail-company">🏪 ${_mdmEsc(d.company_name)}</p>` : ''}
          ${d.description  ? `<p class="mdm-detail-desc">${_mdmEsc(d.description)}</p>`        : ''}
          ${d.details      ? `<p class="mdm-detail-details">${_mdmEsc(d.details)}</p>`          : ''}

          <div class="mdm-detail-prices">
            ${oldP ? `<span class="mdm-old-price">${Number(oldP).toLocaleString('ar-EG')} ج</span>` : ''}
            ${newP ? `<span class="mdm-new-price">${Number(newP).toLocaleString('ar-EG')} ج</span>` : ''}
            ${disc ? `<span class="mdm-disc-badge">خصم ${disc}%</span>` : ''}
          </div>
          ${savings ? `<p class="mdm-savings">💰 توفير ${savings} ج</p>` : ''}

          <div class="mdm-detail-meta-grid">
            <div class="mdm-meta-item"><span>📂 القسم</span><strong>${_mdmEsc(d.category || '—')}</strong></div>
            <div class="mdm-meta-item"><span>📁 الفرعي</span><strong>${_mdmEsc(d.subcategory || '—')}</strong></div>
            <div class="mdm-meta-item"><span>🎟️ الكوبون</span><strong>${_mdmEsc(d.coupon_code || '—')}</strong></div>
            <div class="mdm-meta-item"><span>📍 النوع</span><strong>${d.is_offline ? 'عروض المنطقة' : 'أونلاين'}</strong></div>
            <div class="mdm-meta-item"><span>📅 أُضيف</span><strong>${_fmtDate(d.created_at)}</strong></div>
            <div class="mdm-meta-item"><span>⏰ ينتهي</span><strong>${d.expires_at ? _fmtDate(d.expires_at) : '—'}</strong></div>
          </div>

          <div class="mdm-detail-stats">
            <div class="mdm-detail-stat"><span class="mdm-detail-stat-val">${(d.views||0).toLocaleString('ar-EG')}</span><span>مشاهدة 👁️</span></div>
            <div class="mdm-detail-stat"><span class="mdm-detail-stat-val">${(d.clicks||0).toLocaleString('ar-EG')}</span><span>نقرة 🖱️</span></div>
          </div>

          ${d.link || d.location_link ? `
            <a href="${_mdmEsc(d.link || d.location_link)}" target="_blank" rel="noopener"
               class="mdm-link-btn">🔗 فتح رابط العرض</a>` : ''}

          <div class="mdm-detail-actions">
            ${d.approval_status === 'approved' && !d.edit_request_status && d.status !== 'expired'
              ? `<button class="dash-btn dash-btn-primary" onclick="openEditRequest('${d.id}')">✏️ طلب تعديل</button>` : ''}
            ${!d.delete_request_status
              ? `<button class="dash-btn mdm-del-btn" onclick="requestDelete('${d.id}')">🗑️ طلب حذف</button>` : ''}
          </div>
        </div>
      </div>

      <!-- Edit form slot -->
      <div id="edit-request-slot"></div>

    </div>`;
}

// ===== EDIT REQUEST FORM =====
function openEditRequest(dealId) {
  _editingDealId = dealId;
  const d = _merchantDeals.find(x => x.id === dealId);
  if (!d) return;

  const slot = document.getElementById('edit-request-slot');
  const target = slot || document.getElementById('dash-section-content');
  if (!target) return;

  const html = `
    <div class="mdm-edit-form" id="edit-form-wrap">
      <div class="form-card-title" style="font-size:16px;margin-bottom:20px;">
        ✏️ طلب تعديل العرض
      </div>
      <p style="font-size:13px;color:var(--gray-600);margin-bottom:20px;">
        التعديلات لن تُطبَّق مباشرة — ستُرسَل لمراجعة فريق شيكس أولاً.
      </p>

      <div class="form-msg error"  id="edit-form-error"></div>
      <div class="form-msg success" id="edit-form-success"></div>

      <div class="add-deal-grid">
        <div class="add-deal-col">
          <div class="form-group">
            <label class="form-label">اسم العرض</label>
            <input class="form-input" type="text" id="edit-title"
                   value="${_mdmEsc(d.title || d.name || '')}" maxlength="120">
          </div>
          <div class="form-group">
            <label class="form-label">وصف مختصر</label>
            <textarea class="form-input form-textarea" id="edit-desc"
                      rows="2" maxlength="200">${_mdmEsc(d.description || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">تفاصيل إضافية</label>
            <textarea class="form-input form-textarea" id="edit-details"
                      rows="3" maxlength="600">${_mdmEsc(d.details || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">اسم الشركة</label>
            <input class="form-input" type="text" id="edit-company"
                   value="${_mdmEsc(d.company_name || '')}" maxlength="80">
          </div>
        </div>
        <div class="add-deal-col">
          <div class="price-row">
            <div class="form-group">
              <label class="form-label">السعر قبل (ج.م)</label>
              <input class="form-input" type="number" id="edit-old-price"
                     value="${d.old_price || d.price || ''}" min="0" step="0.01">
            </div>
            <div class="form-group">
              <label class="form-label">السعر بعد (ج.م)</label>
              <input class="form-input" type="number" id="edit-new-price"
                     value="${d.new_price || ''}" min="0" step="0.01">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">كود الكوبون</label>
            <input class="form-input" type="text" id="edit-coupon"
                   value="${_mdmEsc(d.coupon_code || 'شيكس')}" maxlength="30">
          </div>
          <div class="form-group">
            <label class="form-label">رابط العرض</label>
            <input class="form-input" type="url" id="edit-link" dir="ltr"
                   value="${_mdmEsc(d.link || d.location_link || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">سبب طلب التعديل <span class="req">*</span></label>
            <textarea class="form-input form-textarea" id="edit-reason"
                      rows="2" maxlength="300"
                      placeholder="اشرح باختصار ما الذي تريد تعديله ولماذا"></textarea>
          </div>
        </div>
      </div>

      <div class="add-deal-actions" style="margin-top:16px;">
        <button class="dash-btn dash-btn-ghost" onclick="cancelEditRequest()">إلغاء</button>
        <button class="dash-btn dash-btn-primary" id="edit-submit-btn"
                onclick="submitEditRequest('${d.id}')">
          📤 إرسال طلب التعديل
        </button>
      </div>
    </div>`;

  if (slot) {
    target.innerHTML = html;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    target.insertAdjacentHTML('beforeend', html);
    document.getElementById('edit-form-wrap')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function cancelEditRequest() {
  _editingDealId = null;
  const slot = document.getElementById('edit-request-slot');
  if (slot) slot.innerHTML = '';
  else if (_viewingDealId) showDealDetail(_viewingDealId);
  else switchDashSection('deals');
}

// ===== SUBMIT EDIT REQUEST =====
async function submitEditRequest(dealId) {
  const btn    = document.getElementById('edit-submit-btn');
  const errEl  = document.getElementById('edit-form-error');
  const okEl   = document.getElementById('edit-form-success');

  _fmsg(errEl, '', false);
  _fmsg(okEl,  '', false);

  const reason = document.getElementById('edit-reason')?.value.trim();
  if (!reason) {
    _fmsg(errEl, '⚠️ من فضلك اكتب سبب طلب التعديل', true);
    return;
  }

  const editData = {
    title:       document.getElementById('edit-title')?.value.trim()    || null,
    description: document.getElementById('edit-desc')?.value.trim()     || null,
    details:     document.getElementById('edit-details')?.value.trim()  || null,
    company_name:document.getElementById('edit-company')?.value.trim()  || null,
    old_price:   parseFloat(document.getElementById('edit-old-price')?.value) || null,
    new_price:   parseFloat(document.getElementById('edit-new-price')?.value) || null,
    coupon_code: document.getElementById('edit-coupon')?.value.trim()   || null,
    link:        document.getElementById('edit-link')?.value.trim()     || null,
    reason,
  };

  if (btn) { btn.disabled = true; btn.textContent = '⏳ جاري الإرسال...'; }

  try {
    const { error } = await sb
      .from('deals')
      .update({
        edit_request_status: 'pending',
        edit_request_data:   editData,
      })
      .eq('id', dealId)
      .eq('merchant_id', AuthState.user.id);

    if (error) throw error;

    _fmsg(okEl, '✅ تم إرسال طلب التعديل — سيتم مراجعته خلال ٢٤ ساعة.', true);

    // Refresh cached deal
    const idx = _merchantDeals.findIndex(x => x.id === dealId);
    if (idx > -1) {
      _merchantDeals[idx].edit_request_status = 'pending';
      _merchantDeals[idx].edit_request_data   = editData;
    }

    setTimeout(() => {
      _editingDealId = null;
      switchDashSection('deals');
    }, 2000);

  } catch (err) {
    _fmsg(errEl, '❌ ' + (err.message || 'حدث خطأ، حاول مجدداً'), true);
    if (btn) { btn.disabled = false; btn.textContent = '📤 إرسال طلب التعديل'; }
  }
}

// ===== DELETE REQUEST =====
async function requestDelete(dealId) {
  const d = _merchantDeals.find(x => x.id === dealId);
  if (!d) return;

  const title = d.title || d.name || 'هذا العرض';

  // Inline confirmation instead of browser confirm()
  const rowEl = document.getElementById(`deal-row-${dealId}`);
  const detailEl = document.getElementById('edit-request-slot');
  const target = detailEl || rowEl;

  const confirmHtml = `
    <div class="mdm-confirm-box" id="delete-confirm-${dealId}">
      <p class="mdm-confirm-msg">
        ⚠️ هل أنت متأكد من طلب حذف "<strong>${_mdmEsc(title)}</strong>"؟<br>
        <span style="font-size:12px;color:var(--gray-400);">
          العرض لن يُحذف فوراً — سيتم مراجعة الطلب أولاً.
        </span>
      </p>
      <div class="mdm-confirm-actions">
        <button class="dash-btn dash-btn-ghost"
                onclick="cancelDeleteRequest('${dealId}')">إلغاء</button>
        <button class="dash-btn mdm-del-btn" id="delete-confirm-btn-${dealId}"
                onclick="confirmDeleteRequest('${dealId}')">
          🗑️ تأكيد طلب الحذف
        </button>
      </div>
    </div>`;

  if (detailEl) {
    detailEl.innerHTML = confirmHtml;
    detailEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else if (rowEl) {
    // Insert confirmation after the row
    rowEl.insertAdjacentHTML('afterend', confirmHtml);
    document.getElementById(`delete-confirm-${dealId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function cancelDeleteRequest(dealId) {
  document.getElementById(`delete-confirm-${dealId}`)?.remove();
}

async function confirmDeleteRequest(dealId) {
  const btn = document.getElementById(`delete-confirm-btn-${dealId}`);
  if (btn) { btn.disabled = true; btn.textContent = '⏳ جاري الإرسال...'; }

  try {
    const { error } = await sb
      .from('deals')
      .update({ delete_request_status: 'pending' })
      .eq('id', dealId)
      .eq('merchant_id', AuthState.user.id);

    if (error) throw error;

    toast('✅ تم إرسال طلب الحذف — سيتم مراجعته من فريق شيكس');

    // Update cache
    const idx = _merchantDeals.findIndex(x => x.id === dealId);
    if (idx > -1) _merchantDeals[idx].delete_request_status = 'pending';

    document.getElementById(`delete-confirm-${dealId}`)?.remove();

    // Refresh view
    if (_viewingDealId === dealId) switchDashSection('deals');
    else _renderDealsList(_merchantDeals);

  } catch (err) {
    toast('❌ ' + (err.message || 'حدث خطأ، حاول مجدداً'));
    if (btn) { btn.disabled = false; btn.textContent = '🗑️ تأكيد طلب الحذف'; }
  }
}

// ===== UPDATE SIDEBAR BADGE =====
function _updateDealsBadge(count) {
  const el = document.getElementById('dash-deals-count');
  if (!el) return;
  el.textContent     = count;
  el.style.display   = count > 0 ? '' : 'none';
}

// ===== BADGE HELPERS =====
function _approvalBadge(status) {
  const map = {
    pending_approval: '<span class="mdm-badge badge-pending">⏳ في الانتظار</span>',
    approved:         '<span class="mdm-badge badge-approved">✅ مُعتمد</span>',
    rejected:         '<span class="mdm-badge badge-rejected">❌ مرفوض</span>',
  };
  return map[status] || '<span class="mdm-badge badge-pending">—</span>';
}

function _statusBadge(status) {
  const map = {
    active:  '<span class="mdm-badge badge-active">🟢 نشط</span>',
    hot:     '<span class="mdm-badge badge-hot">🔥 ساخن</span>',
    expired: '<span class="mdm-badge badge-expired">📦 منتهي</span>',
  };
  return map[status] || '';
}

// ===== UTILS =====
function _fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function _fmsg(el, msg, show) {
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('show', show);
}

function _mdmEsc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
