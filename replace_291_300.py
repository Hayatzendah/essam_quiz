import json

# الأسئلة الجديدة من 291 إلى 300
new_questions_291_300 = [
  {
    "prompt": "Warum muss man in Deutschland bei der Steuererklärung aufschreiben, ob man zu einer Kirche gehört oder nicht?",
    "qType": "mcq",
    "options": [
      { "text": "Weil es eine Kirchensteuer gibt, die an die Einkommen- und Lohnsteuer geknüpft ist.", "isCorrect": true },
      { "text": "das für die Statistik in Deutschland wichtig ist.", "isCorrect": false },
      { "text": "man mehr Steuern zahlen muss, wenn man nicht zu einer Kirche gehört.", "isCorrect": false },
      { "text": "die Kirche für die Steuererklärung verantwortlich ist.", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "common",
    "level": "A1",
    "status": "published",
    "tags": ["300-Fragen"]
  },
  {
    "prompt": "Die Menschen in Deutschland leben nach dem Grundsatz der religiösen Toleranz. Was bedeutet das?",
    "qType": "mcq",
    "options": [
      { "text": "Es dürfen keine Moscheen gebaut werden.", "isCorrect": false },
      { "text": "Alle Menschen glauben an Gott.", "isCorrect": false },
      { "text": "Jeder kann glauben, was er möchte.", "isCorrect": true },
      { "text": "Der Staat entscheidet, an welchen Gott die Menschen glauben.", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "common",
    "level": "A1",
    "status": "published",
    "tags": ["300-Fragen"]
  },
  {
    "prompt": "Was ist in Deutschland ein Brauch zu Ostern?",
    "qType": "mcq",
    "options": [
      { "text": "Kürbisse vor die Tür stellen", "isCorrect": false },
      { "text": "einen Tannenbaum schmücken", "isCorrect": false },
      { "text": "Eier bemalen", "isCorrect": true },
      { "text": "Raketen in die Luft schießen", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "common",
    "level": "A1",
    "status": "published",
    "tags": ["300-Fragen"]
  },
  {
    "prompt": "Pfingsten ist ein …",
    "qType": "mcq",
    "options": [
      { "text": "christlicher Feiertag.", "isCorrect": true },
      { "text": "deutscher Gedenktag.", "isCorrect": false },
      { "text": "internationaler Trauertag.", "isCorrect": false },
      { "text": "bayerischer Brauch.", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "common",
    "level": "A1",
    "status": "published",
    "tags": ["300-Fragen"]
  },
  {
    "prompt": "Welche Religion hat die europäische und deutsche Kultur geprägt?",
    "qType": "mcq",
    "options": [
      { "text": "der Hinduismus", "isCorrect": false },
      { "text": "das Christentum", "isCorrect": true },
      { "text": "der Buddhismus", "isCorrect": false },
      { "text": "der Islam", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "common",
    "level": "A1",
    "status": "published",
    "tags": ["300-Fragen"]
  },
  {
    "prompt": "In Deutschland nennt man die letzten vier Wochen vor Weihnachten …",
    "qType": "mcq",
    "options": [
      { "text": "den Buß- und Bettag.", "isCorrect": false },
      { "text": "das Erntedankfest.", "isCorrect": false },
      { "text": "die Adventszeit.", "isCorrect": true },
      { "text": "Allerheiligen.", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "common",
    "level": "A1",
    "status": "published",
    "tags": ["300-Fragen"]
  },
  {
    "prompt": "Aus welchem Land sind die meisten Migrantinnen und Migranten nach Deutschland gekommen?",
    "qType": "mcq",
    "options": [
      { "text": "Italien", "isCorrect": false },
      { "text": "Polen", "isCorrect": false },
      { "text": "Marokko", "isCorrect": false },
      { "text": "Türkei", "isCorrect": true }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "common",
    "level": "A1",
    "status": "published",
    "tags": ["300-Fragen"]
  },
  {
    "prompt": "In der DDR lebten vor allem Migrantinnen und Migranten aus …",
    "qType": "mcq",
    "options": [
      { "text": "Vietnam, Polen, Mosambik.", "isCorrect": true },
      { "text": "Frankreich, Rumänien, Somalia.", "isCorrect": false },
      { "text": "Chile, Ungarn, Simbabwe.", "isCorrect": false },
      { "text": "Nordkorea, Mexiko, Ägypten.", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "common",
    "level": "A1",
    "status": "published",
    "tags": ["300-Fragen"]
  },
  {
    "prompt": "Ausländische Arbeitnehmerinnen und Arbeitnehmer, die in den 50er und 60er Jahren von der Bundesrepublik Deutschland angeworben wurden, nannte man …",
    "qType": "mcq",
    "options": [
      { "text": "Schwarzarbeiterinnen/Schwarzarbeiter.", "isCorrect": false },
      { "text": "Gastarbeiterinnen/Gastarbeiter.", "isCorrect": true },
      { "text": "Zeitarbeiterinnen/Zeitarbeiter.", "isCorrect": false },
      { "text": "Schichtarbeiterinnen/Schichtarbeiter.", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "common",
    "level": "A1",
    "status": "published",
    "tags": ["300-Fragen"]
  },
  {
    "prompt": "Aus welchem Land kamen die ersten Gastarbeiterinnen und Gastarbeiter in die Bundesrepublik Deutschland?",
    "qType": "mcq",
    "options": [
      { "text": "Italien", "isCorrect": true },
      { "text": "Spanien", "isCorrect": false },
      { "text": "Portugal", "isCorrect": false },
      { "text": "Türkei", "isCorrect": false }
    ],
    "provider": "leben_in_deutschland",
    "mainSkill": "leben_test",
    "usageCategory": "common",
    "level": "A1",
    "status": "published",
    "tags": ["300-Fragen"]
  }
]

# قراءة الملف
with open('questions/leben-in-deutschland-300-questions.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total questions before: {len(data['questions'])}")

# استبدال الأسئلة من 291 إلى 300 (indices 290-299)
if len(data['questions']) >= 300:
    data['questions'][290:300] = new_questions_291_300
else:
    # إذا كان هناك أقل من 300 سؤال، نضيف الأسئلة الجديدة
    data['questions'] = data['questions'][:290] + new_questions_291_300

print(f"Total questions after: {len(data['questions'])}")

# حفظ الملف
with open('questions/leben-in-deutschland-300-questions.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Successfully replaced questions 291-300!")







