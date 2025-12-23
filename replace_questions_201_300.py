import json
import re

questions_data_201_300 = """
Aufgabe 201: 
Welche der folgenden Auflistungen enthält nur Bundesländer, die zum Gebiet der früheren DDR gehörten?

•	Niedersachsen, Nordrhein-Westfalen, Hessen, Schleswig-Holstein, Brandenburg
•	Mecklenburg-Vorpommern, Brandenburg, Sachsen, Sachsen-Anhalt, Thüringen
•	Bayern, Baden-Württemberg, Rheinland-Pfalz, Thüringen, Sachsen
•	Sachsen, Thüringen, Hessen, Niedersachen, Brandenburg

Correct answer: Mecklenburg-Vorpommern, Brandenburg, Sachsen, Sachsen-Anhalt, Thüringen

Aufgabe 202: 
Zu wem gehörte die DDR im "Kalten Krieg"?

•	zu den Westmächten
•	zum Warschauer Pakt 
•	zur NATO
•	zu den blockfreien Staaten

Correct answer: zum Warschauer Pakt

Aufgabe 203: 
Wie hieß das Wirtschaftssystem der DDR?

•	Marktwirtschaft
•	Planwirtschaft 
•	Angebot und Nachfrage
•	Kapitalismus

Correct answer: Planwirtschaft

Aufgabe 204: 
Wie wurden die Bundesrepublik Deutschland und die DDR zu einem Staat?

•	Die Bundesrepublik hat die DDR besetzt.
•	Die heutigen fünf östlichen Bundesländer sind der Bundesrepublik Deutschland beigetreten. 
•	Die westlichen Bundesländer sind der DDR beigetreten.
•	Die DDR hat die Bundesrepublik Deutschland besetzt.

Correct answer: Die heutigen fünf östlichen Bundesländer sind der Bundesrepublik Deutschland beigetreten.

Aufgabe 205: 
Mit dem Beitritt der DDR zur Bundesrepublik Deutschland gehören die neuen Bundesländer nun auch …

•	zur Europäischen Union. 
•	zum Warschauer Pakt.
•	zur OPEC.
•	zur Europäischen Verteidigungsgemeinschaft.

Correct answer: zur Europäischen Union.

Aufgabe 206: 
Woran erinnern die sogenannten „Stolpersteine" in Deutschland?

•	an berühmte deutsche Politikerinnen und Politiker
•	an die Opfer des Nationalsozialismus 
•	an Verkehrstote
•	an bekannte jüdische Musiker

Correct answer: an die Opfer des Nationalsozialismus

Aufgabe 207: 
In welchem Militärbündnis war die DDR Mitglied?

•	in der NATO
•	im Rheinbund
•	im Warschauer Pakt 
•	im Europabündnis

Correct answer: im Warschauer Pakt

Aufgabe 208: 
Was war die "Stasi"?

•	der Geheimdienst im "Dritten Reich"
•	eine berühmte deutsche Gedenkstätte
•	der Geheimdienst der DDR 
•	ein deutscher Sportverein während des Zweiten Weltkrieges

Correct answer: der Geheimdienst der DDR

Aufgabe 209: 
Welches war das Wappen der Deutschen Demokratischen Republik?

•	Bild 1
•	Bild 2
•	Bild 3
•	Bild 4 

Correct answer: Bild 4

Aufgabe 210: 
Was ereignete sich am 17. Juni 1953 in der DDR?

•	der feierliche Beitritt zum Warschauer Pakt
•	landesweite Streiks und ein Volksaufstand 
•	der 1. SED-Parteitag
•	der erste Besuch Fidel Castros

Correct answer: landesweite Streiks und ein Volksaufstand

Aufgabe 211: 
Welcher Politiker steht für die "Ostverträge"?

•	Helmut Kohl
•	Willy Brandt 
•	Michail Gorbatschow
•	Ludwig Erhard

Correct answer: Willy Brandt

Aufgabe 212: 
Wie heißt Deutschland mit vollem Namen?

•	Bundesstaat Deutschland
•	Bundesländer Deutschland
•	Bundesrepublik Deutschland 
•	Bundesbezirk Deutschland

Correct answer: Bundesrepublik Deutschland

Aufgabe 213: 
Wie viele Einwohner hat Deutschland?

•	70 Millionen
•	78 Millionen
•	84 Millionen 
•	90 Millionen

Correct answer: 84 Millionen

Aufgabe 214: 
Welche Farben hat die deutsche Flagge?

•	schwarz-rot-gold 
•	rot-weiß-schwarz
•	schwarz-rot-grün
•	schwarz-gelb-rot

Correct answer: schwarz-rot-gold

Aufgabe 215: 
Wer wird als "Kanzler der Deutschen Einheit" bezeichnet?

•	Gerhard Schröder
•	Helmut Kohl 
•	Konrad Adenauer
•	Helmut Schmidt

Correct answer: Helmut Kohl

Aufgabe 216: 
Welches Symbol ist im Plenarsaal des Deutschen Bundestages zu sehen?

•	der Bundesadler
•	die Fahne der Stadt Berlin
•	der Reichsadler
•	die Reichskrone

Correct answer: der Bundesadler

Aufgabe 217: 
In welchem Zeitraum gab es die Deutsche Demokratische Republik (DDR)?

•	1919 bis 1927
•	1933 bis 1945
•	1945 bis 1961
•	1949 bis 1990 

Correct answer: 1949 bis 1990

Aufgabe 218: 
Wie viele Bundesländer kamen bei der Wiedervereinigung 1990 zur Bundesrepublik Deutschland hinzu?

•	4
•	5 
•	6
•	7

Correct answer: 5

Aufgabe 219: 
Die Bundesrepublik Deutschland hat die Grenzen von heute seit …

•	1933
•	1949
•	1971
•	1990 

Correct answer: 1990

Aufgabe 220: 
Der 27. Januar ist in Deutschland ein offizieller Gedenktag. Woran erinnert dieser Tag?

•	an das Ende des Zweiten Weltkrieges
•	an die Verabschiedung des Grundgesetzes
•	an die Wiedervereinigung Deutschlands
•	an die Opfer des Nationalsozialismus (Tag der Befreiung des Vernichtungslagers Auschwitz) 

Correct answer: an die Opfer des Nationalsozialismus (Tag der Befreiung des Vernichtungslagers Auschwitz)

Aufgabe 221: 
Deutschland ist Mitglied des Schengener Abkommens. Was bedeutet das?

•	Deutsche können in viele Länder Europas ohne Passkontrolle reisen. 
•	Alle Menschen können ohne Personenkontrolle in Deutschland einreisen.
•	Deutsche können ohne Passkontrolle in jedes Land reisen.
•	Deutsche können in jedem Land mit dem Euro bezahlen.

Correct answer: Deutsche können in viele Länder Europas ohne Passkontrolle reisen.

Aufgabe 222: 
Welches Land ist ein Nachbarland von Deutschland?

•	Ungarn
•	Portugal
•	Spanien
•	Schweiz 

Correct answer: Schweiz

Aufgabe 223: 
Welches Land ist ein Nachbarland von Deutschland?

•	Rumänien
•	Bulgarien
•	Polen 
•	Griechenland

Correct answer: Polen

Aufgabe 224: 
Was bedeutet die Abkürzung EU?

•	Europäische Unternehmen
•	Europäische Union 
•	Einheitliche Union
•	Euro Union

Correct answer: Europäische Union

Aufgabe 225: 
In welchem anderen Land gibt es eine große deutschsprachige Bevölkerung?

•	Tschechien
•	Norwegen
•	Spanien
•	Österreich 

Correct answer: Österreich

Aufgabe 226: 
Welche ist die Flagge der Europäischen Union?

•	Bild 1
•	Bild 2
•	Bild 3 
•	Bild 4

Correct answer: Bild 3

Aufgabe 227: 
Welches Land ist ein Nachbarland von Deutschland?

•	Finnland
•	Dänemark
•	Norwegen
•	Schweden

Correct answer: Dänemark

Aufgabe 228: 
Wie wird der Beitritt der DDR zur Bundesrepublik Deutschland im Jahr 1990 allgemein genannt?

•	NATO-Osterweiterung
•	EU-Osterweiterung
•	Deutsche Wiedervereinigung
•	Europäische Gemeinschaft

Correct answer: Deutsche Wiedervereinigung

Aufgabe 229: 
Welches Land ist ein Nachbarland von Deutschland?

•	Spanien
•	Bulgarien
•	Norwegen
•	Luxemburg 

Correct answer: Luxemburg

Aufgabe 230: 
Das Europäische Parlament wird regelmäßig gewählt, nämlich alle …

•	5 Jahre. 
•	6 Jahre.
•	7 Jahre.
•	8 Jahre.

Correct answer: 5 Jahre.

Aufgabe 231: 
Was bedeutet der Begriff "europäische Integration"?

•	Damit sind amerikanische Einwanderinnen und Einwanderer in Europa gemeint.
•	Der Begriff meint den Einwanderungsstopp nach Europa.
•	Damit sind europäische Auswanderinnen und Auswanderer in den USA gemeint.
•	Der Begriff meint den Zusammenschluss europäischer Staaten zur EU. 

Correct answer: Der Begriff meint den Zusammenschluss europäischer Staaten zur EU.

Aufgabe 232: 
Wer wird bei der Europawahl gewählt?

•	die Europäische Kommission
•	die Länder, die in die EU eintreten dürfen
•	die Abgeordneten des Europäischen Parlaments 
•	die europäische Verfassung

Correct answer: die Abgeordneten des Europäischen Parlaments

Aufgabe 233: 
Welches Land ist ein Nachbarland von Deutschland?

•	Tschechien 
•	Bulgarien
•	Griechenland
•	Portugal

Correct answer: Tschechien

Aufgabe 234: 
Wo ist ein Sitz des Europäischen Parlaments?

•	London
•	Paris
•	Berlin
•	Straßburg 

Correct answer: Straßburg

Aufgabe 235: 
Welches Ziel der Europäischen Union wird bei diesem Treffen in Verdun deutlich?

•	Freundschaft zwischen England und Deutschland
•	Reisefreiheit in alle Länder der EU
•	Frieden und Sicherheit in den Ländern der EU 
•	einheitliche Feiertage in den Ländern der EU

Correct answer: Frieden und Sicherheit in den Ländern der EU

Aufgabe 236: 
Wie viele Mitgliedstaaten hat die EU heute?

•	21
•	23
•	25
•	27 

Correct answer: 27

Aufgabe 237: 
2007 wurde das 50-jährige Jubiläum der "Römischen Verträge" gefeiert. Was war der Inhalt der Verträge?

•	Beitritt Deutschlands zur NATO
•	Gründung der Europäischen Wirtschaftsgemeinschaft (EWG) 
•	Verpflichtung Deutschlands zu Reparationsleistungen
•	Festlegung der Oder-Neiße-Linie als Ostgrenze

Correct answer: Gründung der Europäischen Wirtschaftsgemeinschaft (EWG)

Aufgabe 238: 
An welchen Orten arbeitet das Europäische Parlament?

•	Paris, London und Den Haag
•	Straßburg, Luxemburg und Brüssel 
•	Rom, Bern und Wien
•	Bonn, Zürich und Mailand

Correct answer: Straßburg, Luxemburg und Brüssel

Aufgabe 239: 
Durch welche Verträge schloss sich die Bundesrepublik Deutschland mit anderen Staaten zur Europäischen Wirtschaftsgemeinschaft zusammen?

•	durch die "Hamburger Verträge"
•	durch die "Römischen Verträge" 
•	durch die "Pariser Verträge"
•	durch die "Londoner Verträge"

Correct answer: durch die "Römischen Verträge"

Aufgabe 240: 
Seit wann bezahlt man in Deutschland mit dem Euro in bar?

•	1995
•	1998
•	2002 
•	2005

Correct answer: 2002

Aufgabe 241: 
Frau Seger bekommt ein Kind. Was muss sie tun, um Elterngeld zu erhalten?

•	Sie muss an ihre Krankenkasse schreiben.
•	Sie muss einen Antrag bei der Elterngeldstelle stellen.
•	Sie muss nichts tun, denn sie bekommt automatisch Elterngeld.
•	Sie muss das Arbeitsamt um Erlaubnis bitten.

Correct answer: Sie muss einen Antrag bei der Elterngeldstelle stellen.

Aufgabe 242: 
Wer entscheidet, ob ein Kind in Deutschland in den Kindergarten geht?

•	der Staat
•	die Bundesländer
•	die Eltern/die Erziehungsberechtigten 
•	die Schulen

Correct answer: die Eltern/die Erziehungsberechtigten

Aufgabe 243: 
Maik und Sybille wollen mit Freunden an ihrem deutschen Wohnort eine Demonstration auf der Straße abhalten. Was müssen sie vorher tun?

•	Sie müssen die Demonstration anmelden. 
•	Sie müssen nichts tun. Man darf in Deutschland jederzeit überall demonstrieren.
•	Sie können gar nichts tun, denn Demonstrationen sind in Deutschland grundsätzlich verboten.
•	Maik und Sybille müssen einen neuen Verein gründen, weil nur Vereine demonstrieren dürfen.

Correct answer: Sie müssen die Demonstration anmelden.

Aufgabe 244: 
Welchen Schulabschluss braucht man normalerweise, um an einer Universität in Deutschland ein Studium zu beginnen?

•	das Abitur 
•	ein Diplom
•	die Prokura
•	eine Gesellenprüfung

Correct answer: das Abitur

Aufgabe 245: 
Wer darf in Deutschland nicht als Paar zusammenleben?

•	Hans (20 Jahre) und Marie (19 Jahre)
•	Tom (20 Jahre) und Klaus (45 Jahre)
•	Sofie (35 Jahre) und Lisa (40 Jahre)
•	Anne (13 Jahre) und Tim (25 Jahre) 

Correct answer: Anne (13 Jahre) und Tim (25 Jahre)

Aufgabe 246: 
Ab welchem Alter ist man in Deutschland volljährig?

•	16
•	18 
•	19
•	21

Correct answer: 18

Aufgabe 247: 
Eine Frau ist schwanger. Sie ist kurz vor und nach der Geburt ihres Kindes vom Gesetz besonders beschützt. Wie heißt dieser Schutz?

•	Elternzeit
•	Mutterschutz 
•	Geburtsvorbereitung
•	Wochenbett

Correct answer: Mutterschutz

Aufgabe 248: 
Die Erziehung der Kinder ist in Deutschland vor allem Aufgabe …

•	des Staates.
•	der Eltern. 
•	der Großeltern.
•	der Schulen.

Correct answer: der Eltern.

Aufgabe 249: 
Wer ist in Deutschland hauptsächlich verantwortlich für die Kindererziehung?

•	der Staat
•	die Eltern 
•	die Verwandten
•	die Schulen

Correct answer: die Eltern

Aufgabe 250: 
In Deutschland hat man die besten Chancen auf einen gut bezahlten Arbeitsplatz, wenn man …

•	katholisch ist.
•	gut ausgebildet ist. 
•	eine Frau ist.
•	Mitglied einer Partei ist.

Correct answer: gut ausgebildet ist.

Aufgabe 251: 
Wenn man in Deutschland ein Kind schlägt, …

•	geht das niemanden etwas an.
•	geht das nur die Familie etwas an.
•	kann man dafür nicht bestraft werden.
•	kann man dafür bestraft werden. 

Correct answer: kann man dafür bestraft werden.

Aufgabe 252: 
In Deutschland …

•	darf man zur gleichen Zeit nur mit einer Partnerin/einem Partner verheiratet sein. 
•	kann man mehrere Ehepartnerinnen/Ehepartner gleichzeitig haben.
•	darf man nicht wieder heiraten, wenn man einmal verheiratet war.
•	darf eine Frau nicht wieder heiraten, wenn ihr Mann gestorben ist.

Correct answer: darf man zur gleichen Zeit nur mit einer Partnerin/einem Partner verheiratet sein.

Aufgabe 253: 
Wo müssen Sie sich anmelden, wenn Sie in Deutschland umziehen?

•	beim Einwohnermeldeamt 
•	beim Standesamt
•	beim Ordnungsamt
•	beim Gewerbeamt

Correct answer: beim Einwohnermeldeamt

Aufgabe 254: 
In Deutschland dürfen Ehepaare sich scheiden lassen. Meistens müssen sie dazu das "Trennungsjahr" einhalten. Was bedeutet das?

•	Der Scheidungsprozess dauert ein Jahr.
•	Die Ehegatten sind ein Jahr verheiratet, dann ist die Scheidung möglich.
•	Das Besuchsrecht für die Kinder gilt ein Jahr.
•	Die Ehegatten führen mindestens ein Jahr getrennt ihr eigenes Leben. Danach ist die Scheidung möglich. 

Correct answer: Die Ehegatten führen mindestens ein Jahr getrennt ihr eigenes Leben. Danach ist die Scheidung möglich.

Aufgabe 255: 
Bei Erziehungsproblemen können Eltern in Deutschland Hilfe erhalten vom …

•	Ordnungsamt.
•	Schulamt.
•	Jugendamt. 
•	Gesundheitsamt.

Correct answer: Jugendamt.

Aufgabe 256: 
Ein Ehepaar möchte in Deutschland ein Restaurant eröffnen. Was braucht es dazu unbedingt?

•	eine Erlaubnis der Polizei
•	eine Genehmigung einer Partei
•	eine Genehmigung des Einwohnermeldeamt
•	eine Gaststättenerlaubnis von der zuständigen Behörde 

Correct answer: eine Gaststättenerlaubnis von der zuständigen Behörde

Aufgabe 257: 
Eine erwachsene Frau möchte in Deutschland das Abitur nachholen. Das kann sie an …

•	einer Hochschule.
•	einem Abendgymnasium. 
•	einer Hauptschule.
•	einer Privatuniversität.

Correct answer: einem Abendgymnasium.

Aufgabe 258: 
Was darf das Jugendamt in Deutschland?

•	Es entscheidet, welche Schule das Kind besucht.
•	Es kann ein Kind, das geschlagen wird oder hungern muss, aus der Familie nehmen. 
•	Es bezahlt das Kindergeld an die Eltern.
•	Es kontrolliert, ob das Kind einen Kindergarten besucht.

Correct answer: Es kann ein Kind, das geschlagen wird oder hungern muss, aus der Familie nehmen.

Aufgabe 259:
Das Berufsinformationszentrum BIZ bei der Bundesagentur für Arbeit in Deutschland hilft bei der …

•	Rentenberechnung.
•	Lehrstellensuche.
•	Steuererklärung.
•	Krankenversicherung.

Correct answer: Lehrstellensuche.

Aufgabe 260: 
In Deutschland hat ein Kind in der Schule …

•	Recht auf unbegrenzte Freizeit.
•	Wahlfreiheit für alle Fächer.
•	Anspruch auf Schulgeld.
•	Anwesenheitspflicht. 

Correct answer: Anwesenheitspflicht.

Aufgabe 261: 
Ein Mann möchte mit 30 Jahren in Deutschland sein Abitur nachholen. Wo kann er das tun? An …

•	einer Hochschule.
•	einem Abendgymnasium. 
•	einer Hauptschule.
•	einer Privatuniversität.

Correct answer: einem Abendgymnasium.

Aufgabe 262: 
Was bedeutet in Deutschland der Grundsatz der Gleichbehandlung?

•	Niemand darf z.B. wegen einer Behinderung benachteiligt werden. 
•	Man darf andere Personen benachteiligen, wenn ausreichende persönliche Gründe hierfür vorliegen.
•	Niemand darf gegen Personen klagen, wenn sie benachteiligt wurden.
•	Es ist für alle Gesetz, benachteiligten Gruppen jährlich Geld zu spenden.

Correct answer: Niemand darf z.B. wegen einer Behinderung benachteiligt werden.

Aufgabe 263: 
In Deutschland sind Jugendliche ab 14 Jahren strafmündig. Das bedeutet: Jugendliche, die 14 Jahre und älter sind und gegen Strafgesetze verstoßen, …

•	werden bestraft. 
•	werden wie Erwachsene behandelt.
•	teilen die Strafe mit ihren Eltern.
•	werden nicht bestraft.

Correct answer: werden bestraft.

Aufgabe 264: 
Zu welchem Fest tragen Menschen in Deutschland bunte Kostüme und Masken?

•	am Rosenmontag 
•	am Maifeiertag
•	beim Oktoberfest
•	an Pfingsten

Correct answer: am Rosenmontag

Aufgabe 265: 
Wohin muss man in Deutschland zuerst gehen, wenn man heiraten möchte?

•	beim Einwohnermeldeamt
•	beim Ordnungsamt
•	zur Agentur für Arbeit
•	zum Standesamt

Correct answer: zum Standesamt

Aufgabe 266: 
Wann beginnt die gesetzliche Nachtruhe in Deutschland?

•	wenn die Sonne untergeht
•	wenn die Nachbarn schlafen gehen
•	um 0 Uhr, Mitternacht
•	um 22 Uhr 

Correct answer: um 22 Uhr

Aufgabe 267:
Eine junge Frau in Deutschland, 22 Jahre alt, lebt mit ihrem Freund zusammen. Die Eltern der Frau finden das nicht gut [...]. Was können die Eltern tun?

•	Sie müssen die Entscheidung der volljährigen Tochter respektieren.
•	Sie haben das Recht, die Tochter in die elterliche Wohnung zurückzuholen.
•	Sie können zur Polizei gehen und die Tochter anzeigen.
•	Sie suchen einen anderen Mann für die Tochter.

Correct answer: Sie müssen die Entscheidung der volljährigen Tochter respektieren.

Aufgabe 268: 
Eine junge Frau will den Führerschein machen. Was ist richtig?

•	Sie muss mindestens zehn Jahre in Deutschland leben, bevor sie den Führerschein machen kann.
•	Wenn sie kein Deutsch kann, darf sie keinen Führerschein haben.
•	Sie muss den Führerschein in dem Land machen, in dem man ihre Sprache spricht.
•	Sie kann die Theorie-Prüfung vielleicht in ihrer Muttersprache machen. Es gibt mehr als zehn Sprachen zur Auswahl.

Correct answer: Sie kann die Theorie-Prüfung vielleicht in ihrer Muttersprache machen. Es gibt mehr als zehn Sprachen zur Auswahl.

Aufgabe 269: 
In Deutschland haben Kinder ab dem Alter von drei Jahren bis zur Ersteinschulung einen Anspruch auf …

•	monatliches Taschengeld.
•	einen Platz in einem Sportverein.
•	einen Kindergartenplatz. 
•	einen Ferienpass.

Correct answer: einen Kindergartenplatz.

Aufgabe 270: 
Die Volkshochschule in Deutschland ist eine Einrichtung …

•	für den Religionsunterricht.
•	nur für Jugendliche.
•	zur Weiterbildung. 
•	nur für Rentnerinnen und Rentner.

Correct answer: zur Weiterbildung.

Aufgabe 271: 
Was ist in Deutschland ein Brauch zu Weihnachten?

•	bunte Eier verstecken
•	einen Tannenbaum schmücken 
•	sich mit Masken und Kostümen verkleiden
•	Kürbisse vor die Tür stellen

Correct answer: einen Tannenbaum schmücken

Aufgabe 272: 
Welche Lebensform ist in Deutschland nicht erlaubt?

•	Mann und Frau sind geschieden und leben mit neuen Partnern zusammen.
•	Zwei Frauen leben zusammen.
•	Ein alleinerziehender Vater lebt mit seinen zwei Kindern zusammen.
•	Ein Mann ist mit zwei Frauen zur selben Zeit verheiratet. 

Correct answer: Ein Mann ist mit zwei Frauen zur selben Zeit verheiratet.

Aufgabe 273: 
Bei Erziehungsproblemen gehen Sie in Deutschland …

•	zur Ärztin/zum Arzt.
•	zum Gesundheitsamt.
•	zum Einwohnermeldeamt.
•	zum Jugendamt. 

Correct answer: zum Jugendamt.

Aufgabe 274: 
Sie haben in Deutschland absichtlich einen Brief geöffnet, der an eine andere Person adressiert ist. Was haben Sie nicht beachtet?

•	das Schweigerecht
•	das Briefgeheimnis 
•	die Schweigepflicht
•	die Meinungsfreiheit

Correct answer: das Briefgeheimnis

Aufgabe 275: 
Was braucht man in Deutschland für eine Ehescheidung?

•	die Einwilligung der Eltern
•	ein Attest einer Ärztin/eines Arztes
•	die Einwilligung der Kinder
•	die Unterstützung einer Anwältin/eines Anwalts 

Correct answer: die Unterstützung einer Anwältin/eines Anwalts

Aufgabe 276: 
Was sollten Sie tun, wenn Sie von Ihrer Ansprechpartnerin/Ihrem Ansprechpartner in einer deutschen Behörde schlecht behandelt werden?

•	Ich kann nichts tun.
•	Ich muss mir diese Behandlung gefallen lassen.
•	Ich drohe der Person.
•	Ich kann mich bei der Behördenleiterin/beim Behördenleiter beschweren. 

Correct answer: Ich kann mich bei der Behördenleiterin/beim Behördenleiter beschweren.

Aufgabe 277: 
Was ist ein Beispiel für Diskriminierung? Sie bekommt die Stelle nur deshalb nicht, weil sie …

•	kein Englisch spricht.
•	zu hohe Gehaltsvorstellungen hat.
•	keine Erfahrungen in diesem Beruf hat.
•	Mutter ist. 

Correct answer: Mutter ist.

Aufgabe 278: 
Was ist ein Beispiel für Diskriminierung? Er bekommt die Stelle nur deshalb nicht, weil er …

•	im Rollstuhl sitzt. 
•	keine Erfahrung hat.
•	zu hohe Gehaltsvorstellungen hat.
•	kein Englisch spricht.

Correct answer: im Rollstuhl sitzt.

Aufgabe 279: 
In den meisten Mietshäusern in Deutschland gibt es eine "Hausordnung". Was steht in einer solchen "Hausordnung"?

•	Regeln für die Benutzung öffentlicher Verkehrsmittel.
•	alle Mieterinnen und Mieter im Haus.
•	Regeln, an die sich alle Bewohnerinnen und Bewohner halten müssen. 
•	die Adresse des nächsten Ordnungsamtes.

Correct answer: Regeln, an die sich alle Bewohnerinnen und Bewohner halten müssen.

Aufgabe 280: 
Wenn Sie sich in Deutschland gegen einen falschen Steuerbescheid wehren wollen, müssen Sie …

•	nichts machen.
•	den Bescheid wegwerfen.
•	Einspruch einlegen. 
•	warten, bis ein anderer Bescheid kommt.

Correct answer: Einspruch einlegen.

Aufgabe 281: 
Zwei Freunde werden wegen ihrer Hautfarbe nicht ins Schwimmbad gelassen. Welches Recht wird verletzt?

•	Meinungsfreiheit
•	Gleichbehandlung 
•	Versammlungsfreiheit
•	Freizügigkeit

Correct answer: Gleichbehandlung

Aufgabe 282: 
Welches Ehrenamt müssen deutsche Staatsbürgerinnen und Staatsbürger übernehmen, wenn sie dazu aufgefordert werden?

•	Vereinstrainerin/Vereinstrainer
•	Wahlhelferin/Wahlhelfer
•	Bibliotheksaufsicht
•	Lehrerin/Lehrer

Correct answer: Wahlhelferin/Wahlhelfer

Aufgabe 283: 
Was tun Sie, wenn Sie eine falsche Rechnung von einer deutschen Behörde bekommen?

•	Ich lasse die Rechnung liegen.
•	Ich lege Widerspruch bei der Behörde ein. 
•	Ich schicke die Rechnung an die Behörde zurück.
•	Ich gehe mit der Rechnung zum Finanzamt.

Correct answer: Ich lege Widerspruch bei der Behörde ein.

Aufgabe 284: 
Was man für die Arbeit können muss, ändert sich in Zukunft sehr schnell. Was kann man tun?

•	Es ist egal, was man lernt.
•	Erwachsene müssen auch nach der Ausbildung immer weiter lernen. 
•	Kinder lernen in der Schule alles, was im Beruf wichtig ist. Nach der Schule muss man nicht weiter lernen.
•	Alle müssen früher aufhören zu arbeiten, weil sich alles ändert.

Correct answer: Erwachsene müssen auch nach der Ausbildung immer weiter lernen.

Aufgabe 285: 
Frau Frost arbeitet als fest angestellte Mitarbeiterin in einem Büro. Was muss sie nicht von ihrem Gehalt bezahlen?

•	Lohnsteuer
•	Beiträge zur Arbeitslosenversicherung
•	Beiträge zur Renten- und Krankenversicherung
•	Umsatzsteuer 

Correct answer: Umsatzsteuer

Aufgabe 286: 
Welche Organisation in einer Firma hilft den Arbeitnehmerinnen und Arbeitnehmern bei Problemen mit der Arbeitgeberin/dem Arbeitgeber?

•	der Betriebsrat 
•	die Betriebsprüferin/der Betriebsprüfer
•	die Betriebsgruppe
•	das Betriebsmanagement

Correct answer: der Betriebsrat

Aufgabe 287: 
Sie möchten bei einer Firma in Deutschland ihr Arbeitsverhältnis beenden. Was müssen Sie beachten?

•	die Gehaltszahlungen
•	die Arbeitszeit
•	die Kündigungsfrist 
•	die Versicherungspflicht

Correct answer: die Kündigungsfrist

Aufgabe 288: 
Woraus begründet sich Deutschlands besondere Verantwortung für Israel?

•	aus der Mitgliedschaft in der Europäischen Union (EU)
•	aus den nationalsozialistischen Verbrechen gegen Juden 
•	aus dem Grundgesetz der Bundesrepublik Deutschland
•	aus der christlichen Tradition

Correct answer: aus den nationalsozialistischen Verbrechen gegen Juden

Aufgabe 289: 
Was ist ein Beispiel für Diskriminierung? Er bekommt die Stelle nur deshalb nicht, weil …

•	seine Deutschkenntnisse zu gering sind.
•	er zu hohe Gehaltsvorstellungen hat.
•	er eine dunkle Haut hat. 
•	er keine Erfahrungen im Beruf hat.

Correct answer: er eine dunkle Haut hat.

Aufgabe 290: 
Der Fernseher ist kaputt. Was können Sie machen?

•	eine Anzeige schreiben
•	den Fernseher reklamieren 
•	das Gerät ungefragt austauschen
•	die Garantie verlängern

Correct answer: den Fernseher reklamieren

Aufgabe 291: 
Warum muss man in Deutschland bei der Steuererklärung aufschreiben, ob man zu einer Kirche gehört oder nicht?

•	Weil es eine Kirchensteuer gibt, die an die Einkommen- und Lohnsteuer geknüpft ist. 
•	das für die Statistik in Deutschland wichtig ist.
•	man mehr Steuern zahlen muss, wenn man nicht zu einer Kirche gehört.
•	die Kirche für die Steuererklärung verantwortlich ist.

Correct answer: Weil es eine Kirchensteuer gibt, die an die Einkommen- und Lohnsteuer geknüpft ist.

Aufgabe 292: 
Die Menschen in Deutschland leben nach dem Grundsatz der religiösen Toleranz. Was bedeutet das?

•	Es dürfen keine Moscheen gebaut werden.
•	Alle Menschen glauben an Gott.
•	Jeder kann glauben, was er möchte. 
•	Der Staat entscheidet, an welchen Gott die Menschen glauben.

Correct answer: Jeder kann glauben, was er möchte.

Aufgabe 293: 
Was ist in Deutschland ein Brauch zu Ostern?

•	Kürbisse vor die Tür stellen
•	einen Tannenbaum schmücken
•	Eier bemalen 
•	Raketen in die Luft schießen

Correct answer: Eier bemalen

Aufgabe 294: 
Pfingsten ist ein …

•	christlicher Feiertag. 
•	deutscher Gedenktag.
•	internationaler Trauertag.
•	bayerischer Brauch.

Correct answer: christlicher Feiertag.

Aufgabe 295: 
Welche Religion hat die europäische und deutsche Kultur geprägt?

•	der Hinduismus
•	das Christentum 
•	der Buddhismus
•	der Islam

Correct answer: das Christentum

Aufgabe 296: 
In Deutschland nennt man die letzten vier Wochen vor Weihnachten …

•	den Buß- und Bettag.
•	das Erntedankfest.
•	die Adventszeit. 
•	Allerheiligen.

Correct answer: die Adventszeit.

Aufgabe 297: 
Aus welchem Land sind die meisten Migrantinnen und Migranten nach Deutschland gekommen?

•	Italien
•	Polen
•	Marokko
•	Türkei 

Correct answer: Türkei

Aufgabe 298: 
In der DDR lebten vor allem Migrantinnen und Migranten aus …

•	Vietnam, Polen, Mosambik. 
•	Frankreich, Rumänien, Somalia.
•	Chile, Ungarn, Simbabwe.
•	Nordkorea, Mexiko, Ägypten.

Correct answer: Vietnam, Polen, Mosambik.

Aufgabe 299: 
Ausländische Arbeitnehmerinnen und Arbeitnehmer, die in den 50er und 60er Jahren von der Bundesrepublik Deutschland angeworben wurden, nannte man …

•	Schwarzarbeiterinnen/Schwarzarbeiter.
•	Gastarbeiterinnen/Gastarbeiter. 
•	Zeitarbeiterinnen/Zeitarbeiter.
•	Schichtarbeiterinnen/Schichtarbeiter.

Correct answer: Gastarbeiterinnen/Gastarbeiter.

Aufgabe 300: 
Aus welchem Land kamen die ersten Gastarbeiterinnen und Gastarbeiter in die Bundesrepublik Deutschland?

•	Italien 
•	Spanien
•	Portugal
•	Türkei

Correct answer: Italien
"""

