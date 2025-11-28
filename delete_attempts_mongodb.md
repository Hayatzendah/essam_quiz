# 🗑️ حذف المحاولات القديمة من MongoDB

## المشكلة:
الأسئلة محفوظة في **snapshot** داخل Attempt items. حتى لو حذفت السؤال من Questions collection، سيظل موجوداً في Attempt items.

## الحل:

### الطريقة 1: حذف جميع المحاولات (الأسهل)

**في MongoDB Compass أو MongoDB Shell:**

```javascript
// حذف جميع المحاولات
db.attempts.deleteMany({});
```

**أو في Terminal:**
```bash
mongosh "mongodb://localhost:27017/quiz-backend" --eval "db.attempts.deleteMany({})"
```

---

### الطريقة 2: حذف محاولات تحتوي على questionId محدد

```javascript
// استبدل QUESTION_ID_1, QUESTION_ID_2, إلخ بـ IDs الأسئلة القديمة
db.attempts.deleteMany({
  "items.questionId": { 
    $in: [
      ObjectId("QUESTION_ID_1"),
      ObjectId("QUESTION_ID_2"),
      ObjectId("QUESTION_ID_3")
    ]
  }
});
```

---

### الطريقة 3: حذف محاولات قبل تاريخ محدد

```javascript
// حذف جميع المحاولات قبل تاريخ معين
db.attempts.deleteMany({
  createdAt: { $lt: ISODate("2025-01-01T00:00:00.000Z") }
});
```

---

### الطريقة 4: استخدام السكريبت

```bash
# تأكد من تثبيت mongodb package
npm install mongodb

# غيّر MONGODB_URI في السكريبت
node delete_old_attempts.js
```

---

## ⚠️ تحذير:
- حذف المحاولات **لا يمكن التراجع عنه**
- تأكد من عمل backup قبل الحذف
- بعد الحذف، يمكن للطلاب بدء محاولات جديدة مع الأسئلة الجديدة

---

## التحقق من الحذف:

```javascript
// عدد المحاولات المتبقية
db.attempts.countDocuments({});

// عرض المحاولات المتبقية
db.attempts.find({}).pretty();
```






