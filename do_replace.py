import json

with open('questions/leben-in-deutschland-300-questions.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# قراءة السكربت الآخر
with open('complete_replace_151_200.py', 'r', encoding='utf-8') as f:
    script = f.read()

# تنفيذ الجزء الذي يحدد الأسئلة
exec(script.split('# استبدال الأسئلة من 152 إلى 200')[0])

# استبدال
data['questions'][151:200] = new_questions_152_200

# حفظ
with open('questions/leben-in-deutschland-300-questions.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Done!')








