import json
import re

# The 100 questions provided by the user
questions_data = """
Aufgabe 1: 
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
Correct answer: Religionsunterricht teilnimmt.

Aufgabe 3: 
Deutschland ist ein Rechtsstaat. Was ist damit gemeint?
•	Alle Einwohnerinnen/Einwohner und der Staat müssen sich an die Gesetze halten. 
•	Der Staat muss sich nicht an die Gesetze halten.
•	Nur Deutsche müssen die Gesetze befolgen.
•	Die Gerichte machen die Gesetze.
Correct answer: Alle Einwohnerinnen/Einwohner und der Staat müssen sich an die Gesetze halten.

Aufgabe 4: 
Welches Recht gehört zu den Grundrechten in Deutschland?
•	Waffenbesitz
•	Faustrecht
•	Meinungsfreiheit 
•	Selbstjustiz
Correct answer: Meinungsfreiheit

Aufgabe 5: 
Wahlen in Deutschland sind frei. Was bedeutet das?
•	Man darf Geld annehmen, wenn man dafür eine bestimmte Kandidatin/einen bestimmten Kandidaten wählt.
•	Nur Personen, die noch nie im Gefängnis waren, dürfen wählen.
•	Die Wählerin/der Wähler darf bei der Wahl weder beeinflusst noch zu einer bestimmten Stimmabgabe gezwungen werden und keine Nachteile durch die Wahl haben.
•	Alle wahlberechtigten Personen müssen wählen.
Correct answer: Die Wählerin/der Wähler darf bei der Wahl weder beeinflusst noch zu einer bestimmten Stimmabgabe gezwungen werden und keine Nachteile durch die Wahl haben.

Aufgabe 6: 
Wie heißt die deutsche Verfassung?
•	Volksgesetz
•	Bundesgesetz
•	Deutsches Gesetz
•	Grundgesetz 
Correct answer: Grundgesetz

Aufgabe 7: 
Welches Recht gehört zu den Grundrechten, die nach der deutschen Verfassung garantiert werden? Das Recht auf …
•	Glaubens- und Gewissensfreiheit 
•	Unterhaltung
•	Arbeit
•	Wohnung
Correct answer: Glaubens- und Gewissensfreiheit

Aufgabe 8: 
Was steht nicht im Grundgesetz von Deutschland?
•	Die Würde des Menschen ist unantastbar.
•	Alle sollen gleich viel Geld haben. 
•	Jeder Mensch darf seine Meinung sagen.
•	Alle sind vor dem Gesetz gleich.
Correct answer: Alle sollen gleich viel Geld haben.

Aufgabe 9: 
Welches Grundrecht gilt in Deutschland nur für Ausländerinnen/Ausländer? Das Grundrecht auf …
•	Schutz der Familie
•	Menschenwürde
•	Asyl 
•	Meinungsfreiheit
Correct answer: Asyl

Aufgabe 10: 
Was ist mit dem deutschen Grundgesetz vereinbar?
•	die Prügelstrafe
•	die Folter
•	die Todesstrafe
•	die Geldstrafe 
Correct answer: die Geldstrafe

Aufgabe 11: 
Wie wird die Verfassung der Bundesrepublik Deutschland genannt?
•	Grundgesetz 
•	Bundesverfassung
•	Gesetzbuch
•	Verfassungsvertrag
Correct answer: Grundgesetz

Aufgabe 12: 
Eine Partei im Deutschen Bundestag will die Pressefreiheit abschaffen. Ist das möglich?
•	Ja, wenn mehr als die Hälfte der Abgeordneten im Bundestag dafür sind.
•	Ja, aber dazu müssen zwei Drittel der Abgeordneten im Bundestag dafür sein.
•	Nein, denn die Pressefreiheit ist ein Grundrecht. Sie kann nicht abgeschafft werden. 
•	Nein, denn nur der Bundesrat kann die Pressefreiheit abschaffen.
Correct answer: Nein, denn die Pressefreiheit ist ein Grundrecht. Sie kann nicht abgeschafft werden.

Aufgabe 13: 
Im Parlament steht der Begriff "Opposition" für …
•	die regierenden Parteien.
•	die Fraktion mit den meisten Abgeordneten.
•	alle Parteien, die bei der letzten Wahl die 5%-Hürde erreichen konnten.
•	alle Abgeordneten, die nicht zu der Regierungspartei/den Regierungsparteien gehören. 
Correct answer: alle Abgeordneten, die nicht zu der Regierungspartei/den Regierungsparteien gehören.

Aufgabe 14: 
Meinungsfreiheit in Deutschland heißt, dass ich …
•	Passanten auf der Straße beschimpfen darf.
•	meine Meinung im Internet äußern kann. 
•	Nazi-, Hamas- oder Islamischer Staat-Symbole öffentlich tragen darf.
•	meine Meinung nur dann äußern darf, solange ich der Regierung nicht widerspreche.
Correct answer: meine Meinung im Internet äußern kann.

Aufgabe 15: 
Was verbietet das deutsche Grundgesetz?
•	Militärdienst
•	Zwangsarbeit 
•	freie Berufswahl
•	Arbeit im Ausland
Correct answer: Zwangsarbeit

Aufgabe 16: 
Wann ist die Meinungsfreiheit in Deutschland eingeschränkt?
•	bei der öffentlichen Verbreitung falscher Behauptungen über einzelne Personen 
•	bei Meinungsäußerungen über die Bundesregierung
•	bei Diskussionen über Religionen
•	bei Kritik am Staat
Correct answer: bei der öffentlichen Verbreitung falscher Behauptungen über einzelne Personen

Aufgabe 17: 
Die deutschen Gesetze verbieten …
•	Meinungsfreiheit der Einwohnerinnen und Einwohner.
•	Petitionen der Bürgerinnen und Bürger.
•	Versammlungsfreiheit der Einwohnerinnen und Einwohner.
•	Ungleichbehandlung der Bürgerinnen und Bürger durch den Staat. 
Correct answer: Ungleichbehandlung der Bürgerinnen und Bürger durch den Staat.

Aufgabe 18: 
Welches Grundrecht ist in Artikel 1 des Grundgesetzes der Bundesrepublik Deutschland garantiert?
•	die Unantastbarkeit der Menschenwürde 
•	das Recht auf Leben
•	Religionsfreiheit
•	Meinungsfreiheit
Correct answer: die Unantastbarkeit der Menschenwürde

Aufgabe 19: 
Was versteht man unter dem Recht der "Freizügigkeit" in Deutschland?
•	Man darf sich seinen Wohnort selbst aussuchen. 
•	Man kann seinen Beruf wechseln.
•	Man darf sich für eine andere Religion entscheiden.
•	Man darf sich in der Öffentlichkeit nur leicht bekleidet bewegen.
Correct answer: Man darf sich seinen Wohnort selbst aussuchen.

Aufgabe 20: 
Eine Partei in Deutschland verfolgt das Ziel, eine Diktatur zu errichten. Sie ist dann …
•	tolerant.
•	rechtsstaatlich orientiert.
•	gesetzestreu.
•	verfassungswidrig. 
Correct answer: verfassungswidrig.

Aufgabe 21: 
Welches ist das Wappen der Bundesrepublik Deutschland?
•	Bild 1 
•	Bild 2
•	Bild 3
•	Bild 4
Correct answer: Bild 1

Aufgabe 22: 
Was für eine Staatsform hat Deutschland?
•	Monarchie
•	Diktatur
•	Republik 
•	Fürstentum
Correct answer: Republik

Aufgabe 23: 
In Deutschland sind die meisten Erwerbstätigen …
•	in kleinen Familienunternehmen beschäftigt.
•	ehrenamtlich für ein Bundesland tätig.
•	selbstständig mit einer eigenen Firma tätig.
•	bei einer Firma oder Behörde beschäftigt. 
Correct answer: bei einer Firma oder Behörde beschäftigt.

Aufgabe 24: 
Wie viele Bundesländer hat die Bundesrepublik Deutschland?
•	14
•	15
•	16 
•	17
Correct answer: 16

Aufgabe 25: 
Was ist kein Bundesland der Bundesrepublik Deutschland?
•	Elsass-Lothringen 
•	Nordrhein-Westfalen
•	Mecklenburg-Vorpommern
•	Sachsen-Anhalt
Correct answer: Elsass-Lothringen

Aufgabe 26: 
Deutschland ist …
•	eine kommunistische Republik.
•	ein demokratischer und sozialer Bundesstaat. 
•	eine kapitalistische und soziale Monarchie.
•	ein sozialer und sozialistischer Bundesstaat.
Correct answer: ein demokratischer und sozialer Bundesstaat.

Aufgabe 27: 
Deutschland ist …
•	ein sozialistischer Staat.
•	ein Bundesstaat. 
•	eine Diktatur.
•	eine Monarchie.
Correct answer: ein Bundesstaat.

Aufgabe 28: 
Wer wählt in Deutschland die Abgeordneten zum Bundestag?
•	das Militär
•	die Wirtschaft
•	das wahlberechtigte Volk 
•	die Verwaltung
Correct answer: das wahlberechtigte Volk

Aufgabe 29: 
Welches Tier ist das Wappentier der Bundesrepublik Deutschland?
•	Löwe
•	Adler 
•	Bär
•	Pferd
Correct answer: Adler

Aufgabe 30: 
Was ist kein Merkmal unserer Demokratie?
•	regelmäßige Wahlen
•	Pressezensur 
•	Meinungsfreiheit
•	verschiedene Parteien
Correct answer: Pressezensur

Aufgabe 31: 
Die Zusammenarbeit von Parteien zur Bildung einer Regierung nennt man in Deutschland …
•	Einheit.
•	Koalition. 
•	Ministerium.
•	Fraktion.
Correct answer: Koalition.

Aufgabe 32: 
Was ist keine staatliche Gewalt in Deutschland?
•	Gesetzgebung
•	Regierung
•	Presse 
•	Rechtsprechung
Correct answer: Presse

Aufgabe 33: 
Welche Aussage ist richtig? In Deutschland …
•	sind Staat und Religionsgemeinschaften voneinander getrennt. 
•	bilden die Religionsgemeinschaften den Staat.
•	ist der Staat abhängig von den Religionsgemeinschaften.
•	bilden Staat und Religionsgemeinschaften eine Einheit.
Correct answer: sind Staat und Religionsgemeinschaften voneinander getrennt.

Aufgabe 34: 
Was ist Deutschland nicht?
•	eine Demokratie
•	ein Rechtsstaat
•	eine Monarchie 
•	ein Sozialstaat
Correct answer: eine Monarchie

Aufgabe 35: 
Womit finanziert der deutsche Staat die Sozialversicherung?
•	Kirchensteuer
•	Sozialabgaben 
•	Spendengeldern
•	Vereinsbeiträgen
Correct answer: Sozialabgaben

Aufgabe 36:
Welche Maßnahme schafft in Deutschland soziale Sicherheit?
•	die Krankenversicherung 
•	die Autoversicherung
•	die Gebäudeversicherung
•	die Haftpflichtversicherung
Correct answer: die Krankenversicherung

Aufgabe 37: 
Wie werden die Regierungschefinnen/Regierungschefs der meisten Bundesländer in Deutschland genannt?
•	Erste Ministerin/Erster Minister
•	Premierministerin/Premierminister
•	Senatorin/Senator
•	Ministerpräsidentin/Ministerpräsident 
Correct answer: Ministerpräsidentin/Ministerpräsident

Aufgabe 38: 
Die Bundesrepublik Deutschland ist ein demokratischer und sozialer …
•	Staatenverbund.
•	Bundesstaat. 
•	Staatenbund.
•	Zentralstaat.
Correct answer: Bundesstaat.

Aufgabe 39: 
Was hat jedes deutsche Bundesland?
•	eine eigene Außenministerin/einen eigenen Außenminister
•	eine eigene Währung
•	eine eigene Armee
•	eine eigene Regierung 
Correct answer: eine eigene Regierung

Aufgabe 40: 
Mit welchen Worten beginnt die deutsche Nationalhymne?
•	Völker, hört die Signale …
•	Einigkeit und Recht und Freiheit … 
•	Freude schöner Götterfunken …
•	Deutschland einig Vaterland …
Correct answer: Einigkeit und Recht und Freiheit …

Aufgabe 41: 
Warum gibt es in einer Demokratie mehr als eine Partei?
•	weil dadurch die unterschiedlichen Meinungen der Bürgerinnen und Bürger vertreten werden 
•	damit Bestechung in der Politik begrenzt wird
•	um politische Demonstrationen zu verhindern
•	um wirtschaftlichen Wettbewerb anzuregen
Correct answer: weil dadurch die unterschiedlichen Meinungen der Bürgerinnen und Bürger vertreten werden

Aufgabe 42: 
Wer beschließt in Deutschland ein neues Gesetz?
•	die Regierung
•	das Parlament 
•	die Gerichte
•	die Polizei
Correct answer: das Parlament

Aufgabe 43: 
Wann kann in Deutschland eine Partei verboten werden?
•	wenn ihr Wahlkampf zu teuer ist
•	wenn sie gegen die Verfassung kämpft 
•	wenn sie Kritik am Staatsoberhaupt äußert
•	wenn ihr Programm eine neue Richtung vorschlägt
Correct answer: wenn sie gegen die Verfassung kämpft

Aufgabe 44: 
Wen kann man als Bürgerin/Bürger in Deutschland nicht direkt wählen?
•	Abgeordnete des EU-Parlaments
•	Die Bundespräsidentin/den Bundespräsidenten 
•	Landtagsabgeordnete
•	Bundestagsabgeordnete
Correct answer: Die Bundespräsidentin/den Bundespräsidenten

Aufgabe 45: 
Zu welcher Versicherung gehört die Pflegeversicherung?
•	Sozialversicherung 
•	Unfallversicherung
•	Hausratsversicherung
•	Haftpflicht- und Feuerversicherung
Correct answer: Sozialversicherung

Aufgabe 46: 
Der deutsche Staat hat viele Aufgaben. Welche Aufgabe gehört dazu?
•	Er baut Straßen und Schulen. 
•	Er verkauft Lebensmittel und Kleidung.
•	Er versorgt alle Einwohnerinnen und Einwohner kostenlos mit Zeitungen.
•	Er produziert Autos und Busse.
Correct answer: Er baut Straßen und Schulen.

Aufgabe 47: 
Der deutsche Staat hat viele Aufgaben. Welche Aufgabe gehört nicht dazu?
•	Er bezahlt für alle Staatsangehörigen Urlaubsreisen. 
•	Er zahlt Kindergeld.
•	Er unterstützt Museen.
•	Er fördert Sportlerinnen und Sportler.
Correct answer: Er bezahlt für alle Staatsangehörigen Urlaubsreisen.

Aufgabe 48: 
Welches Organ gehört nicht zu den Verfassungsorganen Deutschlands?
•	der Bundesrat
•	die Bundespräsidentin/der Bundespräsident
•	die Bürgerversammlung 
•	die Regierung
Correct answer: die Bürgerversammlung

Aufgabe 49: 
Wer bestimmt in Deutschland die Schulpolitik?
•	die Lehrer und Lehrerinnen
•	die Bundesländer 
•	das Familienministerium
•	die Universitäten
Correct answer: die Bundesländer

Aufgabe 50: 
Die Wirtschaftsform in Deutschland nennt man …
•	freie Zentralwirtschaft.
•	soziale Marktwirtschaft.
•	gelenkte Zentralwirtschaft.
•	Planwirtschaft.
Correct answer: soziale Marktwirtschaft.

Aufgabe 51: 
Zu einem demokratischen Rechtsstaat gehört es nicht, dass …
•	Menschen sich kritisch über die Regierung äußern können.
•	Bürger friedlich demonstrieren gehen dürfen.
•	Menschen von einer Privatpolizei ohne Grund verhaftet werden. 
•	jemand ein Verbrechen begeht und deshalb verhaftet wird.
Correct answer: Menschen von einer Privatpolizei ohne Grund verhaftet werden.

Aufgabe 52: 
Was bedeutet "Volkssouveränität"? Alle Staatsgewalt geht vom ...
•	Volke aus. 
•	Bundestag aus.
•	preußischen König aus.
•	Bundesverfassungsgericht aus.
Correct answer: Volke aus.

Aufgabe 53: 
Was bedeutet "Rechtsstaat" in Deutschland?
•	Der Staat hat Recht.
•	Es gibt nur rechte Parteien.
•	Die Bürgerinnen und Bürger entscheiden über Gesetze.
•	Der Staat muss die Gesetze einhalten. 
Correct answer: Der Staat muss die Gesetze einhalten.

Aufgabe 54: 
Was ist keine staatliche Gewalt in Deutschland?
•	Legislative
•	Judikative
•	Exekutive
•	Direktive 
Correct answer: Direktive

Aufgabe 55:
Was zeigt dieses Bild?
•	den Bundestagssitz in Berlin 
•	das Bundesverfassungsgericht in Karlsruhe
•	das Bundesratsgebäude in Berlin
•	das Bundeskanzleramt in Berlin
Correct answer: den Bundestagssitz in Berlin

Aufgabe 56: 
Welches Amt gehört in Deutschland zur Gemeindeverwaltung?
•	Pfarramt
•	Ordnungsamt
•	Finanzamt
•	Auswärtiges Amt
Correct answer: Ordnungsamt

Aufgabe 57: 
Wer wird meistens zur Präsidentin/zum Präsidenten des Deutschen Bundestages gewählt?
•	die/der älteste Abgeordnete im Parlament
•	die Ministerpräsidentin/der Ministerpräsident des größten Bundeslandes
•	eine ehemalige Bundeskanzlerin/ein ehemaliger Bundeskanzler
•	eine Abgeordnete/ein Abgeordneter der stärksten Fraktion 
Correct answer: eine Abgeordnete/ein Abgeordneter der stärksten Fraktion

Aufgabe 58: 
Wer ernennt in Deutschland die Ministerinnen/die Minister der Bundesregierung?
•	die Präsidentin/der Präsident des Bundesverfassungsgerichtes
•	die Bundespräsidentin/der Bundespräsident 
•	die Bundesratspräsidentin/der Bundesratspräsident
•	die Bundestagspräsidentin/der Bundestagspräsident
Correct answer: die Bundespräsidentin/der Bundespräsident

Aufgabe 59: 
Vor wie vielen Jahren gab es erstmals eine jüdische Gemeinde auf dem Gebiet des heutigen Deutschlands?
•	vor etwa 300 Jahren
•	vor etwa 700 Jahren
•	vor etwa 1150 Jahren
•	vor etwa 1700 Jahren 
Correct answer: vor etwa 1700 Jahren

Aufgabe 60: 
In Deutschland gehören der Bundestag und der Bundesrat zur …
•	Exekutive.
•	Legislative. 
•	Direktive.
•	Judikative.
Correct answer: Legislative.

Aufgabe 61: 
Was bedeutet "Volkssouveränität"?
•	Die Königin/der König herrscht über das Volk.
•	Das Bundesverfassungsgericht steht über der Verfassung.
•	Die Interessenverbände üben die Souveränität zusammen mit der Regierung aus.
•	Die Staatsgewalt geht vom Volke aus. 
Correct answer: Die Staatsgewalt geht vom Volke aus.

Aufgabe 62: 
Wenn das Parlament eines deutschen Bundeslandes gewählt wird, nennt man das …
•	Kommunalwahl
•	Landtagswahl 
•	Europawahl
•	Bundestagswahl
Correct answer: Landtagswahl

Aufgabe 63: 
Was gehört in Deutschland nicht zur Exekutive?
•	die Polizei
•	die Gerichte 
•	das Finanzamt
•	die Ministerien
Correct answer: die Gerichte

Aufgabe 64: 
Die Bundesrepublik Deutschland ist heute gegliedert in …
•	vier Besatzungszonen.
•	einen Oststaat und einen Weststaat.
•	16 Kantone.
•	Bund, Länder und Kommunen. 
Correct answer: Bund, Länder und Kommunen.

Aufgabe 65: 
Es gehört nicht zu den Aufgaben des Deutschen Bundestages, …
•	Gesetze zu entwerfen.
•	die Bundesregierung zu kontrollieren.
•	die Bundeskanzlerin/den Bundeskanzler zu wählen.
•	das Bundeskabinett zu bilden. 
Correct answer: das Bundeskabinett zu bilden.

Aufgabe 66: 
Welche Städte haben die größten jüdischen Gemeinden in Deutschland?
•	Berlin und München 
•	Hamburg und Essen
•	Nürnberg und Stuttgart
•	Worms und Speyer
Correct answer: Berlin und München

Aufgabe 67: 
Was ist in Deutschland vor allem eine Aufgabe der Bundesländer?
•	Verteidigungspolitik
•	Außenpolitik
•	Wirtschaftspolitik
•	Schulpolitik
Correct answer: Schulpolitik

Aufgabe 68: 
Warum kontrolliert der Staat in Deutschland das Schulwesen?
•	weil es in Deutschland nur staatliche Schulen gibt
•	weil alle Schülerinnen und Schüler einen Schulabschluss haben müssen
•	weil es in den Bundesländern verschiedene Schulen gibt
•	weil es nach dem Grundgesetz seine Aufgabe ist 
Correct answer: weil es nach dem Grundgesetz seine Aufgabe ist

Aufgabe 69: 
Die Bundesrepublik Deutschland hat einen dreistufigen Verwaltungsaufbau. Wie heißt die unterste politische Stufe?
•	Stadträte
•	Landräte
•	Gemeinden 
•	Bezirksämter
Correct answer: Gemeinden

Aufgabe 70: 
Was gehört zu den Aufgaben der deutschen Bundespräsidentin/des deutschen Bundespräsidenten?
•	Sie/Er führt die Regierungsgeschäfte.
•	Sie/Er kontrolliert die Regierungspartei.
•	Sie/Er wählt die Ministerinnen/Minister aus.
•	Sie/Er schlägt die Kanzlerin/den Kanzler zur Wahl vor. 
Correct answer: Sie/Er schlägt die Kanzlerin/den Kanzler zur Wahl vor.

Aufgabe 71: 
Wo hält sich die deutsche Bundeskanzlerin/der deutsche Bundeskanzler am häufigsten auf? Am häufigsten ist sie/er …
•	in Bonn, weil sich dort das Bundeskanzleramt und der Bundestag befinden.
•	auf Schloss Meseberg, dem Gästehaus der Bundesregierung, um Staatsgäste zu empfangen.
•	auf Schloss Bellevue, dem Amtssitz der Bundespräsidentin/des Bundespräsidenten, um Staatsgäste zu empfangen.
•	in Berlin, weil sich dort das Bundeskanzleramt und der Bundestag befinden. 
Correct answer: in Berlin, weil sich dort das Bundeskanzleramt und der Bundestag befinden.

Aufgabe 72: 
Wie heißt die jetzige Bundeskanzlerin/der jetzige Bundeskanzler von Deutschland?
•	Gerhard Schröder
•	Angela Merkel
•	Ursula von der Leyen
•	Friedrich Merz 
Correct answer: Friedrich Merz

Aufgabe 73: 
Die beiden größten Fraktionen im Deutschen Bundestag heißen zurzeit …
•	CDU/CSU und AfD. 
•	Die Linke und Bündnis 90/Die Grünen.
•	Bündnis 90/Die Grünen und SPD.
•	Die Linke und CDU/CSU.
Correct answer: CDU/CSU und AfD.

Aufgabe 74: 
Wie heißt das Parlament für ganz Deutschland?
•	Bundesversammlung
•	Volkskammer
•	Bundestag 
•	Bundesgerichtshof
Correct answer: Bundestag

Aufgabe 75: 
Wie heißt Deutschlands heutiges Staatsoberhaupt?
•	Frank-Walter Steinmeier 
•	Bärbel Bas
•	Bodo Ramelow
•	Joachim Gauck
Correct answer: Frank-Walter Steinmeier

Aufgabe 76: 
Was bedeutet die Abkürzung CDU in Deutschland?
•	Christliche Deutsche Union
•	Club Deutscher Unternehmer
•	Christlicher Deutscher Umweltschutz
•	Christlich Demokratische Union 
Correct answer: Christlich Demokratische Union

Aufgabe 77: 
Was ist die Bundeswehr?
•	die deutsche Polizei
•	ein deutscher Hafen
•	eine deutsche Bürgerinitiative
•	die deutsche Armee 
Correct answer: die deutsche Armee

Aufgabe 78: 
Was bedeutet die Abkürzung SPD?
•	Sozialistische Partei Deutschlands
•	Sozialpolitische Partei Deutschlands
•	Sozialdemokratische Partei Deutschlands 
•	Sozialgerechte Partei Deutschlands
Correct answer: Sozialdemokratische Partei Deutschlands

Aufgabe 79: 
Was bedeutet die Abkürzung FDP in Deutschland?
•	Friedliche Demonstrative Partei
•	Freie Deutschland Partei
•	Führende Demokratische Partei
•	Freie Demokratische Partei 
Correct answer: Freie Demokratische Partei

Aufgabe 80: 
Welches Gericht in Deutschland ist zuständig für die Auslegung des Grundgesetzes?
•	Oberlandesgericht
•	Amtsgericht
•	Bundesverfassungsgericht 
•	Verwaltungsgericht
Correct answer: Bundesverfassungsgericht

Aufgabe 81: 
Wer wählt die Bundeskanzlerin/den Bundeskanzler in Deutschland?
•	der Bundesrat
•	die Bundesversammlung
•	das Volk
•	der Bundestag 
Correct answer: der Bundestag

Aufgabe 82: 
Wer leitet das deutsche Bundeskabinett?
•	die Bundestagspräsidentin/der Bundestagspräsident
•	die Bundespräsidentin/der Bundespräsident
•	die Bundesratspräsidentin/der Bundesratspräsident
•	die Bundeskanzlerin/der Bundeskanzler 
Correct answer: die Bundeskanzlerin/der Bundeskanzler

Aufgabe 83: 
Wer wählt die deutsche Bundeskanzlerin/den deutschen Bundeskanzler?
•	das Volk
•	die Bundesversammlung
•	der Bundestag 
•	die Bundesregierung
Correct answer: der Bundestag

Aufgabe 84: 
Welche Hauptaufgabe hat die deutsche Bundespräsidentin/der deutsche Bundespräsident? Sie/Er …
•	regiert das Land.
•	entwirft die Gesetze.
•	repräsentiert das Land. 
•	überwacht die Einhaltung der Gesetze.
Correct answer: repräsentiert das Land.

Aufgabe 85: Wer bildet den deutschen Bundesrat?
•	die Abgeordneten des Bundestages
•	die Ministerinnen und Minister der Bundesregierung
•	die Regierungsvertreter der Bundesländer 
•	die Parteimitglieder
Correct answer: die Regierungsvertreter der Bundesländer

Aufgabe 86: 
Wer wählt in Deutschland die Bundespräsidentin/den Bundespräsidenten?
•	die Bundesversammlung 
•	der Bundesrat
•	das Bundesparlament
•	das Bundesverfassungsgericht
Correct answer: die Bundesversammlung

Aufgabe 87: 
Wer ist das Staatsoberhaupt der Bundesrepublik Deutschland?
•	die Bundeskanzlerin/der Bundeskanzler
•	die Bundespräsidentin/der Bundespräsident 
•	die Bundesratspräsidentin/der Bundesratspräsident
•	die Bundestagspräsidentin/der Bundestagspräsident
Correct answer: die Bundespräsidentin/der Bundespräsident

Aufgabe 88: 
Die parlamentarische Opposition im Deutschen Bundestag …
•	kontrolliert die Regierung. 
•	entscheidet, wer Bundesministerin/Bundesminister wird.
•	bestimmt, wer im Bundesrat sitzt.
•	schlägt die Regierungschefinnen/Regierungschefs der Länder vor.
Correct answer: kontrolliert die Regierung.

Aufgabe 89: 
Wie nennt man in Deutschland die Vereinigung von Abgeordneten einer Partei im Parlament?
•	Verband
•	Ältestenrat
•	Fraktion
•	Opposition
Correct answer: Fraktion

Aufgabe 90: 
Die deutschen Bundesländer wirken an der Gesetzgebung des Bundes mit durch …
•	den Bundesrat.
•	die Bundesversammlung.
•	den Bundestag.
•	die Bundesregierung.
Correct answer: den Bundesrat.

Aufgabe 91: 
In Deutschland kann ein Regierungswechsel in einem Bundesland Auswirkungen auf die Bundespolitik haben. Das Regieren wird …
•	schwieriger, wenn sich dadurch die Mehrheit im Bundestag ändert.
•	leichter, wenn dadurch neue Parteien in den Bundesrat kommen.
•	schwieriger, wenn dadurch die Mehrheit im Bundesrat verändert wird. 
•	leichter, wenn es sich um ein reiches Bundesland handelt.
Correct answer: schwieriger, wenn dadurch die Mehrheit im Bundesrat verändert wird.

Aufgabe 92: 
Was bedeutet die Abkürzung CSU in Deutschland?
•	Christlich Sichere Union
•	Christlich Süddeutsche Union
•	Christlich Sozialer Unternehmerverband
•	Christlich Soziale Union 
Correct answer: Christlich Soziale Union

Aufgabe 93: 
Je mehr "Zweitstimmen" eine Partei bei einer Bundestagswahl bekommt, desto …
•	weniger Erststimmen kann sie haben.
•	mehr Direktkandidaten der Partei ziehen ins Parlament ein.
•	größer ist das Risiko, eine Koalition bilden zu müssen.
•	mehr Sitze erhält die Partei im Parlament. 
Correct answer: mehr Sitze erhält die Partei im Parlament.

Aufgabe 94: 
Ab welchem Alter darf man in Deutschland an der Wahl zum Deutschen Bundestag teilnehmen?
•	16
•	18 
•	21
•	23
Correct answer: 18

Aufgabe 95: 
Was gilt für die meisten Kinder in Deutschland?
•	Wahlpflicht
•	Schulpflicht 
•	Schweigepflicht
•	Religionspflicht
Correct answer: Schulpflicht

Aufgabe 96: 
Wie kann jemand, der den Holocaust leugnet, bestraft werden?
•	Kürzung sozialer Leistungen
•	bis zu 100 Sozialstunden
•	gar nicht, Holocaustleugnung ist erlaubt
•	mit Freiheitsstrafe bis zu fünf Jahren oder mit Geldstrafe 
Correct answer: mit Freiheitsstrafe bis zu fünf Jahren oder mit Geldstrafe

Aufgabe 97: 
Was bezahlt man in Deutschland automatisch, wenn man fest angestellt ist?
•	Sozialversicherung 
•	Sozialhilfe
•	Kindergeld
•	Wohngeld
Correct answer: Sozialversicherung

Aufgabe 98: 
Wenn Abgeordnete im Deutschen Bundestag ihre Fraktion wechseln, …
•	dürfen sie nicht mehr an den Sitzungen des Parlaments teilnehmen.
•	kann die Regierung ihre Mehrheit verlieren. 
•	muss die Bundespräsidentin/der Bundespräsident zuvor ihr/sein Einverständnis geben.
•	dürfen die Wählerinnen/Wähler dieser Abgeordneten noch einmal wählen.
Correct answer: kann die Regierung ihre Mehrheit verlieren.

Aufgabe 99: 
Wer bezahlt in Deutschland die Sozialversicherungen?
•	Arbeitgeberinnen/Arbeitgeber und Arbeitnehmerinnen/Arbeitnehmer 
•	nur Arbeitnehmerinnen/Arbeitnehmer
•	alle Staatsangehörigen
•	nur Arbeitgeberinnen/Arbeitgeber
Correct answer: Arbeitgeberinnen/Arbeitgeber und Arbeitnehmerinnen/Arbeitnehmer

Aufgabe 100: 
Was gehört nicht zur gesetzlichen Sozialversicherung?
•	die Lebensversicherung 
•	die gesetzliche Rentenversicherung
•	die Arbeitslosenversicherung
•	die Pflegeversicherung
Correct answer: die Lebensversicherung
"""

