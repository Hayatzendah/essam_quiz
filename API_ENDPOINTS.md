# API Endpoints Documentation

**Base URL:** `http://api.deutsch-tests.com`

---

## 🔐 Authentication Endpoints (`/auth`)

### 1. Register - تسجيل مستخدم جديد
- **Method:** `POST`
- **URL:** `http://api.deutsch-tests.com/auth/register`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "role": "student" // optional: "student" | "teacher" | "admin"
  }
  ```
- **Response:** User object with tokens

### 2. Login - تسجيل الدخول
- **Method:** `POST`
- **URL:** `http://api.deutsch-tests.com/auth/login`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response:** Access token and refresh token

### 3. Refresh Token - تحديث الـ token
- **Method:** `POST`
- **URL:** `http://api.deutsch-tests.com/auth/refresh`
- **Body:**
  ```json
  {
    "refreshToken": "your-refresh-token-here"
  }
  ```
- **Response:** New access token

### 4. Logout - تسجيل الخروج
- **Method:** `POST`
- **URL:** `http://api.deutsch-tests.com/auth/logout`
- **Headers:** `Authorization: Bearer <access-token>`
- **Response:** Success message

### 5. Get Auth API Info
- **Method:** `GET`
- **URL:** `http://api.deutsch-tests.com/auth`
- **Response:** List of all auth endpoints

### 6. Test Page (HTML)
- **Method:** `GET`
- **URL:** `http://api.deutsch-tests.com/auth/test`
- **Response:** HTML test page for testing auth endpoints

### 7. Debug Users
- **Method:** `GET`
- **URL:** `http://api.deutsch-tests.com/auth/debug/users`
- **Response:** List of all users (for debugging)

### 8. Debug User by Email
- **Method:** `GET`
- **URL:** `http://api.deutsch-tests.com/auth/debug/user/:email`
- **Example:** `http://api.deutsch-tests.com/auth/debug/user/test@example.com`
- **Response:** User details

### 9. Check User Exists
- **Method:** `GET`
- **URL:** `http://api.deutsch-tests.com/auth/check/:email`
- **Example:** `http://api.deutsch-tests.com/auth/check/test@example.com`
- **Response:** User existence status

---

## 👤 Users Endpoints (`/users`)

### 1. Get Current User - الحصول على بيانات المستخدم الحالي
- **Method:** `GET`
- **URL:** `http://api.deutsch-tests.com/users/me`
- **Headers:** `Authorization: Bearer <access-token>`
- **Response:** Current user data (id, email, role)

### 2. Update User Role - تحديث دور المستخدم (Admin Only)
- **Method:** `PATCH`
- **URL:** `http://api.deutsch-tests.com/users/role/:id`
- **Headers:** `Authorization: Bearer <access-token>`
- **Roles Required:** `admin`
- **Body:**
  ```json
  {
    "role": "teacher"
  }
  ```
- **Valid Roles:** `student`, `teacher`, `admin`
- **Response:** Updated user data (id, email, role)
- **Example:** `PATCH http://api.deutsch-tests.com/users/role/690fa2f504a0c4b2253dc8f5`

---

## 📝 Questions Endpoints (`/questions`)

### 1. Get All Questions
- **Method:** `GET`
- **URL:** `http://api.deutsch-tests.com/questions`
- **Response:** List of questions

---

## 🏠 Root Endpoints

### 1. Root - الصفحة الرئيسية
- **Method:** `GET`
- **URL:** `http://api.deutsch-tests.com/`
- **Response:** 
  ```json
  {
    "ok": true,
    "service": "quiz-backend"
  }
  ```

### 2. Protected Route - مسار محمي
- **Method:** `GET`
- **URL:** `http://api.deutsch-tests.com/protected`
- **Headers:** `Authorization: Bearer <access-token>`
- **Roles Required:** `teacher` or `admin`
- **Response:** Protected content

---

## ❤️ Health Check Endpoints (`/health`)

### 1. Health Check
- **Method:** `GET`
- **URL:** `http://api.deutsch-tests.com/health`
- **Response:** 
  ```json
  {
    "ok": true,
    "time": "2025-11-07T20:00:00.000Z"
  }
  ```

---

## 📋 Summary - ملخص جميع الـ Endpoints

### Public Endpoints (لا تحتاج authentication):
- `GET http://api.deutsch-tests.com/` - Root
- `GET http://api.deutsch-tests.com/health` - Health check
- `GET http://api.deutsch-tests.com/auth` - Auth info
- `GET http://api.deutsch-tests.com/auth/test` - Test page
- `GET http://api.deutsch-tests.com/auth/debug/users` - Debug users
- `GET http://api.deutsch-tests.com/auth/debug/user/:email` - Debug user
- `GET http://api.deutsch-tests.com/auth/check/:email` - Check user
- `POST http://api.deutsch-tests.com/auth/register` - Register
- `POST http://api.deutsch-tests.com/auth/login` - Login
- `POST http://api.deutsch-tests.com/auth/refresh` - Refresh token
- `GET http://api.deutsch-tests.com/questions` - Get questions

### Protected Endpoints (تحتاج authentication):
- `POST http://api.deutsch-tests.com/auth/logout` - Logout
- `GET http://api.deutsch-tests.com/users/me` - Get current user
- `PATCH http://api.deutsch-tests.com/users/role/:id` - Update user role (admin only)
- `GET http://api.deutsch-tests.com/protected` - Protected route (teacher/admin only)

---

## 🔑 Authentication Headers

للاستخدام مع الـ endpoints المحمية، أضف الـ header التالي:

```
Authorization: Bearer <your-access-token>
```

**مثال:**
```bash
curl -H "Authorization: Bearer your-token-here" \
  http://api.deutsch-tests.com/users/me
```

---

## 📝 Notes

- جميع الـ endpoints تستخدم `http://api.deutsch-tests.com` كـ base URL
- الـ CORS مضبوط للسماح بالطلبات من الـ frontend
- الـ tokens صالحة لمدة 15 دقيقة (access token) و 7 أيام (refresh token)

