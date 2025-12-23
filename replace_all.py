import json

# قراءة الملف
with open('questions/leben-in-deutschland-300-questions.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total questions: {len(data['questions'])}")

# قراءة السكربت الآخر واستخراج الأسئلة
with open('complete_replace_151_200.py', 'r', encoding='utf-8') as f:
    script = f.read()

# تنفيذ الجزء الذي يحدد الأسئلة
exec(script.split('# استبدال الأسئلة من 152 إلى 200')[0])

# استبدال الأسئلة
print(f"Replacing questions 152-200 (indices 151-199)...")
print(f"Number of new questions: {len(new_questions_152_200)}")
data['questions'][151:200] = new_questions_152_200

# حفظ الملف
with open('questions/leben-in-deutschland-300-questions.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Done! Total questions: {len(data['questions'])}")