def parse_questions(text):
    questions = []
    # Split by "Aufgabe"
    parts = re.split(r'Aufgabe \d+:', text)
    
    for idx, part in enumerate(parts[1:], 1):  # Skip first empty part
        try:
            lines = [l.strip() for l in part.strip().split('\n') if l.strip()]
            if not lines:
                print(f"Warning: Aufgabe {idx} has no content")
                continue
                
            # Find the question prompt (lines until first bullet)
            prompt_lines = []
            i = 0
            while i < len(lines) and not lines[i].startswith('•'):
                if not lines[i].startswith('Correct answer'):
                    prompt_lines.append(lines[i])
                i += 1
            
            prompt = ' '.join(prompt_lines).strip()
            if not prompt:
                print(f"Warning: Aufgabe {idx} has no prompt")
                continue
            
            # Get options
            options = []
            while i < len(lines) and lines[i].startswith('•'):
                option_text = lines[i][1:].strip()  # Remove bullet
                if option_text:
                    options.append(option_text)
                i += 1
            
            if len(options) != 4:
                print(f"Warning: Aufgabe {idx} has {len(options)} options instead of 4")
            
            # Get correct answer
            correct_answer = ""
            while i < len(lines):
                if 'Correct answer:' in lines[i]:
                    correct_answer = lines[i].split('Correct answer:')[1].strip()
                    break
                i += 1
            
            if not correct_answer:
                print(f"Warning: Aufgabe {idx} has no correct answer")
                continue
            
            # Create options with isCorrect
            formatted_options = []
            for opt in options:
                # Normalize comparison - remove extra spaces
                is_correct = opt.strip() == correct_answer.strip()
                formatted_options.append({
                    "text": opt,
                    "isCorrect": is_correct
                })
            
            # Verify at least one option is correct
            if not any(opt["isCorrect"] for opt in formatted_options):
                print(f"Warning: Aufgabe {idx} - no matching correct answer found. Looking for: '{correct_answer}'")
                print(f"  Options: {[opt['text'] for opt in formatted_options]}")
            
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
            print(f"Error parsing Aufgabe {idx}: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    return questions

try:
    # Parse questions
    print("Parsing questions...")
    new_questions = parse_questions(questions_data)
    print(f"Parsed {len(new_questions)} questions")
    
    if len(new_questions) != 100:
        print(f"Warning: Expected 100 questions, got {len(new_questions)}")
    
    # Read existing file
    print("Reading existing file...")
    with open('questions/leben-in-deutschland-300-questions.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    original_count = len(data['questions'])
    print(f"Original file has {original_count} questions")
    
    # Replace first 100 questions
    data['questions'] = new_questions + data['questions'][100:]
    
    # Write back
    print("Writing updated file...")
    with open('questions/leben-in-deutschland-300-questions.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"Successfully replaced first 100 questions. Total questions: {len(data['questions'])}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

