# Prompt: Generate 300 General Questions for Leben in Deutschland Test

I need you to generate 300 multiple-choice questions for the official "Leben in Deutschland" test.

## FORMAT REQUIREMENTS:

Return ONLY valid JSON in this exact shape (array of objects):

```json
[
  {
    "prompt": "The question text here...",
    "qType": "mcq",
    "options": [
      { "text": "Option A", "isCorrect": false },
      { "text": "Option B", "isCorrect": true },
      { "text": "Option C", "isCorrect": false },
      { "text": "Option D", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "common",
    "level": "A1",
    "status": "published",
    "tags": ["300-Fragen"]
  }
]
```

## RULES:

- Generate EXACTLY 300 questions.
- Each question must have EXACTLY 4 options.
- Exactly ONE option must be correct.
- All questions should be valid for ALL states (common questions).
- Do NOT include state-specific content.
- Keep questions factual and realistic for Leben in Deutschland.
- Questions should cover topics like: German history, politics, society, culture, rights and duties, geography, etc.

## DO NOT return explanations. ONLY return the JSON array.

---

## Note: If you encounter token limits

If Cursor gives you token errors, generate 100 questions at a time using this prompt:

**Batch 1 (Questions 1-100):**
```
Generate 100 questions batch 1
```

**Batch 2 (Questions 101-200):**
```
Generate 100 questions batch 2
```

**Batch 3 (Questions 201-300):**
```
Generate 100 questions batch 3
```











