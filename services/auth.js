/**
 * ============================================================
 * SHEKSS — AUTH SERVICE
 * services/auth.js
 * ============================================================
 * Phase 5.1 fixes:
 *   - _loadProfile fetches ALL columns including new ones
 *   - initAuth waits for profile before routing
 *   - guardPage checks suspended status
 *   - renderProfilePage reads full profile
 *   - onAuthChange documented to prevent double-subscription
 * ============================================================
 */

// ===== AUTH STATE =====
const AuthState = {
  user:      null,
  profile:   null,
  session:   null,
  isLoading: true,
};

// ===== INIT AUTH =====
async function initAuth() {
  const { data: { session } } = await sb.auth.getSession();

  if (session) {
    AuthState.session = session;
    AuthState.user    = session.user;
    await _loadProfile(session.user.id);
  }

  AuthState.isLoading = false;
  updateNavForAuth(AuthState.user, AuthState.profile);

  // Subscribe to future auth changes
  sb.auth.onAuthStateChange(async (event, session) => {
    AuthState.session = session;
    AuthState.user    = session ? session.user : null;

    if (session) {
      await _loadProfile(session.user.id);
    } else {
      AuthState.profile = null;
    }

    updateNavForAuth(AuthState.user, AuthState.profile);

    if (event === 'SIGNED_OUT' && _isProtectedPage(currentPage)) {
      showPage('home');
    }

    // On successful sign-in, refresh protected page if already on it
    if (event === 'SIGNED_IN' && _isProtectedPage(currentPage)) {
      _loadPageData(currentPage);
    }
  });
}

// ===== LOAD PROFILE =====
// Fetches ALL columns so company_name, phone, governorate etc. are available
async function _loadProfile(userId) {
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Row not found — create default profile
      const meta   = AuthState.user?.user_metadata || {};
      const role   = meta.role || 'customer';
      // customer/admin → approved immediately, merchant → pending
      const approvalStatus = role === 'merchant' ? 'pending' : 'approved';

      const { data: newProfile, error: insertErr } = await sb
        .from('profiles')
        .insert({
          id:              userId,
          full_name:       meta.full_name || meta.name || '',
          role,
          status:          'active',
          approval_status: approvalStatus,
        })
        .select('*')
        .single();

      if (!insertErr) AuthState.profile = newProfile;
    }
    return;
  }

  AuthState.profile = data;
}

// ===== GOOGLE OAUTH =====
async function signInWithGoogle() {
  try {
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname,
      },
    });
    if (error) throw error;
    // Browser will redirect to Google — no further action needed
  } catch (err) {
    toast('❌ ' + (err.message || 'حدث خطأ أثناء تسجيل الدخول بـ Google'));
  }
}

// ===== SIGN IN =====
async function signIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// ===== SIGN UP =====
async function signUp(email, password, fullName, role = 'customer') {
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role },
    },
  });
  if (error) throw error;
  return data;
}

// ===== SIGN OUT =====
async function signOut() {
  const { error } = await sb.auth.signOut();
  if (error) throw error;
}

// ===== GET USER / PROFILE =====
function getUser()    { return AuthState.user; }
function getProfile() { return AuthState.profile; }

// ===== ON AUTH CHANGE (External API) =====
// NOTE: initAuth() already subscribes internally.
// Use ONLY from external modules — never call inside auth.js.
function onAuthChange(callback) {
  return sb.auth.onAuthStateChange(async (_event, session) => {
    callback(session ? session.user : null, AuthState.profile);
  });
}

