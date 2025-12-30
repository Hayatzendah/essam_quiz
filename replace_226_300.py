import json
import re

# Read the questions from the script file
with open('replace_questions_201_300.py', 'r', encoding='utf-8') as f:
    script_content = f.read()

# Extract the questions data
match = re.search(r'questions_data_201_300 = """(.*?)"""', script_content, re.DOTALL)
if not match:
    print("Could not find questions data")
    exit(1)

questions_text = match.group(1)

def parse_questions(text):
    questions = []
    parts = re.split(r'Aufgabe (\d+):', text)
    
    for i in range(1, len(parts), 2):
        task_number = int(parts[i].strip())
        part_content = parts[i+1].strip()
        
        try:
            lines = [l.strip() for l in part_content.split('\n') if l.strip()]
            if not lines:
                continue
            
            # Extract prompt
            prompt_lines = []
            j = 0
            while j < len(lines) and not lines[j].startswith('•'):
                if not lines[j].startswith('Correct answer'):
                    prompt_lines.append(lines[j])
                j += 1
            
            prompt = ' '.join(prompt_lines).strip()
            if not prompt:
                continue
            
            # Extract options
            options = []
            while j < len(lines) and lines[j].startswith('•'):
                option_text = lines[j][1:].strip()
                if option_text:
                    options.append(option_text)
                j += 1
            
            # Extract correct answer
            correct_answer_text = ""
            while j < len(lines):
                if 'Correct answer:' in lines[j]:
                    correct_answer_text = lines[j].split('Correct answer:')[1].strip()
                    break
                j += 1
            
            if not correct_answer_text:
                continue
            
            # Format options
            formatted_options = []
            for opt_text in options:
                is_correct = (opt_text == correct_answer_text)
                formatted_options.append({"text": opt_text, "isCorrect": is_correct})
            
            questions.append({
                "task_number": task_number,
                "prompt": prompt,
                "qType": "mcq",
                "options": formatted_options,
                "provider": "leben_in_deutschland",
                "mainSkill": "leben_test",
                "usageCategory": "common",
                "level": "A1",
                "status": "published",
                "tags": ["300-Fragen"]
            })
        except Exception as e:
            print(f"Error parsing Aufgabe {task_number}: {e}")
            continue
    
    return questions

# Parse all questions
all_questions = parse_questions(questions_text)

# Filter questions 226-300
questions_226_300 = [q for q in all_questions if 226 <= q["task_number"] <= 300]
questions_226_300.sort(key=lambda x: x["task_number"])

# Remove task_number from the final questions
for q in questions_226_300:
    del q["task_number"]

print(f"Parsed {len(questions_226_300)} questions for range 226-300")

# Read existing file
with open('questions/leben-in-deutschland-300-questions.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

original_count = len(data['questions'])
print(f"Original file has {original_count} questions")

# Replace questions from index 225 to 299 (which are questions 226 to 300)
if original_count >= 300:
    data['questions'][225:300] = questions_226_300
else:
    # If there are fewer than 300 questions, extend the list
    data['questions'] = data['questions'][:225] + questions_226_300

print("Writing updated file...")
with open('questions/leben-in-deutschland-300-questions.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Successfully replaced questions 226-300. Total questions: {len(data['questions'])}")











