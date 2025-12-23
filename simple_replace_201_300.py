import json

# قراءة الملف
with open('questions/leben-in-deutschland-300-questions.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# قراءة السكربت الآخر واستخراج الأسئلة
with open('replace_questions_201_300.py', 'r', encoding='utf-8') as f:
    script = f.read()

# تنفيذ الجزء الذي يحدد الأسئلة
exec(script.split('def parse_questions')[0])

# تنفيذ دالة parse_questions
exec(script.split('def parse_questions')[1].split('try:')[0])

# استخراج الأسئلة
new_questions_201_300 = parse_questions(questions_data_201_300)

# استبدال الأسئلة
print(f"Total questions before: {len(data['questions'])}")
print(f"Replacing questions 201-300 (indices 200-299)...")
print(f"Number of new questions: {len(new_questions_201_300)}")

data['questions'][200:300] = new_questions_201_300

# حفظ الملف
with open('questions/leben-in-deutschland-300-questions.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Done! Total questions: {len(data['questions'])}")








