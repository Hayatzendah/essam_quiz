# 🔐 Environment Variables Reference

قائمة شاملة بجميع متغيرات البيئة المستخدمة في المشروع.

---

## 📋 Required Variables (إجبارية)

### Server Configuration
```bash
PORT=8080                    # Port number (Railway uses 8080 by default)
NODE_ENV=production          # Environment: development | production | test
```

### Database
```bash
MONGO_URI=mongodb+srv://...  # MongoDB connection string
```

### Authentication
```bash
JWT_ACCESS_SECRET=...        # Secret for access tokens (min 32 chars)
JWT_REFRESH_SECRET=...       # Secret for refresh tokens (min 32 chars)
JWT_ACCESS_EXPIRES_IN=15m    # Access token expiration (default: 15m)
JWT_REFRESH_EXPIRES_IN=7d    # Refresh token expiration (default: 7d)
```

### CORS
```bash
WEB_APP_ORIGIN=https://your-frontend.com  # Frontend origin (comma-separated for multiple)
```

---

## 🔧 Optional Variables (اختيارية)

### Swagger Documentation
```bash
ENABLE_SWAGGER=false         # Enable Swagger UI at /docs (default: false)
```

### Random Seed (for exam randomization)
```bash
SECRET_RANDOM_SERVER=...     # Secret for deterministic random number generation
```

### S3/Media Storage
```bash
# If not set, MediaService will use Mock Mode
S3_REGION=us-east-1
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=...
S3_FORCE_PATH_STYLE=false
S3_USE_ACL=true
MEDIA_USE_MOCK=false         # Force mock mode (default: auto-detect)
MEDIA_DEFAULT_EXPIRES_SEC=3600  # Presigned URL expiration (default: 1 hour)
```

### API Base URL (for Mock Mode)
```bash
API_BASE_URL=https://api.your-domain.com  # Used for mock media URLs
```

### Backward Compatibility
```bash
CORS_ORIGIN=...              # Fallback for WEB_APP_ORIGIN (deprecated)
```

---

## 🚀 Quick Setup for Railway

### Minimum Required Variables:
```bash
PORT=8080
NODE_ENV=production
MONGO_URI=mongodb+srv://...
JWT_ACCESS_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-secret-here
WEB_APP_ORIGIN=https://your-frontend.com
```

### Recommended Additional Variables:
```bash
ENABLE_SWAGGER=false
SECRET_RANDOM_SERVER=your-random-secret
```

### For Media Uploads (S3):
```bash
S3_REGION=us-east-1
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=...
```

---

## 🔒 Security Notes

1. **Never commit secrets to Git** - Use Railway environment variables
2. **Use strong random values** for JWT secrets (32+ characters)
3. **Keep `ENABLE_SWAGGER=false`** in production
4. **Set `WEB_APP_ORIGIN`** correctly to prevent CORS issues

---

## 📝 Generating Secrets

### Using Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Using OpenSSL:
```bash
openssl rand -hex 32
```

---

## ✅ Validation

All environment variables are validated on startup using Joi schema. Missing required variables will cause the application to exit with an error message.

