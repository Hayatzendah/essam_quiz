# موقع الأستاذ عصام

تطبيق ويب لتسجيل الدخول والتسجيل في موقع الأستاذ عصام.

## المميزات

- ✅ صفحة تسجيل الدخول
- ✅ صفحة التسجيل
- ✅ صفحة الترحيب بعد التسجيل
- ✅ تصميم عصري وجميل
- ✅ دعم اللغة العربية (RTL)

## التثبيت والتشغيل

1. تثبيت المكتبات:
```bash
npm install
```

2. تشغيل المشروع:
```bash
npm run dev
```

3. فتح المتصفح على:
```
http://localhost:5173
```

## البناء للإنتاج

```bash
npm run build
```

## ملاحظات

- API يعمل على `https://api.deutsch-tests.com`
- يمكن تغيير عنوان API من ملف `src/services/api.js`

## تشغيل على Domain معين (للتطوير)

إذا كنت تريد تشغيل السيرفر على domain معين بدلاً من localhost:

### على Windows:
1. افتح ملف `C:\Windows\System32\drivers\etc\hosts` كمسؤول
2. أضف السطر التالي:
   ```
   127.0.0.1    deutsch-tests.com
   ```
   أو
   ```
   127.0.0.1    app.deutsch-tests.com
   ```

### على Linux/Mac:
1. افتح ملف `/etc/hosts`:
   ```bash
   sudo nano /etc/hosts
   ```
2. أضف السطر التالي:
   ```
   127.0.0.1    deutsch-tests.com
   ```

3. ثم شغّل السيرفر:
   ```bash
   npm run dev
   ```

4. افتح المتصفح على: `http://deutsch-tests.com:5173`

**ملاحظة:** عادة الـ Frontend يكون على domain مختلف عن API (مثل `deutsch-tests.com` أو `app.deutsch-tests.com` بينما API على `api.deutsch-tests.com`)

