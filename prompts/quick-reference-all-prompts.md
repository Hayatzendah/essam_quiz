# Quick Reference: All Prompts Ready to Use

## 📋 300 General Questions Prompt

Copy and paste this into Cursor:

```
I need you to generate 300 multiple-choice questions for the official "Leben in Deutschland" test.

FORMAT REQUIREMENTS:

Return ONLY valid JSON in this exact shape (array of objects):

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

RULES:

- Generate EXACTLY 300 questions.
- Each question must have EXACTLY 4 options.
- Exactly ONE option must be correct.
- All questions should be valid for ALL states (common questions).
- Do NOT include state-specific content.
- Keep questions factual and realistic for Leben in Deutschland.

DO NOT return explanations. ONLY return the JSON array.
```

**If token limit error occurs, use this instead (100 questions per batch):**

```
Generate 100 questions batch 1
```

---

## 🏛️ State-Specific Questions Prompts (10 questions per state)

### 1. Berlin

```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Berlin.

FORMAT:

Return JSON using this exact shape:

[
  {
    "prompt": "...",
    "qType": "mcq",
    "options": [
      { "text": "...", "isCorrect": true },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "state_specific",
    "state": "Berlin",
    "level": "A1",
    "status": "published",
    "tags": ["Berlin"]
  }
]

Rules:
- EXACTLY 10 questions.
- Berlin-specific knowledge only.
- Return ONLY JSON, no text.
```

### 2. Hamburg

```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Hamburg.

FORMAT:

Return JSON using this exact shape:

[
  {
    "prompt": "...",
    "qType": "mcq",
    "options": [
      { "text": "...", "isCorrect": true },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "state_specific",
    "state": "Hamburg",
    "level": "A1",
    "status": "published",
    "tags": ["Hamburg"]
  }
]

Rules:
- EXACTLY 10 questions.
- Hamburg-specific knowledge only.
- Return ONLY JSON, no text.
```

### 3. Bayern

```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Bayern.

FORMAT:

Return JSON using this exact shape:

[
  {
    "prompt": "...",
    "qType": "mcq",
    "options": [
      { "text": "...", "isCorrect": true },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "state_specific",
    "state": "Bayern",
    "level": "A1",
    "status": "published",
    "tags": ["Bayern"]
  }
]

Rules:
- EXACTLY 10 questions.
- Bayern-specific knowledge only.
- Return ONLY JSON, no text.
```

### 4. Hessen

```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Hessen.

FORMAT:

Return JSON using this exact shape:

[
  {
    "prompt": "...",
    "qType": "mcq",
    "options": [
      { "text": "...", "isCorrect": true },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "state_specific",
    "state": "Hessen",
    "level": "A1",
    "status": "published",
    "tags": ["Hessen"]
  }
]

Rules:
- EXACTLY 10 questions.
- Hessen-specific knowledge only.
- Return ONLY JSON, no text.
```

### 5. Nordrhein-Westfalen (NRW)

```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Nordrhein-Westfalen.

FORMAT:

Return JSON using this exact shape:

[
  {
    "prompt": "...",
    "qType": "mcq",
    "options": [
      { "text": "...", "isCorrect": true },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "state_specific",
    "state": "Nordrhein-Westfalen",
    "level": "A1",
    "status": "published",
    "tags": ["Nordrhein-Westfalen"]
  }
]

Rules:
- EXACTLY 10 questions.
- Nordrhein-Westfalen-specific knowledge only.
- Return ONLY JSON, no text.
```

### 6. Baden-Württemberg

```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Baden-Württemberg.

FORMAT:

Return JSON using this exact shape:

[
  {
    "prompt": "...",
    "qType": "mcq",
    "options": [
      { "text": "...", "isCorrect": true },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "state_specific",
    "state": "Baden-Württemberg",
    "level": "A1",
    "status": "published",
    "tags": ["Baden-Württemberg"]
  }
]

Rules:
- EXACTLY 10 questions.
- Baden-Württemberg-specific knowledge only.
- Return ONLY JSON, no text.
```

### 7. Brandenburg

```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Brandenburg.

FORMAT:

Return JSON using this exact shape:

[
  {
    "prompt": "...",
    "qType": "mcq",
    "options": [
      { "text": "...", "isCorrect": true },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "state_specific",
    "state": "Brandenburg",
    "level": "A1",
    "status": "published",
    "tags": ["Brandenburg"]
  }
]

Rules:
- EXACTLY 10 questions.
- Brandenburg-specific knowledge only.
- Return ONLY JSON, no text.
```

### 8. Bremen

```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Bremen.

FORMAT:

Return JSON using this exact shape:

[
  {
    "prompt": "...",
    "qType": "mcq",
    "options": [
      { "text": "...", "isCorrect": true },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "state_specific",
    "state": "Bremen",
    "level": "A1",
    "status": "published",
    "tags": ["Bremen"]
  }
]

Rules:
- EXACTLY 10 questions.
- Bremen-specific knowledge only.
- Return ONLY JSON, no text.
```

