/**
 * ============================================================
 * SHEKSS — AUTH SERVICE
 * services/auth.js
 * ============================================================
 * Depends on: supabase.js (sb must be defined first)
 * Used by:    nav-location.js (initAuth, guardPage)
 *             index.html login/signup forms
 *
 * Account types (stored in profiles table):
 *   role: 'customer' | 'merchant'
 *
 * Future phases:
 *   - Merchant Dashboard → uses guardPage('merchant')
 *   - Admin Dashboard    → uses guardPage('admin')
 *   - Google OAuth       → signInWithGoogle()
 * ============================================================
 */

// ===== AUTH STATE =====
// Single source of truth for authentication across the entire app.
// Read this object anywhere — never call sb.auth.getUser() directly outside this file.
const AuthState = {
  user:      null,   // Supabase user object | null
  profile:   null,   // { id, full_name, role, avatar_url } from profiles table | null
  session:   null,   // Supabase session object | null
  isLoading: true,   // true until first auth check completes
};

// ===== INIT AUTH =====
// Called once inside showApp() before any page renders.
// Restores session from localStorage (no extra DB call — Supabase handles this).
// Then subscribes to future auth changes.
async function initAuth() {
  // 1. Restore existing session (from localStorage — zero network cost)
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    AuthState.session = session;
    AuthState.user    = session.user;
    await _loadProfile(session.user.id);
  }
  AuthState.isLoading = false;

  // 2. Update navbar immediately
  updateNavForAuth(AuthState.user, AuthState.profile);

  // 3. Subscribe to future changes (login, logout, token refresh)
  sb.auth.onAuthStateChange(async (event, session) => {
    AuthState.session = session;
    AuthState.user    = session ? session.user : null;

    if (session) {
      await _loadProfile(session.user.id);
    } else {
      AuthState.profile = null;
    }

    updateNavForAuth(AuthState.user, AuthState.profile);

    // If user just logged out while on a protected page → redirect home
    if (event === 'SIGNED_OUT' && _isProtectedPage(currentPage)) {
      showPage('home');
    }
  });
}

