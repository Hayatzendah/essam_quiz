# Leben in Deutschland Test - Question Generation Prompts

This directory contains prompts for generating questions for the "Leben in Deutschland" test.

## Files:

1. **`leben-in-deutschland-300-questions.md`** - Prompt for generating 300 general/common questions
2. **`leben-in-deutschland-state-questions.md`** - Prompt template for generating 10 questions per German state (16 states total)

## Quick Start:

### Generate 300 General Questions:

Copy the prompt from `leben-in-deutschland-300-questions.md` and paste it into Cursor.

**If you encounter token limits**, generate in batches:
- Batch 1: Questions 1-100
- Batch 2: Questions 101-200  
- Batch 3: Questions 201-300

### Generate State-Specific Questions:

For each of the 16 German states, use the prompt from `leben-in-deutschland-state-questions.md` and replace `[STATE_NAME]` with the actual state name.

**All 16 States:**
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

## Expected Output Format:

Both prompts will generate JSON arrays with question objects in this format:

```json
[
  {
    "prompt": "Question text...",
    "qType": "mcq",
    "options": [
      { "text": "Option A", "isCorrect": false },
      { "text": "Option B", "isCorrect": true },
      { "text": "Option C", "isCorrect": false },
      { "text": "Option D", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "common",  // or "state_specific" for state questions
    "level": "A1",
    "status": "published",
    "tags": ["300-Fragen"]  // or [state name] for state questions
  }
]
```

## Notes:

- All questions are multiple-choice (MCQ) with exactly 4 options
- Exactly one option must be marked as correct (`isCorrect: true`)
- General questions should be valid for all states
- State-specific questions should focus on that state's unique characteristics
- Questions should be factual and appropriate for the official "Leben in Deutschland" test



