// ===== GUARD PAGE =====
// admin  → always allowed (manages manually)
// customer → always allowed (auto-approved)
// merchant → must be approved; pending → onboarding; rejected → onboarding
function guardPage(requiredRole = null) {
  if (!AuthState.user) {
    showPage('login');
    return false;
  }

  const role   = AuthState.profile?.role || 'customer';
  const status = AuthState.profile?.status;

  // Suspended check (all roles)
  if (status === 'suspended') {
    toast('⚠️ حسابك موقوف — تواصل مع الدعم');
    showPage('home');
    return false;
  }

  // Role check
  if (requiredRole && role !== requiredRole) {
    toast('⚠️ ليس لديك صلاحية الوصول لهذه الصفحة');
    showPage('home');
    return false;
  }

  // Merchant approval check — only for merchants, never for admin/customer
  if (role === 'merchant' && requiredRole === 'merchant') {
    const approval = AuthState.profile?.approval_status;
    if (approval !== 'approved') {
      // Redirect to onboarding (which shows pending/rejected/form screens)
      showPage('merchant-onboarding');
      return false;
    }
  }

  return true;
}

// ===== UPDATE NAVBAR =====
function updateNavForAuth(user, profile) {
  const navRight = document.getElementById('nav-auth-slot');
  const mobAuth  = document.getElementById('mob-auth-slot');
  if (!navRight) return;

  if (!user) {
    navRight.innerHTML = `
      <button class="btn-nav" onclick="showPage('login')">🔑 تسجيل الدخول</button>`;
    if (mobAuth) mobAuth.innerHTML = `
      <div id="mob-auth-slot">
        <a onclick="showPage('login');toggleMob()"
           style="background:var(--blue);color:white;margin-top:8px;border-radius:12px;">
          🔑 تسجيل الدخول
        </a>
      </div>`;
    return;
  }

  const name      = profile?.full_name || user.email.split('@')[0];
  const initials  = name.charAt(0).toUpperCase();
  const role      = profile?.role || 'customer';
  const roleLabel = role === 'merchant' ? ' 🏪' : role === 'admin' ? ' ⚙️' : '';

  const merchantLink = role === 'merchant'
    ? `<button class="auth-dropdown-item"
               onclick="closeAuthMenu();showPage('merchant-dashboard')">
         🏪 لوحة التاجر
       </button>` : '';

  const adminLink = role === 'admin'
    ? `<button class="auth-dropdown-item"
               onclick="closeAuthMenu();showPage('admin-dashboard')">
         ⚙️ لوحة الإدارة
       </button>` : '';

  const dashDivider = (role === 'merchant' || role === 'admin')
    ? '<hr class="auth-dropdown-divider">' : '';

  navRight.innerHTML = `
    <div class="auth-menu" id="auth-menu">
      <button class="btn-nav auth-trigger" onclick="toggleAuthMenu()">
        <span class="auth-avatar">${initials}</span>
        ${_safeEsc(name)}${roleLabel} ▾
      </button>
      <div class="auth-dropdown" id="auth-dropdown">
        <div class="auth-dropdown-name">${_safeEsc(name)}</div>
        <div class="auth-dropdown-role">${_roleAr(role)}</div>
        <hr class="auth-dropdown-divider">
        ${merchantLink}${adminLink}${dashDivider}
        <button class="auth-dropdown-item"
                onclick="closeAuthMenu();showPage('profile')">
          👤 ملفي الشخصي
        </button>
        <button class="auth-dropdown-item auth-signout" onclick="handleSignOut()">
          🚪 تسجيل الخروج
        </button>
      </div>
    </div>`;

  const mobMerchantLink = role === 'merchant'
    ? `<a onclick="showPage('merchant-dashboard');toggleMob()"
          style="color:var(--blue);font-weight:800;">🏪 لوحة التاجر</a>` : '';
  const mobAdminLink = role === 'admin'
    ? `<a onclick="showPage('admin-dashboard');toggleMob()"
          style="color:var(--orange-dark);font-weight:800;">⚙️ لوحة الإدارة</a>` : '';

  if (mobAuth) mobAuth.innerHTML = `
    <div style="padding:12px 16px;border-top:1px solid var(--gray-100);margin-top:8px;">
      <div style="font-size:13px;font-weight:800;color:var(--gray-800);margin-bottom:8px;">
        👤 ${_safeEsc(name)}${roleLabel}
      </div>
      ${mobMerchantLink}${mobAdminLink}
      <a onclick="showPage('profile');toggleMob()">ملفي الشخصي</a>
      <a onclick="handleSignOut();toggleMob()"
         style="color:var(--red);font-weight:800;">تسجيل الخروج 🚪</a>
    </div>`;
}

