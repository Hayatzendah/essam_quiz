import json

# قراءة الملف
with open('questions/leben-in-deutschland-300-questions.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# قراءة وتعريف الأسئلة من السكربت الآخر
exec(compile(open('complete_replace_151_200.py', encoding='utf-8').read().split('# استبدال الأسئلة من 152 إلى 200')[0], '<string>', 'exec'))

# استبدال الأسئلة
data['questions'][151:200] = new_questions_152_200

# حفظ الملف
with open('questions/leben-in-deutschland-300-questions.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Done!")