def parse_questions(text):
    questions = []
    # Split by "Aufgabe X:"
    parts = re.split(r'Aufgabe (\d+):', text)
    
    # Process in pairs (number, content)
    for i in range(1, len(parts), 2):
        task_number = int(parts[i].strip())
        part_content = parts[i+1].strip()
        
        try:
            lines = [l.strip() for l in part_content.split('\n') if l.strip()]
            if not lines:
                print(f"Warning: Aufgabe {task_number} has no content")
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
                print(f"Warning: Aufgabe {task_number} has no prompt")
                continue
            
            # Extract options
            options = []
            while j < len(lines) and lines[j].startswith('•'):
                option_text = lines[j][1:].strip()
                if option_text:
                    options.append(option_text)
                j += 1
            
            if len(options) != 4:
                print(f"Warning: Aufgabe {task_number} has {len(options)} options instead of 4")
            
            # Extract correct answer
            correct_answer_text = ""
            while j < len(lines):
                if 'Correct answer:' in lines[j]:
                    correct_answer_text = lines[j].split('Correct answer:')[1].strip()
                    break
                j += 1
            
            if not correct_answer_text:
                print(f"Warning: Aufgabe {task_number} has no correct answer specified.")
                continue
            
            # Format options
            formatted_options = []
            found_correct = False
            for opt_text in options:
                is_correct = (opt_text == correct_answer_text)
                if is_correct:
                    found_correct = True
                formatted_options.append({"text": opt_text, "isCorrect": is_correct})
            
            if not found_correct:
                print(f"Warning: Correct answer '{correct_answer_text}' for Aufgabe {task_number} not found in options.")
            
            questions.append({
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
            import traceback
            traceback.print_exc()
            continue
    
    return questions

try:
    print("Parsing questions 201-300...")
    new_questions_201_300 = parse_questions(questions_data_201_300)
    print(f"Parsed {len(new_questions_201_300)} questions for range 201-300")
    
    if len(new_questions_201_300) != 100:
        print(f"Warning: Expected 100 questions for range 201-300, got {len(new_questions_201_300)}")
    
    print("Reading existing file...")
    with open('questions/leben-in-deutschland-300-questions.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    original_count = len(data['questions'])
    print(f"Original file has {original_count} questions")
    
    # Replace questions from index 200 to 299 (which are questions 201 to 300)
    if original_count < 300:
        # If there are fewer than 300 questions, extend the list
        data['questions'] = data['questions'][:200] + new_questions_201_300
    else:
        data['questions'] = data['questions'][:200] + new_questions_201_300 + data['questions'][300:]
    
    print("Writing updated file...")
    with open('questions/leben-in-deutschland-300-questions.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"Successfully replaced questions 201-300. Total questions: {len(data['questions'])}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()








