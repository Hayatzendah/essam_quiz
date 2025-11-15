# 🚂 Railway Deployment Guide

دليل شامل لنشر المشروع على Railway بشكل احترافي ومستقر.

---

## 📋 متطلبات ما قبل النشر

- ✅ حساب Railway (https://railway.app)
- ✅ حساب MongoDB Atlas أو MongoDB على Railway
- ✅ حساب S3-compatible storage (AWS S3, MinIO, Wasabi) - اختياري (يمكن استخدام Mock Mode)

---

## 🔧 إعداد Environment Variables على Railway

### متغيرات إجبارية (Required)

```bash
# Server Configuration
PORT=8080
NODE_ENV=production

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/quiz-db?retryWrites=true&w=majority

# JWT Secrets (استخدمي قيم قوية عشوائية)
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS - رابط الواجهة الأمامية
WEB_APP_ORIGIN=https://your-frontend-domain.com

# Random Seed Secret (للتأكد من عشوائية الامتحانات)
SECRET_RANDOM_SERVER=your-random-secret-for-seeding
```

### متغيرات اختيارية (Optional)

```bash
# Swagger Documentation (افتراضي: false)
ENABLE_SWAGGER=false  # ضعي true فقط للاختبار/التطوير

# S3/Media Storage (إذا لم تُضبطي، سيستخدم Mock Mode)
S3_REGION=us-east-1
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=your-bucket-name
S3_FORCE_PATH_STYLE=false
S3_USE_ACL=true
MEDIA_USE_MOCK=false  # ضعي true للاختبار بدون S3

# API Base URL (لـ Mock Mode URLs)
API_BASE_URL=https://api.your-domain.com
```

---

## 🚀 خطوات النشر على Railway

### 1. ربط المشروع بـ Railway

1. اذهبي إلى [Railway Dashboard](https://railway.app/dashboard)
2. اضغطي على **"New Project"**
3. اختر **"Deploy from GitHub repo"**
4. اربطي المستودع الخاص بك

### 2. إعداد Build & Start Commands

في Railway Project Settings:

- **Build Command:** `npm ci && npm run build`
- **Start Command:** `node dist/main.js`
- **Root Directory:** `quiz-backend` (إذا كان المشروع في مجلد فرعي)

### 3. إضافة Environment Variables

1. اذهبي إلى **Variables** tab في Railway
2. أضيفي جميع المتغيرات المذكورة أعلاه
3. تأكدي من أن `NODE_ENV=production`

### 4. إعداد Health Check

في Railway Service Settings:

- **Healthcheck Path:** `/health`
- **Healthcheck Port:** `$PORT` (أو `8080`)

### 5. إعداد Custom Domain (اختياري)

1. اذهبي إلى **Settings** → **Networking**
2. اضغطي **"Generate Domain"** أو أضيفي دومين مخصص
3. Railway سيوفر HTTPS تلقائياً

---

## 🔒 الأمان (Security)

### ✅ ما تم تطبيقه تلقائياً:

- **Helmet.js** - حماية من XSS, CSRF, وغيرها
- **CORS** - محدود على `WEB_APP_ORIGIN` فقط
- **Rate Limiting** - 100 طلب في الدقيقة لكل IP
- **JWT Authentication** - حماية جميع الـ endpoints
- **Input Validation** - باستخدام class-validator
- **Body Size Limits** - 5MB للـ JSON و multipart

### ⚠️ توصيات إضافية:

1. **Swagger على الإنتاج:**
   - اتركي `ENABLE_SWAGGER=false` على الإنتاج
   - فعّليه فقط للاختبار/التطوير

2. **JWT Secrets:**
   - استخدمي قيم عشوائية قوية (32+ حرف)
   - لا تشاركيها أبداً في الكود

3. **MongoDB:**
   - فعّلي Network Access على MongoDB Atlas
   - أضيفي Railway IPs أو `0.0.0.0/0` (للاختبار فقط)

---

## 📊 Monitoring & Logs

### Railway Logs

- اذهبي إلى **Deployments** → **View Logs**
- ستشوفين جميع الـ logs من التطبيق

### Health Check

```bash
curl https://your-api-domain.com/health
```

يجب أن ترجع:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 12345,
  "environment": "production"
}
```

---

## 🗄️ Database Backups

### MongoDB Atlas (موصى به)

1. اذهبي إلى MongoDB Atlas Dashboard
2. **Backup** → **Cloud Backup**
3. فعّلي **Automated Backups**
4. اختر **Daily** أو **Weekly** backups

### Manual Backup (اختياري)

```bash
# على سيرفر محلي أو CI/CD
mongodump --uri="$MONGO_URI" --archive=backup-$(date +%Y%m%d).gz --gzip

# رفع إلى S3/Drive
aws s3 cp backup-*.gz s3://your-backup-bucket/
```

---

## 🔄 Auto Deploy

### إعداد Auto Deploy من GitHub

1. في Railway Project Settings
2. **Settings** → **Source**
3. فعّلي **"Auto Deploy"**
4. اختر **Branch:** `main` (أو `master`)

### CI/CD Pipeline (اختياري)

المشروع يحتوي على GitHub Actions workflow (`.github/workflows/ci.yml`):

- ✅ Linting
- ✅ Unit Tests
- ✅ E2E Tests

سيتم تشغيله تلقائياً عند كل Push/PR.

---

## 🧪 Testing بعد النشر

### 1. Health Check

```bash
curl https://your-api-domain.com/health
```

### 2. Register & Login

```bash
# Register
curl -X POST https://your-api-domain.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "12345678",
    "role": "teacher"
  }'

