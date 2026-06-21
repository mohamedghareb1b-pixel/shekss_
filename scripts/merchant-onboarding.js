/**
 * ============================================================
 * SHEKSS — MERCHANT ONBOARDING
 * scripts/merchant-onboarding.js
 * ============================================================
 * Phase 5.2.1 fixes:
 *   - approved merchant redirected to dashboard immediately
 *   - rejected screen has edit + resubmit buttons
 *   - resubmit clears rejection_reason + sets pending
 *   - guardPage no longer called here (handled in auth.js)
 * ============================================================
 */

// ===== ENTRY POINT =====
function initMerchantOnboarding() {
  // Must be logged in as merchant
  if (!AuthState.user) { showPage('login'); return; }
  if (AuthState.profile?.role !== 'merchant') { showPage('home'); return; }

  const status = AuthState.profile?.approval_status;

  // Already approved → go straight to dashboard (edge case: direct URL access)
  if (status === 'approved') {
    showPage('merchant-dashboard');
    return;
  }

  // Rejected → full rejection screen with resubmit option
  if (status === 'rejected') {
    _showRejectedScreen();
    return;
  }

  // Pending + has business data → waiting screen
  if (status === 'pending' && _hasBusinessData()) {
    _showPendingScreen();
    return;
  }

  // Fresh or pending without data → onboarding form
  _showOnboardingForm();
}

// ===== HAS BUSINESS DATA =====
function _hasBusinessData() {
  const p = AuthState.profile;
  return !!(p?.company_name && p?.phone && p?.governorate);
}

// ===== ONBOARDING FORM =====
function _showOnboardingForm(prefill = false) {
  const inner = document.getElementById('merchant-onboarding-inner');
  if (!inner) return;

  const p    = AuthState.profile || {};
  const cats = [...ONLINE_CATS, ...OFFLINE_CATS].filter(c => c.id !== 'all');
  const seenIds = new Set();
  const uniqueCats = cats.filter(c => {
    if (seenIds.has(c.id)) return false;
    seenIds.add(c.id); return true;
  });

  inner.innerHTML = `
    <div class="onb-wrap">
      <div class="onb-header">
        <div class="onb-logo">🏪</div>
        <h1 class="onb-title">${prefill ? 'تعديل بيانات نشاطك' : 'أكمل بيانات نشاطك'}</h1>
        <p class="onb-sub">
          ${prefill
            ? 'عدّل بياناتك وأعد إرسال الطلب للمراجعة'
            : 'أدخل بيانات نشاطك التجاري حتى يتم مراجعة طلبك من فريق شيكس'}
        </p>
        <div class="onb-steps">
          <div class="onb-step done">✅ إنشاء الحساب</div>
          <div class="onb-step-arrow">←</div>
          <div class="onb-step active">📋 بيانات النشاط</div>
          <div class="onb-step-arrow">←</div>
          <div class="onb-step">⏳ المراجعة</div>
        </div>
      </div>

      <div class="onb-card">
        <div class="form-msg error"  id="onb-err"></div>
        <div class="form-msg success" id="onb-ok"></div>

        <div class="onb-section-label">المعلومات الأساسية <span class="req">*</span></div>

        <div class="form-group">
          <label class="form-label">اسم النشاط التجاري <span class="req">*</span></label>
          <input class="form-input" type="text" id="onb-company"
                 value="${_onbEsc(p.company_name || '')}"
                 placeholder="مثال: مطعم الأصيل، محل الأناقة..." maxlength="80">
        </div>

        <div class="form-group">
          <label class="form-label">رقم الواتساب <span class="req">*</span></label>
          <input class="form-input" type="tel" id="onb-phone"
                 value="${_onbEsc(p.phone || '')}"
                 placeholder="01xxxxxxxxx" dir="ltr" maxlength="15">
          <span class="form-hint">سيستخدمه فريق شيكس للتواصل معك</span>
        </div>

        <div class="form-group">
          <label class="form-label">التصنيف الرئيسي <span class="req">*</span></label>
          <select class="form-input" id="onb-cat" onchange="onbFillSubcats()">
            <option value="">اختر تصنيف نشاطك</option>
            ${uniqueCats.map(c =>
              `<option value="${c.id}" ${p.business_category === c.id ? 'selected' : ''}>
                ${c.ico} ${c.label}
               </option>`
            ).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">التصنيف الفرعي</label>
          <select class="form-input" id="onb-subcat">
            <option value="">اختر التصنيف الرئيسي أولاً</option>
          </select>
        </div>

        <div class="onb-section-label" style="margin-top:20px;">
          الموقع الجغرافي <span class="req">*</span>
        </div>

        <div class="form-group">
          <label class="form-label">المحافظة <span class="req">*</span></label>
          <select class="form-input" id="onb-gov" onchange="onbFillCities()">
            <option value="">اختر المحافظة</option>
            ${Object.keys(EGYPT_GOVS).map(g =>
              `<option value="${g}" ${p.governorate === g ? 'selected' : ''}>${g}</option>`
            ).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">المركز / المدينة <span class="req">*</span></label>
          <select class="form-input" id="onb-city">
            <option value="">اختر المحافظة أولاً</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">رابط Google Maps <span class="req">*</span></label>
          <input class="form-input" type="url" id="onb-link"
                 value="${_onbEsc(p.location_link || '')}"
                 placeholder="https://maps.google.com/..." dir="ltr">
          <span class="form-hint">
            افتح Google Maps → ابحث عن نشاطك → اضغط مشاركة → انسخ الرابط
          </span>
        </div>

        <div class="onb-section-label" style="margin-top:20px;">معلومات إضافية</div>

        <div class="form-group">
          <label class="form-label">وصف النشاط</label>
          <textarea class="form-input form-textarea" id="onb-desc"
                    rows="3" maxlength="300"
                    placeholder="وصف مختصر لنشاطك...">${_onbEsc(p.description || '')}</textarea>
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn-submit" id="onb-submit-btn"
                  onclick="submitOnboarding()" style="flex:1;">
            ${prefill ? '📤 إعادة إرسال الطلب' : 'إرسال طلب الانضمام 🚀'}
          </button>
          ${prefill ? `
          <button class="dash-btn dash-btn-ghost"
                  onclick="initMerchantOnboarding()">إلغاء</button>` : ''}
        </div>
      </div>
    </div>`;

  // Prefill subcats and cities if editing
  if (p.business_category) {
    onbFillSubcats();
    const subSel = document.getElementById('onb-subcat');
    if (subSel && p.business_subcategory) subSel.value = p.business_subcategory;
  }
  if (p.governorate) {
    onbFillCities();
    const citySel = document.getElementById('onb-city');
    if (citySel && p.city) citySel.value = p.city;
  }
}

