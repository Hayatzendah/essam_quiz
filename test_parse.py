import re

# Test with first 3 questions
test_data = """Aufgabe 1: 
In Deutschland dürfen Menschen offen etwas gegen die Regierung sagen, weil …
•	hier Religionsfreiheit gilt.
•	die Menschen Steuern zahlen.
•	die Menschen das Wahlrecht haben.
•	hier Meinungsfreiheit gilt. 
Correct answer: hier Meinungsfreiheit gilt.

Aufgabe 2:
 In Deutschland können Eltern bis zum 14. Lebensjahr ihres Kindes entscheiden, ob es in der Schule am …
•	Geschichtsunterricht teilnimmt.
•	Religionsunterricht teilnimmt. 
•	Politikunterricht teilnimmt.
•	Sprachunterricht teilnimmt.
Correct answer: Religionsunterricht teilnimmt."""

parts = re.split(r'Aufgabe \d+:', test_data)
print(f"Found {len(parts)} parts")
for i, part in enumerate(parts[1:3], 1):
    print(f"\n--- Aufgabe {i} ---")
    lines = [l.strip() for l in part.strip().split('\n') if l.strip()]
    print(f"Lines: {len(lines)}")
    for j, line in enumerate(lines[:10]):  # First 10 lines
        print(f"  {j}: {line[:50]}")











