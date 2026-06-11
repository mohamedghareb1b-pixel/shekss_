# شيكس — Shekss Platform
## Final Stable Snapshot — Phase 4.1

منصة عروض وخصومات حصرية في مصر — SPA كاملة مبنية على Vanilla JS + Supabase.

---

## ⚠️ Pre-Deployment Checklist (مطلوب قبل الرفع)

### 1. Supabase Storage Bucket
```
Supabase Dashboard → Storage → New Bucket
  Name: deals
  Public: ✅ Yes
```

### 2. SQL Files — بالترتيب الصحيح
```
1. services/profiles.sql
2. services/deals-db.sql
3. services/merchant-requests.sql
4. services/admin.sql
```

### 3. ترقية أول Admin
```sql
UPDATE public.profiles SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
```

### 4. logo.png
ضع ملف `logo.png` في نفس مجلد `index.html`.

### 5. Supabase Keys
تأكد من صحة القيم في `services/supabase.js`:
```js
const SUPABASE_URL = 'https://xxxx.supabase.co';
const SUPABASE_KEY = 'eyJ...';
```

---

## 🗂️ Project Tree

```
shekss/
│
├── index.html                      # SPA Entry Point
│
├── styles/
│   ├── main.css                    # Public site styles
│   └── dashboard.css               # Merchant + Admin dashboard styles
│
├── services/
│   ├── supabase.js                 # Supabase client (sb)
│   ├── auth.js                     # Auth system — AuthState, signIn/Up/Out, guardPage
│   ├── data.js                     # Static data — categories, Egypt govs
│   ├── seo.js                      # SEO — titles, schemas, updateSEO, routing maps
│   ├── profiles.sql                # [SQL-1] profiles table + RLS + trigger
│   ├── deals-db.sql                # [SQL-2] deals table + RLS + storage + auto-expire
│   ├── merchant-requests.sql       # [SQL-3] edit/delete requests + updated_at
│   └── admin.sql                   # [SQL-4] complaints table + is_admin() + admin RLS
│
├── scripts/
│   ├── utils.js                    # Shared: toast, copyCoupon, countdown, slideImg
│   ├── deals.js                    # Public deals: state, buildQuery, home/deals pages
│   ├── expired.js                  # Expired deals page + pagination
│   ├── coupons-blog.js             # Coupons, blog, contact form
│   ├── nav-location.js             # Router: showPage, location, showApp, initHomePage
│   ├── login-handlers.js           # Login form: handleSignIn/Up, validation, selectRole
│   ├── merchant-dashboard.js       # Merchant shell: initMerchantDashboard, switchDashSection
│   ├── merchant-deals-manager.js   # Merchant deals: list, detail, edit/delete requests
│   ├── merchant-add-deal.js        # Add deal form: compress+upload images, submitDeal
│   ├── admin-dashboard.js          # Admin shell: initAdminDashboard, overview stats
│   ├── admin-deals.js              # Admin: pending deals, edit requests, delete requests
│   ├── admin-merchants.js          # Admin: merchant list, suspend/reactivate/delete
│   └── admin-messages.js           # Admin: messages tabs, complaints CRUD
│
└── components/                     # Reference docs only (not imported)
    ├── navbar.html
    ├── footer.html
    ├── deal-card.html
    └── filters.html
```

---

## 📜 Script Loading Order

```html
<!-- CDN -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- Services (order matters) -->
1. services/supabase.js      → creates `sb`
2. services/auth.js          → AuthState, signIn/Up/Out, guardPage, updateNavForAuth
3. services/data.js          → ONLINE_CATS, OFFLINE_CATS, EGYPT_GOVS, CAT_LABELS
4. services/seo.js           → PAGE_TITLES, URL_PAGE_MAP, updateSEO

<!-- Scripts (order matters) -->
5. scripts/utils.js          → toast, copyCoupon, countdown, slideImg
6. scripts/deals.js          → dealCard, buildQuery, home/deals logic, autoExpireDeals
7. scripts/expired.js        → loadExpiredPage, loadMoreExpired
8. scripts/coupons-blog.js   → loadCoupons, loadBlog, sendMsg
9. scripts/nav-location.js   → showPage, showApp, _loadPageData, filterCatsByDeals

<!-- Feature modules -->
10. scripts/login-handlers.js        → handleSignIn, handleSignUp, selectRole
11. scripts/merchant-dashboard.js    → initMerchantDashboard, switchDashSection
12. scripts/merchant-deals-manager.js → loadMerchantDeals, showDealDetail, edit/delete
13. scripts/merchant-add-deal.js     → renderAddDealForm, submitDeal
14. scripts/admin-dashboard.js       → initAdminDashboard, switchAdminSection, _admStat
15. scripts/admin-deals.js           → approveDeal, rejectDeal, edit/delete requests
16. scripts/admin-merchants.js       → renderAdminMerchants, suspend/reactivate
17. scripts/admin-messages.js        → renderAdminMessages, renderAdminComplaints

<!-- Bootstrap -->
<script>showApp();</script>
```

---

## 👥 User Roles

| Role | Access |
|------|--------|
| `customer` | موقع العموم + ملف شخصي |
| `merchant` | + Merchant Dashboard + إدارة عروضه |
| `admin` | + Admin Dashboard + كل الصلاحيات |

---

## 🔄 System Flows

### Public User
```
showApp() → initAuth() → initHomePage()
  → buildQuery(approved only) → deals grid
```

### Merchant
```
signUp(role='merchant') → DB trigger → profiles(role='merchant')
→ showPage('merchant-dashboard') → guardPage('merchant')
→ Add Deal → compress+upload → INSERT(pending_approval)
→ Admin approves → deal goes live
```

### Admin
```
showPage('admin-dashboard') → guardPage('admin')
→ Pending deals → approveDeal() → UPDATE(approved)
→ Edit requests → approveEditRequest() → apply edits
→ Delete requests → approveDeleteRequest() → DELETE
```

---

## 🚀 Pages

| Page | URL | Access |
|------|-----|--------|
| Home | `/` | Public |
| Deals | `/?p=deals` | Public |
| Expired | `/?p=expired-deals` | Public |
| Coupons | `/?p=coupons` | Public |
| Blog | `/?p=blog` | Public |
| Contact | `/?p=contact` | Public |
| About | `/?p=about` | Public |
| FAQ | `/?p=faq` | Public |
| Login | `/?p=login` | Public |
| Profile | `/?p=profile` | Auth required |
| Merchant Dashboard | `/?p=merchant-dashboard` | Merchant only |
| Admin Dashboard | `/?p=admin-dashboard` | Admin only |

---

## 🔮 Features Deferred (not blocking)

- Google OAuth (shows toast 'قريباً')
- Push Notifications
- Ratings system
- Store pages `/store/{id}`
- Profile editing (view only currently)
- Merchant analytics (placeholder stats)

---

## 📊 Readiness

```
Architecture      95%
Auth Flow         92%
Merchant Flow     92%
Admin Flow        96%
Public User Flow  95%
SEO               98%
Auto-Expire      100%
Notifications      0%  (deferred)
```