// ===== SUBCATEGORY / CITY FILLS =====
function onbFillSubcats() {
  const catId  = document.getElementById('onb-cat')?.value;
  const subSel = document.getElementById('onb-subcat');
  if (!subSel) return;

  const allCats = [...ONLINE_CATS, ...OFFLINE_CATS];
  const cat = allCats.find(c => c.id === catId);

  subSel.innerHTML = '<option value="">— بدون تصنيف فرعي —</option>';
  if (cat?.subs?.length) {
    cat.subs.forEach(s => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = s;
      subSel.appendChild(opt);
    });
  }
}

function onbFillCities() {
  const gov     = document.getElementById('onb-gov')?.value;
  const citySel = document.getElementById('onb-city');
  if (!citySel) return;

  citySel.innerHTML = '<option value="">اختر المركز</option>';
  if (gov && EGYPT_GOVS[gov]) {
    EGYPT_GOVS[gov].forEach(city => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = city;
      citySel.appendChild(opt);
    });
  }
}

// ===== SUBMIT =====
async function submitOnboarding() {
  const company = document.getElementById('onb-company')?.value.trim();
  const phone   = document.getElementById('onb-phone')?.value.trim();
  const cat     = document.getElementById('onb-cat')?.value;
  const subcat  = document.getElementById('onb-subcat')?.value || null;
  const gov     = document.getElementById('onb-gov')?.value;
  const city    = document.getElementById('onb-city')?.value;
  const link    = document.getElementById('onb-link')?.value.trim();
  const desc    = document.getElementById('onb-desc')?.value.trim() || null;

  const errEl = document.getElementById('onb-err');
  const okEl  = document.getElementById('onb-ok');
  const btn   = document.getElementById('onb-submit-btn');

  _onbMsg(errEl, '', false);
  _onbMsg(okEl,  '', false);

  if (!company) { _onbMsg(errEl, '⚠️ اسم النشاط مطلوب', true); return; }
  if (!phone || phone.replace(/\D/g,'').length < 10) {
    _onbMsg(errEl, '⚠️ رقم الواتساب غير صحيح — يجب أن يكون ١٠ أرقام على الأقل', true); return;
  }
  if (!cat)  { _onbMsg(errEl, '⚠️ اختر التصنيف الرئيسي', true); return; }
  if (!gov)  { _onbMsg(errEl, '⚠️ اختر المحافظة', true); return; }
  if (!city) { _onbMsg(errEl, '⚠️ اختر المركز / المدينة', true); return; }
  if (!link) { _onbMsg(errEl, '⚠️ رابط Google Maps مطلوب', true); return; }

  if (btn) { btn.disabled = true; btn.textContent = '⏳ جاري الإرسال...'; }

  const { error } = await sb.from('profiles')
    .update({
      company_name:         company,
      phone,
      governorate:          gov,
      city,
      location_link:        link,
      description:          desc,
      business_category:    cat,
      business_subcategory: subcat,
      approval_status:      'pending',
      rejection_reason:     null,   // clear previous rejection
    })
    .eq('id', AuthState.user.id);

  if (error) {
    _onbMsg(errEl, '❌ ' + error.message, true);
    if (btn) { btn.disabled = false; btn.textContent = 'إرسال طلب الانضمام 🚀'; }
    return;
  }

  // Update AuthState immediately
  if (AuthState.profile) {
    Object.assign(AuthState.profile, {
      company_name:         company,
      phone,
      governorate:          gov,
      city,
      location_link:        link,
      description:          desc,
      business_category:    cat,
      business_subcategory: subcat,
      approval_status:      'pending',
      rejection_reason:     null,
    });
  }

  _showPendingScreen();
}

