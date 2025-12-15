# Prompt: Generate State-Specific Questions for Leben in Deutschland Test

Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of **[STATE_NAME]**.

## FORMAT:

Return JSON using this exact shape:

```json
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
    "state": "[STATE_NAME]",
    "level": "A1",
    "status": "published",
    "tags": ["[STATE_NAME]"]
  }
]
```

## Rules:

- EXACTLY 10 questions.
- **[STATE_NAME]**-specific knowledge only (capital city, landmarks, history, politics, culture, etc.).
- Each question must have EXACTLY 4 options.
- Exactly ONE option must be correct.
- Return ONLY JSON, no text or explanations.

---

## Usage Instructions:

Replace `[STATE_NAME]` with the actual state name for each prompt:

### Berlin
```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Berlin.
```

### Hamburg
```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Hamburg.
```

### Bayern
```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Bayern.
```

### Hessen
```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Hessen.
```

### Nordrhein-Westfalen (NRW)
```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Nordrhein-Westfalen.
```

### Baden-Württemberg
```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Baden-Württemberg.
```

### Brandenburg
```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Brandenburg.
```

### Bremen
```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Bremen.
```

### Mecklenburg-Vorpommern
```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Mecklenburg-Vorpommern.
```

### Niedersachsen
```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Niedersachsen.
```

### Rheinland-Pfalz
```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Rheinland-Pfalz.
```

### Saarland
```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Saarland.
```

### Sachsen
```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Sachsen.
```

### Sachsen-Anhalt
```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Sachsen-Anhalt.
```

### Schleswig-Holstein
```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Schleswig-Holstein.
```

### Thüringen
```
Generate 10 state-specific questions for the official "Leben in Deutschland" test for the state of Thüringen.
```

---

## All 16 German States (Bundesländer):

1. Baden-Württemberg
2. Bayern
3. Berlin
4. Brandenburg
5. Bremen
6. Hamburg
7. Hessen
8. Mecklenburg-Vorpommern
9. Niedersachsen
10. Nordrhein-Westfalen (NRW)
11. Rheinland-Pfalz
12. Saarland
13. Sachsen
14. Sachsen-Anhalt
15. Schleswig-Holstein
16. Thüringen










