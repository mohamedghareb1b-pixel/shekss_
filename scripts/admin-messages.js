/**
 * ============================================================
 * SHEKSS — ADMIN: MESSAGES & COMPLAINTS
 * scripts/admin-messages.js
 * ============================================================
 */

// ===== MESSAGES =====
async function renderAdminMessages() {
  const content = document.getElementById('adm-content');
  content.innerHTML = '<div class="mdm-loading">⏳ جاري تحميل الرسائل...</div>';

  const { data, error } = await sb
    .from('messages')
    .select('id, name, contact, subject, message, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) { content.innerHTML = _adm_err(error.message); return; }

  // Separate by subject type
  const merchantMsgs  = (data || []).filter(m => m.subject === 'عرض شراكة');
  const customerMsgs  = (data || []).filter(m => m.subject !== 'عرض شراكة');

  content.innerHTML = `
    <div class="adm-msg-tabs">
      <button class="adm-msg-tab active" onclick="showMsgTab('customers',this)">
        👥 رسائل العملاء <span class="adm-msg-count">${customerMsgs.length}</span>
      </button>
      <button class="adm-msg-tab" onclick="showMsgTab('merchants',this)">
        🏪 رسائل التجار <span class="adm-msg-count">${merchantMsgs.length}</span>
      </button>
    </div>

    <div id="adm-msg-customers" class="adm-msg-panel">
      ${customerMsgs.length
        ? customerMsgs.map(m => _msgCard(m)).join('')
        : _adm_empty('💬', 'لا توجد رسائل', 'لا توجد رسائل من العملاء')}
    </div>

    <div id="adm-msg-merchants" class="adm-msg-panel" style="display:none;">
      ${merchantMsgs.length
        ? merchantMsgs.map(m => _msgCard(m)).join('')
        : _adm_empty('🏪', 'لا توجد رسائل', 'لا توجد رسائل من التجار')}
    </div>`;

  _setBadge('adm-badge-msgs', (data || []).length);
}

function showMsgTab(tab, btn) {
  document.querySelectorAll('.adm-msg-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.getElementById('adm-msg-customers').style.display = tab === 'customers' ? '' : 'none';
  document.getElementById('adm-msg-merchants').style.display = tab === 'merchants' ? '' : 'none';
}

function _msgCard(m) {
  return `
    <div class="adm-card adm-msg-card">
      <div class="adm-msg-head">
        <div>
          <span class="adm-card-title">${_aesc(m.name || '—')}</span>
          <span class="adm-msg-subject">${_aesc(m.subject || '—')}</span>
        </div>
        <span class="adm-msg-date">${_fmtD(m.created_at)}</span>
      </div>
      ${m.contact ? `<div class="adm-msg-contact">📬 ${_aesc(m.contact)}</div>` : ''}
      <p class="adm-msg-body">${_aesc(m.message || '')}</p>
    </div>`;
}

// ===== COMPLAINTS =====
async function renderAdminComplaints() {
  const content = document.getElementById('adm-content');
  content.innerHTML = '<div class="mdm-loading">⏳ جاري تحميل الشكاوى...</div>';

  const { data, error } = await sb
    .from('complaints')
    .select('id, user_type, subject, body, status, admin_note, created_at')
    .order('created_at', { ascending: false });

  if (error) { content.innerHTML = _adm_err(error.message); return; }

  if (!data || !data.length) {
    content.innerHTML = _adm_empty('⚠️', 'لا توجد شكاوى', 'لا توجد شكاوى مسجلة حالياً');
    _setBadge('adm-badge-complaints', 0);
    return;
  }

  const open     = data.filter(c => c.status === 'open').length;
  _setBadge('adm-badge-complaints', open);

  content.innerHTML = `
    <div class="adm-complaint-filters">
      <button class="mdm-tab active" onclick="filterComplaints('all',this)">الكل (${data.length})</button>
      <button class="mdm-tab" onclick="filterComplaints('open',this)">مفتوحة (${open})</button>
      <button class="mdm-tab" onclick="filterComplaints('resolved',this)">محلولة</button>
      <button class="mdm-tab" onclick="filterComplaints('closed',this)">مغلقة</button>
    </div>
    <div class="adm-list" id="adm-complaints-list">
      ${data.map(c => _complaintCard(c)).join('')}
    </div>`;
}

function _complaintCard(c) {
  const statusMap = {
    open:     { cls: 'badge-pending',  lbl: '🔴 مفتوحة' },
    resolved: { cls: 'badge-approved', lbl: '✅ محلولة' },
    closed:   { cls: 'badge-expired',  lbl: '⬛ مغلقة' },
  };
  const s = statusMap[c.status] || statusMap.open;

  return `
    <div class="adm-card adm-complaint-card" data-status="${c.status}" id="adm-comp-${c.id}">
      <div class="adm-card-body">
        <div class="adm-card-info" style="width:100%;">
          <div class="adm-card-title">
            ${_aesc(c.subject)}
            <span class="mdm-badge ${s.cls}" style="margin-right:8px;">${s.lbl}</span>
            <span class="adm-user-type">${c.user_type === 'merchant' ? '🏪 تاجر' : '👥 عميل'}</span>
          </div>
          <div class="adm-card-meta"><span>📅 ${_fmtD(c.created_at)}</span></div>
          <p class="adm-msg-body">${_aesc(c.body)}</p>
          ${c.admin_note ? `<div class="adm-admin-note">📝 ملاحظة الأدمن: ${_aesc(c.admin_note)}</div>` : ''}
        </div>
      </div>
      <div class="adm-complaint-actions" id="adm-comp-actions-${c.id}">
        <div class="adm-note-row">
          <input class="form-input" type="text" id="adm-note-${c.id}"
                 placeholder="ملاحظة (اختياري)" maxlength="200"
                 value="${_aesc(c.admin_note || '')}">
        </div>
        <div class="adm-action-btns">
          ${c.status !== 'resolved' ? `<button class="adm-btn adm-btn-approve"
            onclick="updateComplaint('${c.id}','resolved')">✅ تم الحل</button>` : ''}
          ${c.status !== 'closed' ? `<button class="adm-btn adm-btn-reject"
            onclick="updateComplaint('${c.id}','closed')">⬛ إغلاق</button>` : ''}
          ${c.status !== 'open' ? `<button class="adm-btn" style="border-color:var(--blue);color:var(--blue);"
            onclick="updateComplaint('${c.id}','open')">🔄 إعادة فتح</button>` : ''}
        </div>
      </div>
    </div>`;
}

function filterComplaints(status, btn) {
  document.querySelectorAll('.adm-complaint-filters .mdm-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.querySelectorAll('.adm-complaint-card').forEach(card => {
    card.style.display = (status === 'all' || card.dataset.status === status) ? '' : 'none';
  });
}

async function updateComplaint(complaintId, newStatus) {
  const note = document.getElementById(`adm-note-${complaintId}`)?.value.trim() || null;

  const { error } = await sb.from('complaints')
    .update({ status: newStatus, admin_note: note })
    .eq('id', complaintId);

  if (error) { toast('❌ ' + error.message); return; }

  toast(newStatus === 'resolved' ? '✅ تم تحديد الشكوى كمحلولة'
      : newStatus === 'closed'   ? '⬛ تم إغلاق الشكوى'
      :                            '🔄 تمت إعادة فتح الشكوى');

  const card = document.getElementById(`adm-comp-${complaintId}`);
  if (card) card.dataset.status = newStatus;

  renderAdminComplaints();
}
