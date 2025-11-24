# 🔍 التحقق من الإجابات الصحيحة في MongoDB

## الإجابات الصحيحة حسب القواعد النحوية:

### السؤال 1 (FILL): "Ich sehe ____ Mann"
- **الإجابة الصحيحة:** `"den"` ✅
- **الحقل في Question:** `fillExact: "den"`

### السؤال 2 (TRUE_FALSE): "الجملة التالية صحيحة: 'Ich sehe der Mann'"
- **الإجابة الصحيحة:** `false` (خطأ) ✅
- **السبب:** الجملة "Ich sehe der Mann" خاطئة، يجب أن تكون "Ich sehe den Mann"
- **الحقل في Question:** `answerKeyBoolean: false`

### السؤال 3 (MCQ): "Ich sehe ___ Mann"
- **الإجابة الصحيحة:** `"den"` (index 1 إذا كانت options: ["der", "den", "dem", "des"]) ✅
- **الحقل في Question:** `options[1].isCorrect: true` → `correctOptionIndexes: [1]`

---

## كيفية التحقق من MongoDB:

### 1. البحث عن الأسئلة:
```javascript
// في MongoDB shell
db.questions.find({
  prompt: { $regex: "Ich sehe.*Mann", $options: "i" },
  provider: "Grammatik",
  level: "A1"
}).pretty();
```

### 2. التحقق من الإجابات الصحيحة:

#### للسؤال FILL:
```javascript
db.questions.findOne({
  qType: "fill",
  prompt: { $regex: "Ich sehe.*Mann", $options: "i" }
});
// يجب أن يكون: fillExact: "den"
```

#### للسؤال TRUE_FALSE:
```javascript
db.questions.findOne({
  qType: "true_false",
  prompt: { $regex: "Ich sehe der Mann", $options: "i" }
});
// يجب أن يكون: answerKeyBoolean: false
```

#### للسؤال MCQ:
```javascript
db.questions.findOne({
  qType: "mcq",
  prompt: { $regex: "Ich sehe.*Mann", $options: "i" }
});
// يجب أن يكون: options[1].isCorrect: true (إذا كان "den" في index 1)
```

---

## التحقق من Attempt Items (Snapshot):

### البحث عن محاولة معينة:
```javascript
db.attempts.findOne({ _id: ObjectId("...") });
```

### التحقق من items في المحاولة:
```javascript
const attempt = db.attempts.findOne({ _id: ObjectId("...") });
attempt.items.forEach((item, index) => {
  print(`Item ${index}:`);
  print(`  qType: ${item.qType}`);
  print(`  prompt: ${item.promptSnapshot}`);
  
  if (item.qType === 'mcq') {
    print(`  correctOptionIndexes: ${JSON.stringify(item.correctOptionIndexes)}`);
    print(`  optionsText: ${JSON.stringify(item.optionsText)}`);
    print(`  studentAnswerIndexes: ${JSON.stringify(item.studentAnswerIndexes)}`);
  } else if (item.qType === 'true_false') {
    print(`  answerKeyBoolean: ${item.answerKeyBoolean}`);
    print(`  studentAnswerBoolean: ${item.studentAnswerBoolean}`);
  } else if (item.qType === 'fill') {
    print(`  fillExact: ${item.fillExact}`);
    print(`  studentAnswerText: ${item.studentAnswerText}`);
  }
});
```

---

## المشاكل المحتملة:

### 1. الإجابات الصحيحة مخزنة بشكل خاطئ في Questions:
- ✅ تحقق من `fillExact`, `answerKeyBoolean`, `options[].isCorrect`

### 2. مشكلة في snapshot عند بدء المحاولة:
- ✅ تحقق من `buildSnapshotItem` - يجب أن يحفظ `correctOptionIndexes`, `answerKeyBoolean`, `fillExact` بشكل صحيح

### 3. مشكلة في حفظ إجابة الطالب:
- ✅ تحقق من `saveAnswerToItem` - يجب أن يحفظ `studentAnswerIndexes`, `studentAnswerBoolean`, `studentAnswerText` بشكل صحيح

### 4. مشكلة في التصحيح:
- ✅ تحقق من `scoreItem` - يجب أن يقارن بشكل صحيح

---

## مثال على Query للتحقق:

```javascript
// البحث عن جميع أسئلة Akkusativ
db.questions.find({
  provider: "Grammatik",
  level: "A1",
  tags: "akkusativ"
}).forEach(q => {
  print(`\nQuestion: ${q.prompt}`);
  print(`Type: ${q.qType}`);
  
  if (q.qType === 'mcq') {
    const correctIndexes = q.options
      .map((opt, idx) => opt.isCorrect ? idx : -1)
      .filter(idx => idx >= 0);
    print(`Correct indexes: [${correctIndexes.join(', ')}]`);
    print(`Correct answers: ${correctIndexes.map(idx => q.options[idx].text).join(', ')}`);
  } else if (q.qType === 'true_false') {
    print(`Correct answer: ${q.answerKeyBoolean}`);
  } else if (q.qType === 'fill') {
    print(`Correct answer: "${q.fillExact}"`);
  }
});
```

