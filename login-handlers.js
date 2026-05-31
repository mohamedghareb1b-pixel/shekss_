/**
 * ============================================================
 * SHEKSS — LOGIN PAGE HANDLERS
 * scripts/login-handlers.js
 * ============================================================
 * Bridges the login/signup HTML forms with services/auth.js.
 * Handles: form validation, loading states, error display,
 * role selection, and post-auth navigation.
 *
 * Depends on: auth.js (signIn, signUp), utils.js (toast),
 *             nav-location.js (showPage)
 * ============================================================
 */

// ===== ROLE SELECTION STATE =====
let _selectedRole = 'customer';

function selectRole(role) {
  _selectedRole = role;
  document.getElementById('role-customer').classList.toggle('active', role === 'customer');
  document.getElementById('role-merchant').classList.toggle('active', role === 'merchant');
}

// ===== SIGN IN HANDLER =====
async function handleSignIn() {
  const email    = document.getElementById('signin-email')?.value.trim();
  const password = document.getElementById('signin-password')?.value;
  const btn      = document.getElementById('signin-btn');
  const errEl    = document.getElementById('signin-error');
  const okEl     = document.getElementById('signin-success');

  // Reset messages
  _setMsg(errEl, '', false);
  _setMsg(okEl,  '', false);

  // Validate
  if (!email || !password) {
    _setMsg(errEl, '⚠️ من فضلك أدخل البريد الإلكتروني وكلمة المرور', true);
    return;
  }
  if (!_validEmail(email)) {
    _setMsg(errEl, '⚠️ البريد الإلكتروني غير صحيح', true);
    return;
  }

  _setBtnLoading(btn, true, 'جاري الدخول...');

  try {
    await signIn(email, password);
    _setMsg(okEl, '✅ تم تسجيل الدخول بنجاح! جاري التحويل...', true);
    setTimeout(() => {
      showPage('home');
      _resetSignInForm();
    }, 900);
  } catch (err) {
    _setMsg(errEl, _arabicAuthError(err.message), true);
  } finally {
    _setBtnLoading(btn, false, 'دخول 🚀');
  }
}

// ===== SIGN UP HANDLER =====
async function handleSignUp() {
  const name     = document.getElementById('signup-name')?.value.trim();
  const email    = document.getElementById('signup-email')?.value.trim();
  const password = document.getElementById('signup-password')?.value;
  const btn      = document.getElementById('signup-btn');
  const errEl    = document.getElementById('signup-error');
  const okEl     = document.getElementById('signup-success');

  // Reset messages
  _setMsg(errEl, '', false);
  _setMsg(okEl,  '', false);

  // Validate
  if (!name) {
    _setMsg(errEl, '⚠️ من فضلك أدخل اسمك الكامل', true);
    return;
  }
  if (!email || !_validEmail(email)) {
    _setMsg(errEl, '⚠️ البريد الإلكتروني غير صحيح', true);
    return;
  }
  if (!password || password.length < 8) {
    _setMsg(errEl, '⚠️ كلمة المرور يجب أن تكون ٨ أحرف على الأقل', true);
    return;
  }

  _setBtnLoading(btn, true, 'جاري إنشاء الحساب...');

  try {
    const result = await signUp(email, password, name, _selectedRole);

    // Supabase may require email confirmation
    if (result.session) {
      // Logged in immediately (email confirmation disabled)
      _setMsg(okEl, '🎉 تم إنشاء حسابك بنجاح! أهلاً بك في شيكس!', true);
      setTimeout(() => {
        showPage('home');
        _resetSignUpForm();
      }, 1200);
    } else {
      // Email confirmation required
      _setMsg(okEl,
        '📧 تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتفعيل الحساب.',
        true
      );
    }
  } catch (err) {
    _setMsg(errEl, _arabicAuthError(err.message), true);
  } finally {
    _setBtnLoading(btn, false, 'إنشاء الحساب 🎉');
  }
}

// ===== HELPERS =====
function _setMsg(el, msg, show) {
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('show', show);
}

function _setBtnLoading(btn, loading, label) {
  if (!btn) return;
  btn.disabled     = loading;
  btn.textContent  = label;
  btn.classList.toggle('loading', loading);
}

function _validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function _resetSignInForm() {
  const e = document.getElementById('signin-email');
  const p = document.getElementById('signin-password');
  if (e) e.value = '';
  if (p) p.value = '';
  _setMsg(document.getElementById('signin-error'),   '', false);
  _setMsg(document.getElementById('signin-success'), '', false);
}

function _resetSignUpForm() {
  ['signup-name', 'signup-email', 'signup-password'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  _setMsg(document.getElementById('signup-error'),   '', false);
  _setMsg(document.getElementById('signup-success'), '', false);
  selectRole('customer');
}

// ===== ARABIC ERROR MESSAGES =====
function _arabicAuthError(msg) {
  if (!msg) return '❌ حدث خطأ غير متوقع، حاول مرة أخرى';
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials') || m.includes('invalid credentials'))
    return '❌ البريد الإلكتروني أو كلمة المرور غير صحيحة';
  if (m.includes('email not confirmed'))
    return '📧 من فضلك فعّل بريدك الإلكتروني أولاً';
  if (m.includes('user already registered') || m.includes('already registered'))
    return '⚠️ هذا البريد الإلكتروني مسجل بالفعل، سجّل دخولك';
  if (m.includes('password should be at least'))
    return '⚠️ كلمة المرور يجب أن تكون ٨ أحرف على الأقل';
  if (m.includes('rate limit') || m.includes('too many'))
    return '⏳ محاولات كثيرة، انتظر قليلاً وحاول مجدداً';
  if (m.includes('network') || m.includes('fetch'))
    return '🌐 تحقق من اتصالك بالإنترنت وحاول مجدداً';
  return '❌ ' + msg;
}