# Login
curl -X POST https://your-api-domain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "12345678"
  }'
```

### 3. Protected Endpoint

```bash
curl -X GET https://your-api-domain.com/protected \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🐛 Troubleshooting

### المشكلة: التطبيق لا يبدأ

**الحل:**
1. تحققي من الـ logs في Railway
2. تأكدي من أن جميع المتغيرات الإجبارية موجودة
3. تحققي من `MONGO_URI` صحيح

### المشكلة: CORS errors

**الحل:**
1. تأكدي من `WEB_APP_ORIGIN` مضبوط بشكل صحيح
2. تأكدي من أن الواجهة الأمامية تستخدم نفس الـ origin

### المشكلة: MongoDB connection failed

**الحل:**
1. تحققي من Network Access في MongoDB Atlas
2. أضيفي `0.0.0.0/0` للاختبار (أو Railway IPs للإنتاج)
3. تحققي من username/password في `MONGO_URI`

### المشكلة: Media upload fails

**الحل:**
1. إذا لم تُضبطي S3، تأكدي من `MEDIA_USE_MOCK=true`
2. إذا أضفتي S3، تحققي من جميع مفاتيح S3 صحيحة
3. تحققي من الـ logs في Railway

---

## 📝 Postman Environment

### Local Environment

```json
{
  "name": "Local",
  "values": [
    {
      "key": "baseUrl",
      "value": "http://localhost:4000",
      "type": "default"
    }
  ]
}
```

### Production Environment

```json
{
  "name": "Production",
  "values": [
    {
      "key": "baseUrl",
      "value": "https://api.your-domain.com",
      "type": "default"
    }
  ]
}
```

استخدمي `{{baseUrl}}` في جميع الـ requests.

---

## 📚 Resources

- [Railway Documentation](https://docs.railway.app)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3)

---

## ✅ Checklist قبل النشر

- [ ] جميع Environment Variables مضبوطة
- [ ] `NODE_ENV=production`
- [ ] `ENABLE_SWAGGER=false` (أو محمي بـ Basic Auth)
- [ ] `WEB_APP_ORIGIN` مضبوط بشكل صحيح
- [ ] MongoDB Network Access مضبوط
- [ ] Health Check يعمل
- [ ] Test Register/Login يعمل
- [ ] CORS يعمل مع الواجهة الأمامية
- [ ] Logs تظهر بشكل صحيح
- [ ] Auto Deploy مفعّل (اختياري)

---

**🎉 مبروك! المشروع جاهز للنشر على Railway!**


