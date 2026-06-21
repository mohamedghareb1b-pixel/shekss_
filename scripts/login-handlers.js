/**
 * ============================================================
 * SHEKSS — LOGIN PAGE HANDLERS
 * scripts/login-handlers.js
 * ============================================================
 * Phase 5.1: Improved error handling + loading states
 * ============================================================
 */

let _selectedRole = 'customer';

// ===== ROLE SELECTION =====
function selectRole(role) {
  _selectedRole = role;
  document.getElementById('role-customer')?.classList.toggle('active', role === 'customer');
  document.getElementById('role-merchant')?.classList.toggle('active', role === 'merchant');
}

// ===== SIGN IN =====
async function handleSignIn() {
  const emailEl = document.getElementById('signin-email');
  const passEl  = document.getElementById('signin-password');
  const btn     = document.getElementById('signin-btn');
  const errEl   = document.getElementById('signin-error');
  const okEl    = document.getElementById('signin-success');

  const email    = emailEl?.value.trim()  || '';
  const password = passEl?.value          || '';

  _setMsg(errEl, '', false);
  _setMsg(okEl,  '', false);

  // Validate
  if (!email) {
    _setMsg(errEl, '⚠️ أدخل البريد الإلكتروني', true);
    emailEl?.focus();
    return;
  }
  if (!_validEmail(email)) {
    _setMsg(errEl, '⚠️ البريد الإلكتروني غير صحيح', true);
    emailEl?.focus();
    return;
  }
  if (!password) {
    _setMsg(errEl, '⚠️ أدخل كلمة المرور', true);
    passEl?.focus();
    return;
  }

  _setBtnLoading(btn, true, '⏳ جاري الدخول...');

  try {
    await signIn(email, password);

    _setMsg(okEl, '✅ تم تسجيل الدخول! جاري التحويل...', true);

    setTimeout(() => {
      const role   = AuthState.profile?.role;
      const status = AuthState.profile?.approval_status;

      if (role === 'admin') {
        showPage('admin-dashboard');
      } else if (role === 'merchant') {
        // Approved merchant → dashboard, otherwise → onboarding/pending
        if (status === 'approved') showPage('merchant-dashboard');
        else showPage('merchant-onboarding');
      } else {
        showPage('home');
      }
      _resetSignInForm();
    }, 800);

  } catch (err) {
    _setMsg(errEl, _arabicAuthError(err.message), true);
    _setBtnLoading(btn, false, 'دخول 🚀');
  }
}

// ===== SIGN UP =====
async function handleSignUp() {
  const nameEl  = document.getElementById('signup-name');
  const emailEl = document.getElementById('signup-email');
  const passEl  = document.getElementById('signup-password');
  const btn     = document.getElementById('signup-btn');
  const errEl   = document.getElementById('signup-error');
  const okEl    = document.getElementById('signup-success');

  const name     = nameEl?.value.trim()  || '';
  const email    = emailEl?.value.trim() || '';
  const password = passEl?.value         || '';

  _setMsg(errEl, '', false);
  _setMsg(okEl,  '', false);

  if (!name) {
    _setMsg(errEl, '⚠️ أدخل اسمك الكامل', true);
    nameEl?.focus(); return;
  }
  if (!email || !_validEmail(email)) {
    _setMsg(errEl, '⚠️ البريد الإلكتروني غير صحيح', true);
    emailEl?.focus(); return;
  }
  if (!password || password.length < 6) {
    _setMsg(errEl, '⚠️ كلمة المرور يجب أن تكون ٦ أحرف على الأقل', true);
    passEl?.focus(); return;
  }

  _setBtnLoading(btn, true, '⏳ جاري إنشاء الحساب...');

  try {
    const result = await signUp(email, password, name, _selectedRole);

    if (result.session) {
      _setMsg(okEl, '🎉 تم إنشاء حسابك! جاري التحويل...', true);
      setTimeout(() => {
        const role = _selectedRole;
        if (role === 'merchant') showPage('merchant-onboarding');
        else showPage('home');
        _resetSignUpForm();
      }, 1000);
    } else {
      // Email confirmation ON
      _setMsg(okEl,
        '📧 تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتفعيل الحساب ثم سجّل دخولك.',
        true
      );
      _setBtnLoading(btn, false, 'إنشاء الحساب 🎉');
    }

  } catch (err) {
    _setMsg(errEl, _arabicAuthError(err.message), true);
    _setBtnLoading(btn, false, 'إنشاء الحساب 🎉');
  }
}

// ===== ARABIC ERROR MESSAGES =====
function _arabicAuthError(msg) {
  if (!msg) return '❌ حدث خطأ غير متوقع، حاول مرة أخرى';
  const m = msg.toLowerCase();

  if (m.includes('invalid login credentials') || m.includes('invalid credentials'))
    return '❌ البريد الإلكتروني أو كلمة المرور غير صحيحة';

  if (m.includes('email not confirmed'))
    return '📧 من فضلك فعّل بريدك الإلكتروني أولاً، ثم سجّل دخولك';

  if (m.includes('user already registered') || m.includes('already registered'))
    return '⚠️ هذا البريد مسجل بالفعل — سجّل دخولك أو استخدم بريداً آخر';

  if (m.includes('password should be at least') || m.includes('weak password'))
    return '⚠️ كلمة المرور ضعيفة — استخدم ٨ أحرف أو أكثر';

  if (m.includes('rate limit') || m.includes('too many') || m.includes('over_email_send_rate_limit'))
    return '⏳ محاولات كثيرة — انتظر بضع دقائق وحاول مجدداً';

  if (m.includes('network') || m.includes('fetch'))
    return '🌐 تحقق من اتصالك بالإنترنت وحاول مجدداً';

  if (m.includes('signup is disabled'))
    return '⚠️ التسجيل متوقف مؤقتاً — تواصل مع الدعم';

  if (m.includes('email address') && m.includes('invalid'))
    return '⚠️ صيغة البريد الإلكتروني غير صحيحة';

  return '❌ ' + msg;
}

// ===== HELPERS =====
function _setMsg(el, msg, show) {
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('show', show);
}

function _setBtnLoading(btn, loading, label) {
  if (!btn) return;
  btn.disabled    = loading;
  btn.textContent = label;
}

function _validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function _resetSignInForm() {
  ['signin-email', 'signin-password'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  _setMsg(document.getElementById('signin-error'),   '', false);
  _setMsg(document.getElementById('signin-success'), '', false);
  const btn = document.getElementById('signin-btn');
  _setBtnLoading(btn, false, 'دخول 🚀');
}

function _resetSignUpForm() {
  ['signup-name','signup-email','signup-password'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  _setMsg(document.getElementById('signup-error'),   '', false);
  _setMsg(document.getElementById('signup-success'), '', false);
  selectRole('customer');
  const btn = document.getElementById('signup-btn');
  _setBtnLoading(btn, false, 'إنشاء الحساب 🎉');
}
