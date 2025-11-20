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
TEACHER_EMAIL=teacher@deutsch-tests.com  # Fixed email for teachers (REQUIRED)
TEACHER_PASSWORD=...         # Fixed password for teachers (REQUIRED - min 12 chars, must contain uppercase, lowercase, number, and special character)
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

### Teacher Authentication (Required)
```bash
TEACHER_EMAIL=teacher@deutsch-tests.com  # Fixed email for teachers (REQUIRED)
TEACHER_PASSWORD=YourStr0ng!P@ssw0rd     # Fixed password for teachers (REQUIRED)
                                         # Must be at least 12 characters
                                         # Must contain: uppercase, lowercase, number, and special character (@$!%*?&#)
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
TEACHER_EMAIL=teacher@deutsch-tests.com
TEACHER_PASSWORD=YourStr0ng!P@ssw0rd
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
3. **TEACHER_PASSWORD must be strong** - At least 12 characters with uppercase, lowercase, numbers, and special characters
4. **Keep `ENABLE_SWAGGER=false`** in production
5. **Set `WEB_APP_ORIGIN`** correctly to prevent CORS issues
6. **Change TEACHER_PASSWORD regularly** in production environments

---

## 📝 Generating Secrets

### JWT Secrets (Using Node.js):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### JWT Secrets (Using OpenSSL):
```bash
openssl rand -hex 32
```

### Strong Teacher Password:
يجب أن يكون الباسورد قوي ويحتوي على:
- **12 حرف على الأقل**
- **حرف كبير واحد على الأقل** (A-Z)
- **حرف صغير واحد على الأقل** (a-z)
- **رقم واحد على الأقل** (0-9)
- **رمز خاص واحد على الأقل** (@$!%*?&#)

**مثال على باسورد قوي:**
```bash
TEACHER_PASSWORD=Deutsch2024!@#Teacher
```

**أو يمكنك استخدام أداة لإنشاء باسورد عشوائي قوي:**
```bash
# Using Node.js
node -e "const crypto = require('crypto'); const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&#'; let password = ''; password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[crypto.randomInt(26)]; password += 'abcdefghijklmnopqrstuvwxyz'[crypto.randomInt(26)]; password += '0123456789'[crypto.randomInt(10)]; password += '@$!%*?&#'[crypto.randomInt(8)]; for (let i = 4; i < 16; i++) { password += chars[crypto.randomInt(chars.length)]; } console.log(password.split('').sort(() => crypto.randomInt(3) - 1).join(''));"
```

---

## ✅ Validation

All environment variables are validated on startup using Joi schema. Missing required variables will cause the application to exit with an error message.







