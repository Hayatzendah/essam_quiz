import json

# قراءة الملف
with open('questions/leben-in-deutschland-300-questions.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# قراءة الأسئلة من السكربت الآخر
with open('complete_replace_151_200.py', 'r', encoding='utf-8') as f:
    script_content = f.read()

# استخراج تعريف new_questions_152_200
exec(script_content.split('# استبدال الأسئلة من 152 إلى 200')[0])

# استبدال الأسئلة
data['questions'][151:200] = new_questions_152_200

# حفظ الملف
with open('questions/leben-in-deutschland-300-questions.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Successfully replaced questions 152-200!")