// ===== LOAD PROFILE =====
// Fetches user profile from `profiles` table.
// Upserts a default profile if first login (new user).
async function _loadProfile(userId) {
  const { data, error } = await sb
    .from('profiles')
    .select('id, full_name, role, avatar_url')
    .eq('id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // Row not found — create default profile for new user
    const meta = AuthState.user?.user_metadata || {};
    const { data: newProfile } = await sb
      .from('profiles')
      .insert({
        id:        userId,
        full_name: meta.full_name || meta.name || '',
        role:      'customer',
      })
      .select('id, full_name, role, avatar_url')
      .single();
    AuthState.profile = newProfile;
  } else {
    AuthState.profile = data;
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

  // If email confirmation is disabled, session is returned immediately
  if (data.session) {
    // Profile will be created by _loadProfile via onAuthStateChange
  }
  return data;
}

// ===== SIGN OUT =====
async function signOut() {
  const { error } = await sb.auth.signOut();
  if (error) throw error;
  // onAuthStateChange fires → clears AuthState → updateNavForAuth automatically
}

// ===== GET USER =====
// Returns current user synchronously from AuthState.
// Never awaits — use initAuth() at startup to populate.
function getUser() {
  return AuthState.user;
}

// ===== GET PROFILE =====
function getProfile() {
  return AuthState.profile;
}

// ===== ON AUTH CHANGE (External API) =====
// NOTE: initAuth() already subscribes internally.
// Use this ONLY from external modules that need auth events.
// Do NOT call this inside auth.js itself — that would create a second subscription.
// Usage: onAuthChange((user, profile) => { ... })
function onAuthChange(callback) {
  return sb.auth.onAuthStateChange(async (_event, session) => {
    const user    = session ? session.user : null;
    const profile = AuthState.profile;
    callback(user, profile);
  });
}

// ===== GUARD PAGE =====
// Call at the top of any protected page load.
// Usage: if (!guardPage()) return;
//
// role (optional): 'merchant' | 'admin'
//   → if provided, also checks AuthState.profile.role
//
// Future: merchant dashboard will call guardPage('merchant')
function guardPage(requiredRole = null) {
  if (!AuthState.user) {
    showPage('login');
    return false;
  }
  // W3 FIX: block suspended accounts from protected pages
  if (AuthState.profile?.status === 'suspended') {
    toast('⚠️ حسابك موقوف — تواصل مع الدعم');
    showPage('home');
    return false;
  }
  if (requiredRole && AuthState.profile?.role !== requiredRole) {
    toast('⚠️ ليس لديك صلاحية الوصول لهذه الصفحة');
    showPage('home');
    return false;
  }
  return true;
}

// ===== UPDATE NAVBAR FOR AUTH STATE =====
// Swaps the nav-right button between:
//   logged out → [ 🔑 تسجيل الدخول ]
//   logged in  → [ 👤 الاسم ▼ ] with dropdown
function updateNavForAuth(user, profile) {
  const navRight = document.getElementById('nav-auth-slot');
  const mobAuth  = document.getElementById('mob-auth-slot');
  if (!navRight) return; // nav not rendered yet

  if (!user) {
    // ── Logged OUT ──
    navRight.innerHTML = `
      <button class="btn-nav" onclick="showPage('login')">🔑 تسجيل الدخول</button>`;
    if (mobAuth) mobAuth.innerHTML = `
      <a onclick="showPage('login');toggleMob()"
         style="background:var(--blue);color:white;margin-top:8px;border-radius:12px;">
        🔑 تسجيل الدخول
      </a>`;
  } else {
    // ── Logged IN ──
    const name    = profile?.full_name || user.email.split('@')[0];
    const initials  = name.charAt(0).toUpperCase();
    const role      = profile?.role || 'customer';
    const roleLabel = role === 'merchant' ? ' 🏪' : role === 'admin' ? ' ⚙️' : '';

    // Dashboard links — role-specific
    const merchantLink = (role === 'merchant')
      ? `<button class="auth-dropdown-item"
               onclick="closeAuthMenu();showPage('merchant-dashboard')">
           🏪 لوحة التاجر
         </button>` : '';

    const adminLink = (role === 'admin')
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
          ${name}${roleLabel} ▾
        </button>
        <div class="auth-dropdown" id="auth-dropdown">
          <div class="auth-dropdown-name">${name}</div>
          <div class="auth-dropdown-role">${_roleAr(role)}</div>
          <hr class="auth-dropdown-divider">
          ${merchantLink}${adminLink}${dashDivider}
          <button class="auth-dropdown-item" onclick="closeAuthMenu();showPage('profile')">
            👤 ملفي الشخصي
          </button>
          <button class="auth-dropdown-item auth-signout" onclick="handleSignOut()">
            🚪 تسجيل الخروج
          </button>
        </div>
      </div>`;

    // Mobile nav
    const mobMerchantLink = role === 'merchant'
      ? `<a onclick="showPage('merchant-dashboard');toggleMob()"
            style="color:var(--blue);font-weight:800;">🏪 لوحة التاجر</a>` : '';
    const mobAdminLink = role === 'admin'
      ? `<a onclick="showPage('admin-dashboard');toggleMob()"
            style="color:var(--orange-dark);font-weight:800;">⚙️ لوحة الإدارة</a>` : '';

    if (mobAuth) mobAuth.innerHTML = `
      <div style="padding:12px 16px;border-top:1px solid var(--gray-100);margin-top:8px;">
        <div style="font-size:13px;font-weight:800;color:var(--gray-800);margin-bottom:8px;">
          👤 ${name}${roleLabel}
        </div>
        ${mobMerchantLink}${mobAdminLink}
        <a onclick="showPage('profile');toggleMob()">ملفي الشخصي</a>
        <a onclick="handleSignOut();toggleMob()"
           style="color:var(--red);font-weight:800;">تسجيل الخروج 🚪</a>
      </div>`;
  }
}

// ===== AUTH MENU TOGGLE (dropdown) =====
function toggleAuthMenu() {
  const dd = document.getElementById('auth-dropdown');
  if (!dd) return;
  dd.classList.toggle('open');
}

function closeAuthMenu() {
  const dd = document.getElementById('auth-dropdown');
  if (dd) dd.classList.remove('open');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
  if (!e.target.closest('#auth-menu')) {
    closeAuthMenu();
  }
});

// ===== SIGN OUT HANDLER (UI) =====
async function handleSignOut() {
  try {
    await signOut();
    toast('👋 تم تسجيل الخروج بنجاح');
    showPage('home');
  } catch (e) {
    toast('❌ حدث خطأ أثناء تسجيل الخروج');
  }
}

// ===== PROFILE PAGE RENDERER =====
// Called by _loadPageData('profile') — reads AuthState only, zero DB call.
function renderProfilePage() {
  if (!guardPage()) return; // must be logged in

  const user    = AuthState.user;
  const profile = AuthState.profile;
  const name    = profile?.full_name || user?.email?.split('@')[0] || '—';
  const email   = user?.email || '—';
  const role    = profile?.role || 'customer';
  const initial = name.charAt(0).toUpperCase();

  // Header
  const avatarEl = document.getElementById('profile-avatar-large');
  const nameEl   = document.getElementById('profile-name-h');
  const roleEl   = document.getElementById('profile-role-h');
  if (avatarEl) avatarEl.textContent = initial;
  if (nameEl)   nameEl.textContent   = name;
  if (roleEl)   roleEl.textContent   = _roleAr(role);

  const joined = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' })
    : '—';

  const dashBtn = (role === 'merchant')
    ? `<button onclick="showPage('merchant-dashboard')" class="dash-btn dash-btn-primary" style="width:100%;justify-content:center;margin-bottom:8px;">🏪 لوحة التاجر</button>`
    : role === 'admin'
    ? `<button onclick="showPage('admin-dashboard')" class="dash-btn dash-btn-primary" style="width:100%;justify-content:center;margin-bottom:8px;">⚙️ لوحة الإدارة</button>`
    : '';

  const bodyEl = document.getElementById('profile-body');
  if (!bodyEl) return;

  bodyEl.innerHTML = `
    ${dashBtn}
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--gray-100);">
        <span style="font-size:13px;color:var(--gray-400);font-weight:700;">الاسم</span>
        <span style="font-size:14px;font-weight:800;color:var(--gray-800);">${_safeEsc(name)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--gray-100);">
        <span style="font-size:13px;color:var(--gray-400);font-weight:700;">البريد</span>
        <span style="font-size:13px;font-weight:700;color:var(--gray-800);" dir="ltr">${_safeEsc(email)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--gray-100);">
        <span style="font-size:13px;color:var(--gray-400);font-weight:700;">نوع الحساب</span>
        <span style="font-size:13px;font-weight:800;color:var(--blue);">${_roleAr(role)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;">
        <span style="font-size:13px;color:var(--gray-400);font-weight:700;">تاريخ الانضمام</span>
        <span style="font-size:13px;font-weight:700;color:var(--gray-800);">${joined}</span>
      </div>
    </div>`;
}

function _safeEsc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _roleAr(role) {
  if (role === 'merchant') return 'تاجر / شريك 🏪';
  if (role === 'admin')    return 'مدير النظام ⚙️';
  return 'عميل';
}

function _isProtectedPage(page) {
  const protected_ = ['profile', 'merchant-dashboard', 'admin-dashboard'];
  return protected_.includes(page);
}
