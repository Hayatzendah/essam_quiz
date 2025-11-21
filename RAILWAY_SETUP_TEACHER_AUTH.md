# 🔐 إعداد Teacher Authentication في Railway

## المشكلة
التطبيق لا يبدأ لأن `TEACHER_EMAIL` و `TEACHER_PASSWORD` غير موجودين في Railway environment variables.

## الحل: إضافة Environment Variables في Railway

### الخطوات:

1. **افتح Railway Dashboard**
   - اذهب إلى مشروعك في Railway
   - اضغط على Service الخاص بك

2. **افتح Environment Variables**
   - اضغط على تبويب **Variables**
   - أو اضغط على **Settings** ثم **Variables**

3. **أضف المتغيرات التالية:**

   ```bash
   TEACHER_EMAIL=<your-teacher-email>
   TEACHER_PASSWORD=<your-strong-password>
   ```

   **ملاحظات مهمة:**
   - `TEACHER_EMAIL`: يجب أن يكون إيميل صحيح
   - `TEACHER_PASSWORD`: يجب أن يكون باسورد قوي:
     - **12 حرف على الأقل**
     - **حرف كبير واحد على الأقل** (A-Z)
     - **حرف صغير واحد على الأقل** (a-z)
     - **رقم واحد على الأقل** (0-9)
     - **رمز خاص واحد على الأقل** (@$!%*?&#)

5. **احفظ التغييرات**
   - اضغط على **Save** أو **Add Variable**
   - Railway سيعيد تشغيل التطبيق تلقائياً

## إنشاء باسورد قوي

### باستخدام Node.js:
```bash
node -e "const crypto = require('crypto'); const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&#'; let password = ''; password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[crypto.randomInt(26)]; password += 'abcdefghijklmnopqrstuvwxyz'[crypto.randomInt(26)]; password += '0123456789'[crypto.randomInt(10)]; password += '@$!%*?&#'[crypto.randomInt(8)]; for (let i = 4; i < 16; i++) { password += chars[crypto.randomInt(chars.length)]; } console.log(password.split('').sort(() => crypto.randomInt(3) - 1).join(''));"
```

### أو استخدم أي password generator online:
- https://www.lastpass.com/features/password-generator
- https://passwordsgenerator.net/

## بعد إضافة المتغيرات

1. **تحقق من Logs**
   - اذهب إلى **Deployments** في Railway
   - اضغط على آخر deployment
   - تحقق من أن التطبيق بدأ بنجاح

2. **اختبار الدخول**
   ```bash
   POST /auth/login
   {
     "email": "<your-teacher-email>",
     "password": "<your-teacher-password>"
   }
   ```

## ملاحظات أمنية

⚠️ **مهم جداً:**
- لا تشارك `TEACHER_PASSWORD` مع أي شخص
- غيّر الباسورد بانتظام
- استخدم باسورد قوي وفريد
- لا تضع الباسورد في الكود أو Git

## للمطورين (Development)

في بيئة التطوير المحلية، يمكنك استخدام قيم افتراضية للتطوير فقط.

لكن في Production (Railway)، يجب تعيين قيم قوية وفريدة في Environment Variables.

