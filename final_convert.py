#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script to replace first 100 questions in leben-in-deutschland-300-questions.json
"""
import json
import re
import sys

# Force UTF-8 output
if sys.stdout.encoding != 'utf-8':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Read questions from the embedded data
# (The full questions_data string would go here - truncated for space)
# For now, let's read from convert_questions.py or process directly

def main():
    print("Starting conversion...", flush=True)
    
    # Import the questions data from convert_questions.py
    try:
        # Read the questions from the other file
        with open('convert_questions.py', 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract questions_data
        match = re.search(r'questions_data = """(.*?)"""', content, re.DOTALL)
        if not match:
            print("Could not find questions_data in convert_questions.py")
            return
        
        questions_text = match.group(1)
        print(f"Extracted questions text ({len(questions_text)} chars)", flush=True)
        
    except Exception as e:
        print(f"Error reading convert_questions.py: {e}", flush=True)
        return
    
    # Parse questions (reuse the function from convert_questions.py)
    # For now, let's just import it
    sys.path.insert(0, '.')
    try:
        from convert_questions import parse_questions
        new_questions = parse_questions(questions_text)
        print(f"Parsed {len(new_questions)} questions", flush=True)
    except Exception as e:
        print(f"Error parsing: {e}", flush=True)
        import traceback
        traceback.print_exc()
        return
    
    # Read and update JSON file
    try:
        with open('questions/leben-in-deutschland-300-questions.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        original_count = len(data['questions'])
        print(f"Original file has {original_count} questions", flush=True)
        
        # Replace first 100
        data['questions'] = new_questions + data['questions'][100:]
        
        with open('questions/leben-in-deutschland-300-questions.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"Success! Replaced first 100 questions. Total: {len(data['questions'])}", flush=True)
        
    except Exception as e:
        print(f"Error updating file: {e}", flush=True)
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()