// ===== PENDING SCREEN =====
function _showPendingScreen() {
  const inner = document.getElementById('merchant-onboarding-inner');
  if (!inner) return;

  const name    = AuthState.profile?.full_name    || '';
  const company = AuthState.profile?.company_name || '';

  inner.innerHTML = `
    <div class="onb-wrap">
      <div class="onb-status-card onb-pending">
        <div class="onb-status-ico">⏳</div>
        <h2 class="onb-status-title">طلبك قيد المراجعة</h2>
        <p class="onb-status-sub">
          شكراً ${name ? _onbEsc(name) : 'لك'} —
          ${company
            ? `تم استلام طلب انضمام <strong>${_onbEsc(company)}</strong>`
            : 'تم استلام طلبك'}
          وسيتم مراجعته من فريق شيكس خلال <strong>24-48 ساعة</strong>.
        </p>

        <div class="onb-steps" style="margin:20px 0;">
          <div class="onb-step done">✅ إنشاء الحساب</div>
          <div class="onb-step-arrow">←</div>
          <div class="onb-step done">✅ بيانات النشاط</div>
          <div class="onb-step-arrow">←</div>
          <div class="onb-step active">⏳ المراجعة</div>
        </div>

        <div class="onb-info-box">
          <p>📱 سيتواصل معك فريق شيكس على رقم الواتساب المسجل</p>
          <p>📧 أو على بريدك الإلكتروني بعد المراجعة</p>
        </div>

        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px;">
          <button class="dash-btn dash-btn-ghost" onclick="showPage('home')">
            ← تصفح الموقع
          </button>
          <button class="dash-btn" style="background:var(--gray-100);color:var(--gray-600);"
                  onclick="handleSignOut()">
            تسجيل الخروج
          </button>
        </div>
      </div>
    </div>`;
}

// ===== REJECTED SCREEN (Phase 5.2.1 — full with resubmit) =====
function _showRejectedScreen() {
  const inner = document.getElementById('merchant-onboarding-inner');
  if (!inner) return;

  const reason  = AuthState.profile?.rejection_reason || '';
  const company = AuthState.profile?.company_name || '';

  inner.innerHTML = `
    <div class="onb-wrap">
      <div class="onb-status-card onb-rejected">
        <div class="onb-status-ico">❌</div>
        <h2 class="onb-status-title">تم رفض طلب الانضمام</h2>
        <p class="onb-status-sub">
          ${company ? `طلب انضمام <strong>${_onbEsc(company)}</strong>` : 'طلبك'}
          لم يتم قبوله في الوقت الحالي.
        </p>

        ${reason ? `
          <div class="onb-info-box" style="border-color:#fca5a5;background:var(--red-light);text-align:right;">
            <p style="color:var(--red);"><strong>سبب الرفض:</strong></p>
            <p style="color:#991b1b;">${_onbEsc(reason)}</p>
          </div>` : ''}

        <div class="onb-info-box" style="text-align:right;">
          <p>🔄 يمكنك تعديل بياناتك وإعادة إرسال الطلب</p>
          <p>📩 أو التواصل معنا لمزيد من التوضيح</p>
        </div>

        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:24px;">
          <button class="dash-btn dash-btn-primary"
                  onclick="_showOnboardingForm(true)">
            ✏️ تعديل البيانات وإعادة الإرسال
          </button>
          <button class="dash-btn" style="background:var(--blue-light);color:var(--blue);"
                  onclick="showPage('contact')">
            📩 تواصل معنا
          </button>
          <button class="dash-btn dash-btn-ghost" onclick="showPage('home')">
            ← رجوع للموقع
          </button>
        </div>
      </div>
    </div>`;
}

// ===== HELPERS =====
function _onbMsg(el, msg, show) {
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('show', show);
}

function _onbEsc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