### 9. Mecklenburg-Vorpommern

```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Mecklenburg-Vorpommern.

FORMAT:

Return JSON using this exact shape:

[
  {
    "prompt": "...",
    "qType": "mcq",
    "options": [
      { "text": "...", "isCorrect": true },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "state_specific",
    "state": "Mecklenburg-Vorpommern",
    "level": "A1",
    "status": "published",
    "tags": ["Mecklenburg-Vorpommern"]
  }
]

Rules:
- EXACTLY 10 questions.
- Mecklenburg-Vorpommern-specific knowledge only.
- Return ONLY JSON, no text.
```

### 10. Niedersachsen

```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Niedersachsen.

FORMAT:

Return JSON using this exact shape:

[
  {
    "prompt": "...",
    "qType": "mcq",
    "options": [
      { "text": "...", "isCorrect": true },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "state_specific",
    "state": "Niedersachsen",
    "level": "A1",
    "status": "published",
    "tags": ["Niedersachsen"]
  }
]

Rules:
- EXACTLY 10 questions.
- Niedersachsen-specific knowledge only.
- Return ONLY JSON, no text.
```

### 11. Rheinland-Pfalz

```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Rheinland-Pfalz.

FORMAT:

Return JSON using this exact shape:

[
  {
    "prompt": "...",
    "qType": "mcq",
    "options": [
      { "text": "...", "isCorrect": true },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "state_specific",
    "state": "Rheinland-Pfalz",
    "level": "A1",
    "status": "published",
    "tags": ["Rheinland-Pfalz"]
  }
]

Rules:
- EXACTLY 10 questions.
- Rheinland-Pfalz-specific knowledge only.
- Return ONLY JSON, no text.
```

### 12. Saarland

```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Saarland.

FORMAT:

Return JSON using this exact shape:

[
  {
    "prompt": "...",
    "qType": "mcq",
    "options": [
      { "text": "...", "isCorrect": true },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "state_specific",
    "state": "Saarland",
    "level": "A1",
    "status": "published",
    "tags": ["Saarland"]
  }
]

Rules:
- EXACTLY 10 questions.
- Saarland-specific knowledge only.
- Return ONLY JSON, no text.
```

### 13. Sachsen

```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Sachsen.

FORMAT:

Return JSON using this exact shape:

[
  {
    "prompt": "...",
    "qType": "mcq",
    "options": [
      { "text": "...", "isCorrect": true },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "state_specific",
    "state": "Sachsen",
    "level": "A1",
    "status": "published",
    "tags": ["Sachsen"]
  }
]

Rules:
- EXACTLY 10 questions.
- Sachsen-specific knowledge only.
- Return ONLY JSON, no text.
```

### 14. Sachsen-Anhalt

```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Sachsen-Anhalt.

FORMAT:

Return JSON using this exact shape:

[
  {
    "prompt": "...",
    "qType": "mcq",
    "options": [
      { "text": "...", "isCorrect": true },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "state_specific",
    "state": "Sachsen-Anhalt",
    "level": "A1",
    "status": "published",
    "tags": ["Sachsen-Anhalt"]
  }
]

Rules:
- EXACTLY 10 questions.
- Sachsen-Anhalt-specific knowledge only.
- Return ONLY JSON, no text.
```

### 15. Schleswig-Holstein

```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Schleswig-Holstein.

FORMAT:

Return JSON using this exact shape:

[
  {
    "prompt": "...",
    "qType": "mcq",
    "options": [
      { "text": "...", "isCorrect": true },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "state_specific",
    "state": "Schleswig-Holstein",
    "level": "A1",
    "status": "published",
    "tags": ["Schleswig-Holstein"]
  }
]

Rules:
- EXACTLY 10 questions.
- Schleswig-Holstein-specific knowledge only.
- Return ONLY JSON, no text.
```

### 16. Thüringen

```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Thüringen.

FORMAT:

Return JSON using this exact shape:

[
  {
    "prompt": "...",
    "qType": "mcq",
    "options": [
      { "text": "...", "isCorrect": true },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false },
      { "text": "...", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "state_specific",
    "state": "Thüringen",
    "level": "A1",
    "status": "published",
    "tags": ["Thüringen"]
  }
]

Rules:
- EXACTLY 10 questions.
- Thüringen-specific knowledge only.
- Return ONLY JSON, no text.
```

---

## 📊 Summary

- **300 General Questions**: 1 prompt
- **State-Specific Questions**: 16 prompts (10 questions each = 160 questions total)
- **Total Questions**: 460 questions

## ⏱️ Estimated Time

With Cursor, you can generate all state questions in approximately 10 minutes by copying and pasting each prompt sequentially.