// ===== AUTH MENU TOGGLE =====
function toggleAuthMenu() {
  document.getElementById('auth-dropdown')?.classList.toggle('open');
}
function closeAuthMenu() {
  document.getElementById('auth-dropdown')?.classList.remove('open');
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('#auth-menu')) closeAuthMenu();
});

// ===== SIGN OUT HANDLER =====
async function handleSignOut() {
  try {
    _resetDashMounts(); // reset shell cache so next login re-renders fresh
    await signOut();
    toast('👋 تم تسجيل الخروج بنجاح');
    showPage('home');
  } catch (e) {
    toast('❌ حدث خطأ أثناء تسجيل الخروج');
  }
}

// ===== PROFILE PAGE RENDERER =====
function renderProfilePage() {
  if (!guardPage()) return;

  const user    = AuthState.user;
  const profile = AuthState.profile;
  const name    = profile?.full_name || user?.email?.split('@')[0] || '—';
  const email   = user?.email || '—';
  const role    = profile?.role || 'customer';
  const initial = name.charAt(0).toUpperCase();

  const avatarEl = document.getElementById('profile-avatar-large');
  const nameEl   = document.getElementById('profile-name-h');
  const roleEl   = document.getElementById('profile-role-h');
  if (avatarEl) avatarEl.textContent = initial;
  if (nameEl)   nameEl.textContent   = name;
  if (roleEl)   roleEl.textContent   = _roleAr(role);

  const joined = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('ar-EG',
        { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  const dashBtn = role === 'merchant'
    ? `<button onclick="showPage('merchant-dashboard')"
               class="dash-btn dash-btn-primary"
               style="width:100%;justify-content:center;margin-bottom:12px;">
         🏪 لوحة التاجر
       </button>`
    : role === 'admin'
    ? `<button onclick="showPage('admin-dashboard')"
               class="dash-btn dash-btn-primary"
               style="width:100%;justify-content:center;margin-bottom:12px;">
         ⚙️ لوحة الإدارة
       </button>`
    : '';

  const bodyEl = document.getElementById('profile-body');
  if (!bodyEl) return;

  bodyEl.innerHTML = `
    ${dashBtn}
    <div style="display:flex;flex-direction:column;gap:0;">
      ${_pRow('👤', 'الاسم',         name)}
      ${_pRow('📧', 'البريد',         email,   true)}
      ${_pRow('🏢', 'اسم المتجر',    profile?.company_name || '—')}
      ${_pRow('📞', 'التليفون',       profile?.phone        || '—')}
      ${_pRow('📍', 'المحافظة',       profile?.governorate  || '—')}
      ${_pRow('🏘️','المركز',          profile?.city         || '—')}
      ${_pRow('💼', 'نوع الحساب',    _roleAr(role))}
      ${_pRow('📅', 'تاريخ الانضمام', joined)}
    </div>`;
}

function _pRow(ico, label, value, ltr = false) {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;
                padding:11px 0;border-bottom:1px solid var(--gray-100);">
      <span style="font-size:13px;color:var(--gray-400);font-weight:700;">
        ${ico} ${label}
      </span>
      <span style="font-size:13px;font-weight:800;color:var(--gray-800);"
            ${ltr ? 'dir="ltr"' : ''}>
        ${_safeEsc(String(value))}
      </span>
    </div>`;
}

// ===== HELPERS =====
function _safeEsc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _roleAr(role) {
  if (role === 'merchant') return 'تاجر / شريك 🏪';
  if (role === 'admin')    return 'مدير النظام ⚙️';
  return 'عميل';
}

function _isProtectedPage(page) {
  return ['profile', 'merchant-dashboard', 'admin-dashboard'].includes(page);
}
