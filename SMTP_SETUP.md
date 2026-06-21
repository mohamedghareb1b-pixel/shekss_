# إعداد Custom SMTP بـ Gmail لـ شيكس

## الخطوات

### 1. تفعيل 2-Step Verification في Gmail
- اذهب لـ myaccount.google.com
- Security → 2-Step Verification → Turn On

### 2. إنشاء App Password
- myaccount.google.com → Security
- ابحث عن "App passwords"
- Select app: Mail
- Select device: Other → اكتب "Shekss"
- اضغط Generate
- احتفظ بالكلمة المكونة من 16 حرف ← هذه هي الباسورد

### 3. إعداد Supabase Custom SMTP
```
Supabase Dashboard
→ Project Settings
→ Authentication
→ SMTP Settings

Host:         smtp.gmail.com
Port:         587
Username:     your-email@gmail.com
Password:     [الكلمة الـ 16 حرف من App Password]
Sender name:  شيكس
Sender email: your-email@gmail.com
```

### 4. حفظ والاختبار
- اضغط Save
- اضغط Test → أدخل إيميلك → Send Test Email
- تحقق من الوصول

## ملاحظات
- Gmail يسمح بـ 500 إيميل/يوم مجاناً
- للإيميلات الأكثر → استخدم SendGrid أو Resend
- الإيميلات ستظهر من: "شيكس <your-email@gmail.com>"
