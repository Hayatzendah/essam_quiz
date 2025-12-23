import json

# قراءة الملف
with open('questions/leben-in-deutschland-300-questions.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# الأسئلة الجديدة من 152 إلى 200
new_questions_152_200 = [
    {
        "prompt": "Wann waren die Nationalsozialisten mit Adolf Hitler in Deutschland an der Macht?",
        "qType": "mcq",
        "options": [
            { "text": "1918 bis 1923", "isCorrect": false },
            { "text": "1932 bis 1950", "isCorrect": false },
            { "text": "1933 bis 1945", "isCorrect": true },
            { "text": "1945 bis 1989", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Was war am 8. Mai 1945?",
        "qType": "mcq",
        "options": [
            { "text": "Tod Adolf Hitlers", "isCorrect": false },
            { "text": "Beginn des Berliner Mauerbaus", "isCorrect": false },
            { "text": "Wahl von Konrad Adenauer zum Bundeskanzler", "isCorrect": false },
            { "text": "Ende des Zweiten Weltkriegs in Europa", "isCorrect": true }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Wann war der Zweite Weltkrieg zu Ende?",
        "qType": "mcq",
        "options": [
            { "text": "1933", "isCorrect": false },
            { "text": "1945", "isCorrect": true },
            { "text": "1949", "isCorrect": false },
            { "text": "1961", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Wann waren die Nationalsozialisten in Deutschland an der Macht?",
        "qType": "mcq",
        "options": [
            { "text": "1888 bis 1918", "isCorrect": false },
            { "text": "1921 bis 1934", "isCorrect": false },
            { "text": "1933 bis 1945", "isCorrect": true },
            { "text": "1949 bis 1963", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "In welchem Jahr wurde Hitler Reichskanzler?",
        "qType": "mcq",
        "options": [
            { "text": "1923", "isCorrect": false },
            { "text": "1927", "isCorrect": false },
            { "text": "1933", "isCorrect": true },
            { "text": "1936", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Die Nationalsozialisten mit Adolf Hitler errichteten 1933 in Deutschland …",
        "qType": "mcq",
        "options": [
            { "text": "eine Diktatur.", "isCorrect": true },
            { "text": "einen demokratischen Staat.", "isCorrect": false },
            { "text": "eine Monarchie.", "isCorrect": false },
            { "text": "ein Fürstentum.", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Das \"Dritte Reich\" war eine …",
        "qType": "mcq",
        "options": [
            { "text": "Diktatur.", "isCorrect": true },
            { "text": "Demokratie.", "isCorrect": false },
            { "text": "Monarchie.", "isCorrect": false },
            { "text": "Räterepublik.", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Was gab es in Deutschland nicht während der Zeit des Nationalsozialismus?",
        "qType": "mcq",
        "options": [
            { "text": "freie Wahlen", "isCorrect": true },
            { "text": "Pressezensur", "isCorrect": false },
            { "text": "willkürliche Verhaftungen", "isCorrect": false },
            { "text": "Verfolgung von Juden", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Welcher Krieg dauerte von 1939 bis 1945?",
        "qType": "mcq",
        "options": [
            { "text": "der Erste Weltkrieg", "isCorrect": false },
            { "text": "der Zweite Weltkrieg", "isCorrect": true },
            { "text": "der Vietnamkrieg", "isCorrect": false },
            { "text": "der Golfkrieg", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Was kennzeichnete den NS-Staat? Eine Politik …",
        "qType": "mcq",
        "options": [
            { "text": "des staatlichen Rassismus", "isCorrect": true },
            { "text": "der Meinungsfreiheit", "isCorrect": false },
            { "text": "der allgemeinen Religionsfreiheit", "isCorrect": false },
            { "text": "der Entwicklung der Demokratie", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Claus Schenk Graf von Stauffenberg wurde bekannt durch …",
        "qType": "mcq",
        "options": [
            { "text": "eine Goldmedaille bei den Olympischen Spielen 1936.", "isCorrect": false },
            { "text": "den Bau des Reichstagsgebäudes.", "isCorrect": false },
            { "text": "den Aufbau der Wehrmacht.", "isCorrect": false },
            { "text": "das Attentat auf Hitler am 20. Juli 1944.", "isCorrect": true }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "In welchem Jahr zerstörten die Nationalsozialisten Synagogen und jüdische Geschäfte in Deutschland?",
        "qType": "mcq",
        "options": [
            { "text": "1925", "isCorrect": false },
            { "text": "1930", "isCorrect": false },
            { "text": "1938", "isCorrect": true },
            { "text": "1945", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Was passierte am 9. November 1938 in Deutschland?",
        "qType": "mcq",
        "options": [
            { "text": "Mit dem Angriff auf Polen beginnt der Zweite Weltkrieg.", "isCorrect": false },
            { "text": "Die Nationalsozialisten verlieren eine Wahl und lösen den Reichstag auf.", "isCorrect": false },
            { "text": "Jüdische Geschäfte und Synagogen werden durch Nationalsozialisten und ihre Anhänger zerstört.", "isCorrect": true },
            { "text": "Hitler wird Reichspräsident und lässt alle Parteien verbieten.", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Wie hieß der erste Bundeskanzler der Bundesrepublik Deutschland?",
        "qType": "mcq",
        "options": [
            { "text": "Konrad Adenauer", "isCorrect": true },
            { "text": "Kurt Georg Kiesinger", "isCorrect": false },
            { "text": "Helmut Schmidt", "isCorrect": false },
            { "text": "Willy Brandt", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Bei welchen Demonstrationen in Deutschland riefen die Menschen \"Wir sind das Volk\"?",
        "qType": "mcq",
        "options": [
            { "text": "beim Arbeiteraufstand 1953 in der DDR", "isCorrect": false },
            { "text": "bei den Demonstrationen 1968 in der Bundesrepublik Deutschland", "isCorrect": false },
            { "text": "bei den Anti-Atomkraft-Demonstrationen 1985 in der Bundesrepublik Deutschland", "isCorrect": false },
            { "text": "bei den Montagsdemonstrationen 1989 in der DDR", "isCorrect": true }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Welche Länder wurden nach dem Zweiten Weltkrieg in Deutschland als \"Alliierte Besatzungsmächte\" bezeichnet?",
        "qType": "mcq",
        "options": [
            { "text": "Sowjetunion, Großbritannien, Polen, Schweden", "isCorrect": false },
            { "text": "Frankreich, Sowjetunion, Italien, Japan", "isCorrect": false },
            { "text": "USA, Sowjetunion, Spanien, Portugal", "isCorrect": false },
            { "text": "USA, Sowjetunion, Großbritannien, Frankreich", "isCorrect": true }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Welches Land war keine \"Alliierte Besatzungsmacht\" in Deutschland?",
        "qType": "mcq",
        "options": [
            { "text": "USA", "isCorrect": false },
            { "text": "Sowjetunion", "isCorrect": false },
            { "text": "Frankreich", "isCorrect": false },
            { "text": "Japan", "isCorrect": true }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Wann wurde die Bundesrepublik Deutschland gegründet?",
        "qType": "mcq",
        "options": [
            { "text": "1939", "isCorrect": false },
            { "text": "1945", "isCorrect": false },
            { "text": "1949", "isCorrect": true },
            { "text": "1951", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Was gab es während der Zeit des Nationalsozialismus in Deutschland?",
        "qType": "mcq",
        "options": [
            { "text": "das Verbot von Parteien", "isCorrect": true },
            { "text": "das Recht zur freien Entfaltung der Persönlichkeit", "isCorrect": false },
            { "text": "Pressefreiheit", "isCorrect": false },
            { "text": "den Schutz der Menschenwürde", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Soziale Marktwirtschaft bedeutet, die Wirtschaft …",
        "qType": "mcq",
        "options": [
            { "text": "steuert sich allein nach Angebot und Nachfrage.", "isCorrect": false },
            { "text": "wird vom Staat geplant und gesteuert, Angebot und Nachfrage werden nicht berücksichtigt.", "isCorrect": false },
            { "text": "richtet sich nach der Nachfrage im Ausland.", "isCorrect": false },
            { "text": "richtet sich nach Angebot und Nachfrage, aber der Staat sorgt für einen sozialen Ausgleich.", "isCorrect": true }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "In welcher Besatzungszone wurde die DDR gegründet? In der …",
        "qType": "mcq",
        "options": [
            { "text": "amerikanischen Besatzungszone", "isCorrect": false },
            { "text": "französischen Besatzungszone", "isCorrect": false },
            { "text": "britischen Besatzungszone", "isCorrect": false },
            { "text": "sowjetischen Besatzungszone", "isCorrect": true }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Die Bundesrepublik Deutschland ist ein Gründungsmitglied …",
        "qType": "mcq",
        "options": [
            { "text": "des Nordatlantikpakts (NATO).", "isCorrect": false },
            { "text": "der Vereinten Nationen (VN).", "isCorrect": false },
            { "text": "der Europäischen Union (EU).", "isCorrect": true },
            { "text": "des Warschauer Pakts.", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Wann wurde die DDR gegründet?",
        "qType": "mcq",
        "options": [
            { "text": "1947", "isCorrect": false },
            { "text": "1949", "isCorrect": true },
            { "text": "1953", "isCorrect": false },
            { "text": "1956", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Wie viele Besatzungszonen gab es in Deutschland nach dem Zweiten Weltkrieg?",
        "qType": "mcq",
        "options": [
            { "text": "3", "isCorrect": false },
            { "text": "4", "isCorrect": true },
            { "text": "5", "isCorrect": false },
            { "text": "6", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Wie waren die Besatzungszonen Deutschlands nach 1945 verteilt?",
        "qType": "mcq",
        "options": [
            { "text": "1=Großbritannien, 2=Sowjetunion, 3=Frankreich, 4=USA", "isCorrect": false },
            { "text": "1=Sowjetunion, 2=Großbritannien, 3=USA, 4=Frankreich", "isCorrect": true },
            { "text": "1=Großbritannien, 2=Sowjetunion, 3=USA, 4=Frankreich", "isCorrect": false },
            { "text": "1=Großbritannien, 2=USA, 3=Sowjetunion, 4=Frankreich", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Welche deutsche Stadt wurde nach dem Zweiten Weltkrieg in vier Sektoren aufgeteilt?",
        "qType": "mcq",
        "options": [
            { "text": "München", "isCorrect": false },
            { "text": "Berlin", "isCorrect": true },
            { "text": "Dresden", "isCorrect": false },
            { "text": "Frankfurt/Oder", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Vom Juni 1948 bis zum Mai 1949 wurden die Bürgerinnen und Bürger von West-Berlin durch eine Luftbrücke versorgt. Welcher Umstand war dafür verantwortlich?",
        "qType": "mcq",
        "options": [
            { "text": "Für Frankreich war eine Versorgung der West-Berliner Bevölkerung mit dem Flugzeug kostengünstiger.", "isCorrect": false },
            { "text": "Die amerikanischen Soldatinnen und Soldaten hatten beim Landtransport Angst vor Überfällen.", "isCorrect": false },
            { "text": "Für Großbritannien war die Versorgung über die Luftbrücke schneller.", "isCorrect": false },
            { "text": "Die Sowjetunion unterbrach den gesamten Verkehr auf dem Landwege.", "isCorrect": true }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Wie endete der Zweite Weltkrieg in Europa offiziell?",
        "qType": "mcq",
        "options": [
            { "text": "mit dem Tod Adolf Hitlers", "isCorrect": false },
            { "text": "durch die bedingungslose Kapitulation Deutschlands", "isCorrect": true },
            { "text": "mit dem Rückzug der Deutschen aus den besetzten Gebieten", "isCorrect": false },
            { "text": "durch eine Revolution in Deutschland", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Der erste Bundeskanzler der Bundesrepublik Deutschland war …",
        "qType": "mcq",
        "options": [
            { "text": "Ludwig Erhard.", "isCorrect": false },
            { "text": "Willy Brandt.", "isCorrect": false },
            { "text": "Konrad Adenauer.", "isCorrect": true },
            { "text": "Gerhard Schröder.", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Was wollte Willy Brandt mit seinem Kniefall 1970 im ehemaligen jüdischen Ghetto in Warschau ausdrücken?",
        "qType": "mcq",
        "options": [
            { "text": "Er hat sich den ehemaligen Alliierten unterworfen.", "isCorrect": false },
            { "text": "Er bat Polen und die polnischen Juden um Vergebung.", "isCorrect": true },
            { "text": "Er zeigte seine Demut vor dem Warschauer Pakt.", "isCorrect": false },
            { "text": "Er sprach ein Gebet am Grab des Unbekannten Soldaten.", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Wie heißt das jüdische Gebetshaus?",
        "qType": "mcq",
        "options": [
            { "text": "Basilika", "isCorrect": false },
            { "text": "Moschee", "isCorrect": false },
            { "text": "Synagoge", "isCorrect": true },
            { "text": "Kirche", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Wann war in der Bundesrepublik Deutschland das \"Wirtschaftswunder\"?",
        "qType": "mcq",
        "options": [
            { "text": "40er Jahre", "isCorrect": false },
            { "text": "50er Jahre", "isCorrect": true },
            { "text": "70er Jahre", "isCorrect": false },
            { "text": "80er Jahre", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Auf welcher rechtlichen Grundlage wurde der Staat Israel gegründet?",
        "qType": "mcq",
        "options": [
            { "text": "eine Resolution der Vereinten Nationen", "isCorrect": true },
            { "text": "ein Beschluss des Zionistenkongresses", "isCorrect": false },
            { "text": "ein Vorschlag der Bundesregierung", "isCorrect": false },
            { "text": "ein Vorschlag der UdSSR", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Wofür stand der Ausdruck \"Eiserner Vorhang\"? Für die Abschottung …",
        "qType": "mcq",
        "options": [
            { "text": "des Warschauer Pakts gegen den Westen", "isCorrect": true },
            { "text": "Norddeutschlands gegen Süddeutschland", "isCorrect": false },
            { "text": "Nazi-Deutschlands gegen die Alliierten", "isCorrect": false },
            { "text": "Europas gegen die USA", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Im Jahr 1953 gab es in der DDR einen Aufstand, an den lange Zeit in der Bundesrepublik Deutschland ein Feiertag erinnerte. Wann war das?",
        "qType": "mcq",
        "options": [
            { "text": "Mai", "isCorrect": false },
            { "text": "17. Juni", "isCorrect": true },
            { "text": "Juli", "isCorrect": false },
            { "text": "November", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Welcher deutsche Staat hatte eine schwarz-rot-goldene Flagge mit Hammer, Zirkel und Ährenkranz?",
        "qType": "mcq",
        "options": [
            { "text": "Preußen", "isCorrect": false },
            { "text": "Bundesrepublik Deutschland", "isCorrect": false },
            { "text": "\"Drittes Reich\"", "isCorrect": false },
            { "text": "DDR", "isCorrect": true }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "In welchem Jahr wurde die Mauer in Berlin gebaut?",
        "qType": "mcq",
        "options": [
            { "text": "1953", "isCorrect": false },
            { "text": "1956", "isCorrect": false },
            { "text": "1959", "isCorrect": false },
            { "text": "1961", "isCorrect": true }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Wann baute die DDR die Mauer in Berlin?",
        "qType": "mcq",
        "options": [
            { "text": "1919", "isCorrect": false },
            { "text": "1933", "isCorrect": false },
            { "text": "1961", "isCorrect": true },
            { "text": "1990", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Was bedeutet die Abkürzung DDR?",
        "qType": "mcq",
        "options": [
            { "text": "Dritter Deutscher Rundfunk", "isCorrect": false },
            { "text": "Die Deutsche Republik", "isCorrect": false },
            { "text": "Dritte Deutsche Republik", "isCorrect": false },
            { "text": "Deutsche Demokratische Republik", "isCorrect": true }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Wann wurde die Mauer in Berlin für alle geöffnet?",
        "qType": "mcq",
        "options": [
            { "text": "1987", "isCorrect": false },
            { "text": "1989", "isCorrect": true },
            { "text": "1992", "isCorrect": false },
            { "text": "1995", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Welches heutige deutsche Bundesland gehörte früher zum Gebiet der DDR?",
        "qType": "mcq",
        "options": [
            { "text": "Brandenburg", "isCorrect": true },
            { "text": "Bayern", "isCorrect": false },
            { "text": "Saarland", "isCorrect": false },
            { "text": "Hessen", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Von 1961 bis 1989 war Berlin …",
        "qType": "mcq",
        "options": [
            { "text": "ohne Bürgermeister.", "isCorrect": false },
            { "text": "ein eigener Staat.", "isCorrect": false },
            { "text": "durch eine Mauer geteilt.", "isCorrect": true },
            { "text": "nur mit dem Flugzeug erreichbar.", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Am 3. Oktober feiert man in Deutschland den Tag der Deutschen …",
        "qType": "mcq",
        "options": [
            { "text": "Einheit.", "isCorrect": true },
            { "text": "Nation.", "isCorrect": false },
            { "text": "Bundesländer.", "isCorrect": false },
            { "text": "Städte.", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Welches heutige deutsche Bundesland gehörte früher zum Gebiet der DDR?",
        "qType": "mcq",
        "options": [
            { "text": "Hessen", "isCorrect": false },
            { "text": "Sachsen-Anhalt", "isCorrect": true },
            { "text": "Nordrhein-Westfalen", "isCorrect": false },
            { "text": "Saarland", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Warum nennt man die Zeit im Herbst 1989 in der DDR \"Die Wende\"? In dieser Zeit veränderte sich die DDR politisch …",
        "qType": "mcq",
        "options": [
            { "text": "von einer Diktatur zur Demokratie.", "isCorrect": true },
            { "text": "von einer liberalen Marktwirtschaft zum Sozialismus.", "isCorrect": false },
            { "text": "von einer Monarchie zur Sozialdemokratie.", "isCorrect": false },
            { "text": "von einem religiösen Staat zu einem kommunistischen Staat.", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Welches heutige deutsche Bundesland gehörte früher zum Gebiet der DDR?",
        "qType": "mcq",
        "options": [
            { "text": "Thüringen", "isCorrect": true },
            { "text": "Hessen", "isCorrect": false },
            { "text": "Bayern", "isCorrect": false },
            { "text": "Bremen", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Welches heutige deutsche Bundesland gehörte früher zum Gebiet der DDR?",
        "qType": "mcq",
        "options": [
            { "text": "Bayern", "isCorrect": false },
            { "text": "Niedersachsen", "isCorrect": false },
            { "text": "Sachsen", "isCorrect": true },
            { "text": "Baden-Württemberg", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Mit der Abkürzung \"Stasi\" meinte man in der DDR …",
        "qType": "mcq",
        "options": [
            { "text": "das Parlament.", "isCorrect": false },
            { "text": "das Ministerium für Staatssicherheit.", "isCorrect": true },
            { "text": "eine regierende Partei.", "isCorrect": false },
            { "text": "das Ministerium für Volksbildung.", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    },
    {
        "prompt": "Welches heutige deutsche Bundesland gehörte früher zum Gebiet der DDR?",
        "qType": "mcq",
        "options": [
            { "text": "Hessen", "isCorrect": false },
            { "text": "Schleswig-Holstein", "isCorrect": false },
            { "text": "Mecklenburg-Vorpommern", "isCorrect": true },
            { "text": "Saarland", "isCorrect": false }
        ],
        "provider": "leben_in_deutschland",
        "mainSkill": "leben_test",
        "usageCategory": "common",
        "level": "A1",
        "status": "published",
        "tags": ["300-Fragen"]
    }
]

# استبدال الأسئلة من 152 إلى 200 (indices 151-199)
print(f"Total questions before: {len(data['questions'])}")
print(f"Replacing questions 152-200 (indices 151-199)...")

# استبدال الأسئلة
data['questions'][151:200] = new_questions_152_200

print(f"Total questions after: {len(data['questions'])}")

# حفظ الملف
with open('questions/leben-in-deutschland-300-questions.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Successfully replaced questions 152-200!")

