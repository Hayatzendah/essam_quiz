#!/usr/bin/env python
# -*- coding: utf-8 -*-
import json
import sys

# Read the questions from user input and convert them
# For now, let me create a direct conversion approach

# Read existing JSON
try:
    with open('questions/leben-in-deutschland-300-questions.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"Read {len(data['questions'])} existing questions")
except Exception as e:
    print(f"Error reading file: {e}")
    sys.exit(1)

# The new questions will be added here
# Since parsing from text is complex, let me create them manually
# But that's 100 questions... let me try a different approach

# Actually, let me just verify the file can be read and written
print("File read successfully")
print(f"First question: {data['questions'][0]['prompt'][:50]}...")










