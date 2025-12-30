import json
import re

# الأسئلة الجديدة من 101 إلى 200
questions_text = """
Aufgabe 101: 
Gewerkschaften sind Interessenverbände der …

•	Jugendlichen.
•	Arbeitnehmerinnen und Arbeitnehmer. 
•	Rentnerinnen und Rentner.
•	Arbeitgeberinnen und Arbeitgeber.

Correct answer: Arbeitnehmerinnen und Arbeitnehmer.

Aufgabe 102: 
Womit kann man in der Bundesrepublik Deutschland geehrt werden, wenn man auf politischem, wirtschaftlichem, kulturellem, geistigem oder sozialem Gebiet eine besondere Leistung erbracht hat? Mit dem …

•	Bundesverdienstkreuz 
•	Bundesadler
•	Vaterländischen Verdienstorden
•	Ehrentitel "Held der Deutschen Demokratischen Republik"

Correct answer: Bundesverdienstkreuz

Aufgabe 103: 
Was wird in Deutschland als "Ampelkoalition" bezeichnet? Die Zusammenarbeit …

•	der Bundestagsfraktionen von CDU und CSU
•	von SPD, FDP und Bündnis 90/Die Grünen in einer Regierung
•	von CSU, Die LINKE und Bündnis 90/Die Grünen in einer Regierung
•	der Bundestagsfraktionen von CDU und SPD

Correct answer: von SPD, FDP und Bündnis 90/Die Grünen in einer Regierung

Aufgabe 104: 
Eine Frau in Deutschland verliert ihre Arbeit. Was darf nicht der Grund für diese Entlassung sein?

•	Die Frau ist lange krank und arbeitsunfähig.
•	Die Frau kam oft zu spät zur Arbeit.
•	Die Frau erledigt private Sachen während der Arbeitszeit.
•	Die Frau bekommt ein Kind und ihr Chef weiß das. 

Correct answer: Die Frau bekommt ein Kind und ihr Chef weiß das.

Aufgabe 105: 
Was ist eine Aufgabe von Wahlhelferinnen/Wahlhelfern in Deutschland?

•	Sie helfen alten Menschen bei der Stimmabgabe in der Wahlkabine.
•	Sie schreiben die Wahlbenachrichtigungen vor der Wahl.
•	Sie geben Zwischenergebnisse an die Medien weiter.
•	Sie zählen die Stimmen nach dem Ende der Wahl.

Correct answer: Sie zählen die Stimmen nach dem Ende der Wahl.

Aufgabe 106: 
In Deutschland helfen ehrenamtliche Wahlhelferinnen und Wahlhelfer bei den Wahlen. Was ist eine Aufgabe von Wahlhelferinnen/Wahlhelfern?

•	Sie helfen Kindern und alten Menschen beim Wählen.
•	Sie schreiben Karten und Briefe mit der Angabe des Wahllokals.
•	Sie geben Zwischenergebnisse an Journalisten weiter.
•	Sie zählen die Stimmen nach dem Ende der Wahl. 

Correct answer: Sie zählen die Stimmen nach dem Ende der Wahl.

Aufgabe 107: 
Für wie viele Jahre wird der Bundestag in Deutschland gewählt?

•	2 Jahre
•	4 Jahre 
•	6 Jahre
•	8 Jahre

Correct answer: 4 Jahre

Aufgabe 108: 
Bei einer Bundestagswahl in Deutschland darf jede/jeder wählen, die/der …

•	in der Bundesrepublik Deutschland wohnt und wählen möchte.
•	Bürgerin/Bürger der Bundesrepublik Deutschland ist und mindestens 18 Jahre alt ist. 
•	seit mindestens 3 Jahren in der Bundesrepublik Deutschland lebt.
•	Bürgerin/Bürger der Bundesrepublik Deutschland ist und mindestens 21 Jahre alt ist.

Correct answer: Bürgerin/Bürger der Bundesrepublik Deutschland ist und mindestens 18 Jahre alt ist.

Aufgabe 109: 
Wie oft gibt es normalerweise Bundestagswahlen in Deutschland?

•	alle drei Jahre
•	alle vier Jahre 
•	alle fünf Jahre
•	alle sechs Jahre

Correct answer: alle vier Jahre

Aufgabe 110: 
Für wie viele Jahre wird der Bundestag in Deutschland gewählt?

•	2 Jahre
•	3 Jahre
•	4 Jahre 
•	5 Jahre

Correct answer: 4 Jahre

Aufgabe 111: 
Welche Handlungen mit Bezug auf den Staat Israel sind in Deutschland verboten?

•	die Politik Israels öffentlich kritisieren
•	das Aufhängen einer israelischen Flagge auf dem Privatgrundstück
•	eine Diskussion über die Politik Israels
•	der öffentliche Aufruf zur Vernichtung Israels 

Correct answer: der öffentliche Aufruf zur Vernichtung Israels

Aufgabe 112: 
Die Wahlen in Deutschland sind …

•	speziell.
•	geheim. 
•	berufsbezogen.
•	geschlechtsabhängig.

Correct answer: geheim.

Aufgabe 113: 
Wahlen in Deutschland gewinnt die Partei, die …

•	die meisten Stimmen bekommt. 
•	die meisten Männer mehrheitlich gewählt haben.
•	die meisten Stimmen bei den Arbeiterinnen/Arbeitern bekommen hat.
•	die meisten Erststimmen für ihre Kanzlerkandidatin/ihren Kanzlerkandidaten erhalten hat.

Correct answer: die meisten Stimmen bekommt.

Aufgabe 114: 
An demokratischen Wahlen in Deutschland teilzunehmen ist …

•	eine Pflicht.
•	ein Recht. 
•	ein Zwang.
•	eine Last.

Correct answer: ein Recht.

Aufgabe 115: 
Was bedeutet "aktives Wahlrecht" in Deutschland?

•	Man kann gewählt werden.
•	Man muss wählen gehen.
•	Man kann wählen. 
•	Man muss zur Auszählung der Stimmen gehen.

Correct answer: Man kann wählen.

Aufgabe 116: 
Wenn Sie bei einer Bundestagswahl in Deutschland wählen dürfen, heißt das …

•	aktive Wahlkampagne.
•	aktives Wahlverfahren.
•	aktiver Wahlkampf.
•	aktives Wahlrecht. 

Correct answer: aktives Wahlrecht.

Aufgabe 117: 
Wie viel Prozent der Zweitstimmen müssen Parteien mindestens bekommen, um in den Deutschen Bundestag gewählt zu werden?

•	3%
•	4%
•	5%
•	6%

Correct answer: 5%

Aufgabe 118: 
Wer darf bei den rund 40 jüdischen Makkabi-Sportvereinen Mitglied werden?

•	nur Deutsche
•	nur Israelis
•	nur religiöse Menschen
•	alle Menschen 

Correct answer: alle Menschen

Aufgabe 119: 
Wahlen in Deutschland sind frei. Was bedeutet das?

•	Alle verurteilten Straftäterinnen/Straftäter dürfen nicht wählen.
•	Wenn ich wählen gehen möchte, muss meine Arbeitgeberin/mein Arbeitgeber mir frei geben.
•	Jede Person kann ohne Zwang entscheiden, ob sie wählen möchte und wen sie wählen möchte. 
•	Ich kann frei entscheiden, wo ich wählen gehen möchte.

Correct answer: Jede Person kann ohne Zwang entscheiden, ob sie wählen möchte und wen sie wählen möchte.

Aufgabe 120: 
Das Wahlsystem in Deutschland ist ein …

•	Zensuswahlrecht.
•	Dreiklassenwahlrecht.
•	Mehrheits- und Verhältniswahlrecht. 
•	allgemeines Männerwahlrecht.

Correct answer: Mehrheits- und Verhältniswahlrecht.

Aufgabe 121: 
Eine Partei möchte in den Deutschen Bundestag. Sie muss aber einen Mindestanteil an Wählerstimmen haben. Das heißt …

•	5%-Hürde.
•	Zulassungsgrenze.
•	Basiswert.
•	Richtlinie.

Correct answer: 5%-Hürde.

Aufgabe 122: 
Welchem Grundsatz unterliegen Wahlen in Deutschland? Wahlen in Deutschland sind …

•	frei, gleich, geheim. 
•	offen, sicher, frei.
•	geschlossen, gleich, sicher.
•	sicher, offen, freiwillig.

Correct answer: frei, gleich, geheim.

Aufgabe 123: 
Was ist in Deutschland die "5%-Hürde"?

•	Abstimmungsregelung im Bundestag für kleine Parteien
•	Anwesenheitskontrolle im Bundestag für Abstimmungen
•	Mindestanteil an Wählerstimmen, um ins Parlament zu kommen 
•	Anwesenheitskontrolle im Bundesrat für Abstimmungen

Correct answer: Mindestanteil an Wählerstimmen, um ins Parlament zu kommen

Aufgabe 124: 
Die Bundestagswahl in Deutschland ist die Wahl …

•	der Bundeskanzlerin/des Bundeskanzlers.
•	der Parlamente der Länder.
•	des Parlaments für Deutschland. 
•	der Bundespräsidentin/des Bundespräsidenten.

Correct answer: des Parlaments für Deutschland.

Aufgabe 125: 
In einer Demokratie ist eine Funktion von regelmäßigen Wahlen, …

•	die Bürgerinnen und Bürger zu zwingen, ihre Stimme abzugeben.
•	nach dem Willen der Wählermehrheit den Wechsel der Regierung zu ermöglichen. 
•	im Land bestehende Gesetze beizubehalten.
•	den Armen mehr Macht zu geben.

Correct answer: nach dem Willen der Wählermehrheit den Wechsel der Regierung zu ermöglichen.

Aufgabe 126: 
Was bekommen wahlberechtigte Bürgerinnen und Bürger in Deutschland vor einer Wahl?

•	eine Wahlbenachrichtigung von der Gemeinde
•	eine Wahlerlaubnis von der Bundespräsidentin/von dem Bundespräsidenten
•	eine Benachrichtigung von der Bundesversammlung
•	eine Benachrichtigung vom Pfarramt

Correct answer: eine Wahlbenachrichtigung von der Gemeinde

Aufgabe 127: 
Warum gibt es die 5%-Hürde im Wahlgesetz der Bundesrepublik Deutschland? Es gibt sie, weil …

•	die Programme von vielen kleinen Parteien viele Gemeinsamkeiten haben.
•	die Bürgerinnen und Bürger bei vielen kleinen Parteien die Orientierung verlieren können.
•	viele kleine Parteien die Regierungsbildung erschweren. 
•	die kleinen Parteien nicht so viel Geld haben, um die Politikerinnen und Politiker zu bezahlen.

Correct answer: viele kleine Parteien die Regierungsbildung erschweren.

Aufgabe 128: 
Parlamentsmitglieder, die von den Bürgerinnen und Bürgern gewählt werden, nennt man …

•	Abgeordnete. 
•	Kanzlerinnen/Kanzler.
•	Botschafterinnen/Botschafter.
•	Ministerpräsidentinnen/Ministerpräsidenten.

Correct answer: Abgeordnete.

Aufgabe 129: 
Vom Volk gewählt wird in Deutschland …

•	die Bundeskanzlerin/der Bundeskanzler.
•	die Ministerpräsidentin/der Ministerpräsident eines Bundeslandes.
•	der Bundestag. 
•	die Bundespräsidentin/der Bundespräsident.

Correct answer: der Bundestag.

Aufgabe 130: 
Welcher Stimmzettel wäre bei einer Bundestagswahl gültig?

•	1 
•	2
•	3
•	4

Correct answer: 1

Aufgabe 131: 
In Deutschland ist eine Bürgermeisterin/ein Bürgermeister …

•	die Leiterin/der Leiter einer Schule.
•	die Chefin/der Chef einer Bank.
•	das Oberhaupt einer Gemeinde. 
•	die/der Vorsitzende einer Partei.

Correct answer: das Oberhaupt einer Gemeinde.

Aufgabe 132: 
Viele Menschen in Deutschland arbeiten in ihrer Freizeit ehrenamtlich. Was bedeutet das?

•	Sie arbeiten als Soldatinnen/Soldaten.
•	Sie arbeiten freiwillig und unbezahlt in Vereinen und Verbänden. 
•	Sie arbeiten in der Bundesregierung.
•	Sie arbeiten in einem Krankenhaus und verdienen dabei Geld.

Correct answer: Sie arbeiten freiwillig und unbezahlt in Vereinen und Verbänden.

Aufgabe 133: 
Was ist bei Bundestags- und Landtagswahlen in Deutschland erlaubt?

•	Der Ehemann wählt für seine Frau mit.
•	Man kann durch Briefwahl seine Stimme abgeben.
•	Man kann am Wahltag telefonisch seine Stimme abgeben.
•	Kinder ab dem Alter von 14 Jahren dürfen wählen.

Correct answer: Man kann durch Briefwahl seine Stimme abgeben.

Aufgabe 134: 
Man will die Buslinie abschaffen, mit der Sie immer zur Arbeit fahren. Was können Sie machen, um die Buslinie zu erhalten?

•	Ich beteilige mich an einer Bürgerinitiative für die Erhaltung der Buslinie oder gründe selber eine Initiative. 
•	Ich werde Mitglied in einem Sportverein und trainiere Radfahren.
•	Ich wende mich an das Finanzamt, weil ich als Steuerzahlerin/Steuerzahler ein Recht auf die Buslinie habe.
•	Ich schreibe einen Brief an das Forstamt der Gemeinde.

Correct answer: Ich beteilige mich an einer Bürgerinitiative für die Erhaltung der Buslinie oder gründe selber eine Initiative.

Aufgabe 135: 
Wen vertreten die Gewerkschaften in Deutschland?

•	große Unternehmen
•	kleine Unternehmen
•	Selbstständige
•	Arbeitnehmerinnen und Arbeitnehmer 

Correct answer: Arbeitnehmerinnen und Arbeitnehmer

Aufgabe 136: 
Sie gehen in Deutschland zum Arbeitsgericht bei …

•	falscher Nebenkostenabrechnung.
•	ungerechtfertigter Kündigung durch Ihre Chefin/Ihren Chef. 
•	Problemen mit den Nachbarinnen/Nachbarn.
•	Schwierigkeiten nach einem Verkehrsunfall.

Correct answer: ungerechtfertigter Kündigung durch Ihre Chefin/Ihren Chef.

Aufgabe 137:
Welches Gericht ist in Deutschland bei Konflikten in der Arbeitswelt zuständig?

•	das Familiengericht
•	das Strafgericht
•	das Arbeitsgericht 
•	das Amtsgericht

Correct answer: das Arbeitsgericht

Aufgabe 138: 
Was kann ich in Deutschland machen, wenn mir meine Arbeitgeberin/mein Arbeitgeber zu Unrecht gekündigt hat?

•	weiterarbeiten und freundlich zur Chefin/zum Chef sein
•	ein Mahnverfahren gegen die Arbeitgeberin/den Arbeitgeber führen
•	Kündigungsschutzklage erheben 
•	die Arbeitgeberin/den Arbeitgeber bei der Polizei anzeigen

Correct answer: Kündigungsschutzklage erheben

Aufgabe 139: 
Wann kommt es in Deutschland zu einem Prozess vor Gericht? Wenn jemand …

•	zu einer anderen Religion übertritt.
•	eine Straftat begangen hat und angeklagt wird. 
•	eine andere Meinung als die der Regierung vertritt.
•	sein Auto falsch geparkt hat und es abgeschleppt wird.

Correct answer: eine Straftat begangen hat und angeklagt wird.

Aufgabe 140: 
Was macht eine Schöffin/ein Schöffe in Deutschland? Sie/Er …

•	entscheidet mit Richterinnen/Richtern über Schuld und Strafe. 
•	gibt Bürgerinnen/Bürgern rechtlichen Rat.
•	stellt Urkunden aus.
•	verteidigt die Angeklagte/den Angeklagten.

Correct answer: entscheidet mit Richterinnen/Richtern über Schuld und Strafe.

Aufgabe 141:
Wer berät in Deutschland Personen bei Rechtsfragen und vertritt sie vor Gericht?

•	eine Rechtsanwältin/ein Rechtsanwalt 
•	eine Richterin/ein Richter
•	eine Schöffin/ein Schöffe
•	eine Staatsanwältin/ein Staatsanwalt

Correct answer: eine Rechtsanwältin/ein Rechtsanwalt

Aufgabe 142: 
Was ist die Hauptaufgabe einer Richterin/eines Richters in Deutschland? Eine Richterin/ein Richter …

•	vertritt Bürgerinnen und Bürger vor einem Gericht.
•	arbeitet an einem Gericht und spricht Urteile. 
•	ändert Gesetze.
•	betreut Jugendliche vor Gericht.

Correct answer: arbeitet an einem Gericht und spricht Urteile.

Aufgabe 143: 
Eine Richterin/ein Richter in Deutschland gehört zur …

•	Judikative. 
•	Exekutive.
•	Operative.
•	Legislative.

Correct answer: Judikative.

Aufgabe 144: 
Eine Richterin/ein Richter gehört in Deutschland zur …

•	vollziehenden Gewalt.
•	rechtsprechenden Gewalt. 
•	planenden Gewalt.
•	gesetzgebenden Gewalt.

Correct answer: rechtsprechenden Gewalt.

Aufgabe 145: 
In Deutschland wird die Staatsgewalt geteilt. Für welche Staatsgewalt arbeitet eine Richterin/ein Richter? Für die …

•	Judikative 
•	Exekutive
•	Presse
•	Legislative

Correct answer: Judikative

Aufgabe 146: 
Wie nennt man in Deutschland ein Verfahren vor einem Gericht?

•	Programm
•	Prozedur
•	Protokoll
•	Prozess 

Correct answer: Prozess

Aufgabe 147: 
Was ist die Arbeit einer Richterin/eines Richters in Deutschland?

•	Deutschland regieren
•	Recht sprechen 
•	Pläne erstellen
•	Gesetze erlassen

Correct answer: Recht sprechen

Aufgabe 148: 
Was ist eine Aufgabe der Polizei in Deutschland?

•	das Land zu verteidigen
•	die Bürgerinnen und Bürger abzuhören
•	die Gesetze zu beschließen
•	die Einhaltung von Gesetzen zu überwachen 

Correct answer: die Einhaltung von Gesetzen zu überwachen

Aufgabe 149: 
Was ist ein Beispiel für antisemitisches Verhalten?

•	ein jüdisches Fest besuchen
•	die israelische Regierung kritisieren
•	den Holocaust leugnen 
•	gegen Juden Fußball spielen.

Correct answer: den Holocaust leugnen

Aufgabe 150: 
Eine Gerichtsschöffin/ein Gerichtsschöffe in Deutschland ist …

•	die Stellvertreterin/der Stellvertreter des Stadtoberhaupts.
•	eine ehrenamtliche Richterin/ein ehrenamtlicher Richter. 
•	ein Mitglied eines Gemeinderats.
•	eine Person, die Jura studiert hat.

Correct answer: eine ehrenamtliche Richterin/ein ehrenamtlicher Richter.

Aufgabe 151: 
Wer baute die Mauer in Berlin?

•	Großbritannien
•	die DDR 
•	die Bundesrepublik Deutschland
•	die USA

Correct answer: die DDR

Aufgabe 152: 
Wann waren die Nationalsozialisten mit Adolf Hitler in Deutschland an der Macht?

•	1918 bis 1923
•	1932 bis 1950
•	1933 bis 1945 
•	1945 bis 1989

Correct answer: 1933 bis 1945

Aufgabe 153: 
Was war am 8. Mai 1945?

•	Tod Adolf Hitlers
•	Beginn des Berliner Mauerbaus
•	Wahl von Konrad Adenauer zum Bundeskanzler
•	Ende des Zweiten Weltkriegs in Europa 

Correct answer: Ende des Zweiten Weltkriegs in Europa

Aufgabe 154: 
Wann war der Zweite Weltkrieg zu Ende?

•	1933
•	1945 
•	1949
•	1961

Correct answer: 1945

Aufgabe 155: 
Wann waren die Nationalsozialisten in Deutschland an der Macht?

•	1888 bis 1918
•	1921 bis 1934
•	1933 bis 1945 
•	1949 bis 1963

Correct answer: 1933 bis 1945

Aufgabe 156: 
In welchem Jahr wurde Hitler Reichskanzler?

•	1923
•	1927
•	1933 
•	1936

Correct answer: 1933

Aufgabe 157: 
Die Nationalsozialisten mit Adolf Hitler errichteten 1933 in Deutschland …

•	eine Diktatur. 
•	einen demokratischen Staat.
•	eine Monarchie.
•	ein Fürstentum.

Correct answer: eine Diktatur.

Aufgabe 158: 
Das "Dritte Reich" war eine …

•	Diktatur. 
•	Demokratie.
•	Monarchie.
•	Räterepublik.

Correct answer: Diktatur.

Aufgabe 159: 
Was gab es in Deutschland nicht während der Zeit des Nationalsozialismus?

•	freie Wahlen 
•	Pressezensur
•	willkürliche Verhaftungen
•	Verfolgung von Juden

Correct answer: freie Wahlen

Aufgabe 160: 
Welcher Krieg dauerte von 1939 bis 1945?

•	der Erste Weltkrieg
•	der Zweite Weltkrieg 
•	der Vietnamkrieg
•	der Golfkrieg

Correct answer: der Zweite Weltkrieg

Aufgabe 161: 
Was kennzeichnete den NS-Staat? Eine Politik …

•	des staatlichen Rassismus 
•	der Meinungsfreiheit
•	der allgemeinen Religionsfreiheit
•	der Entwicklung der Demokratie

Correct answer: des staatlichen Rassismus

Aufgabe 162: 
Claus Schenk Graf von Stauffenberg wurde bekannt durch …

•	eine Goldmedaille bei den Olympischen Spielen 1936.
•	den Bau des Reichstagsgebäudes.
•	den Aufbau der Wehrmacht.
•	das Attentat auf Hitler am 20. Juli 1944. 

Correct answer: das Attentat auf Hitler am 20. Juli 1944.

Aufgabe 163: 
In welchem Jahr zerstörten die Nationalsozialisten Synagogen und jüdische Geschäfte in Deutschland?

•	1925
•	1930
•	1938 
•	1945

Correct answer: 1938

Aufgabe 164: 
Was passierte am 9. November 1938 in Deutschland?

•	Mit dem Angriff auf Polen beginnt der Zweite Weltkrieg.
•	Die Nationalsozialisten verlieren eine Wahl und lösen den Reichstag auf.
•	Jüdische Geschäfte und Synagogen werden durch Nationalsozialisten und ihre Anhänger zerstört.
•	Hitler wird Reichspräsident und lässt alle Parteien verbieten.

Correct answer: Jüdische Geschäfte und Synagogen werden durch Nationalsozialisten und ihre Anhänger zerstört.

Aufgabe 165: 
Wie hieß der erste Bundeskanzler der Bundesrepublik Deutschland?

•	Konrad Adenauer
•	Kurt Georg Kiesinger
•	Helmut Schmidt
•	Willy Brandt

Correct answer: Konrad Adenauer

Aufgabe 166: 
Bei welchen Demonstrationen in Deutschland riefen die Menschen "Wir sind das Volk"?

•	beim Arbeiteraufstand 1953 in der DDR
•	bei den Demonstrationen 1968 in der Bundesrepublik Deutschland
•	bei den Anti-Atomkraft-Demonstrationen 1985 in der Bundesrepublik Deutschland
•	bei den Montagsdemonstrationen 1989 in der DDR 

Correct answer: bei den Montagsdemonstrationen 1989 in der DDR

Aufgabe 167: 
Welche Länder wurden nach dem Zweiten Weltkrieg in Deutschland als "Alliierte Besatzungsmächte" bezeichnet?

•	Sowjetunion, Großbritannien, Polen, Schweden
•	Frankreich, Sowjetunion, Italien, Japan
•	USA, Sowjetunion, Spanien, Portugal
•	USA, Sowjetunion, Großbritannien, Frankreich 

Correct answer: USA, Sowjetunion, Großbritannien, Frankreich

Aufgabe 168: 
Welches Land war keine "Alliierte Besatzungsmacht" in Deutschland?

•	USA
•	Sowjetunion
•	Frankreich
•	Japan

Correct answer: Japan

Aufgabe 169: 
Wann wurde die Bundesrepublik Deutschland gegründet?

•	1939
•	1945
•	1949
•	1951

Correct answer: 1949

Aufgabe 170: 
Was gab es während der Zeit des Nationalsozialismus in Deutschland?

•	das Verbot von Parteien
•	das Recht zur freien Entfaltung der Persönlichkeit
•	Pressefreiheit
•	den Schutz der Menschenwürde

Correct answer: das Verbot von Parteien

Aufgabe 171: 
Soziale Marktwirtschaft bedeutet, die Wirtschaft …

•	steuert sich allein nach Angebot und Nachfrage.
•	wird vom Staat geplant und gesteuert, Angebot und Nachfrage werden nicht berücksichtigt.
•	richtet sich nach der Nachfrage im Ausland.
•	richtet sich nach Angebot und Nachfrage, aber der Staat sorgt für einen sozialen Ausgleich. 

Correct answer: richtet sich nach Angebot und Nachfrage, aber der Staat sorgt für einen sozialen Ausgleich.

Aufgabe 172: 
In welcher Besatzungszone wurde die DDR gegründet? In der …

•	amerikanischen Besatzungszone
•	französischen Besatzungszone
•	britischen Besatzungszone
•	sowjetischen Besatzungszone 

Correct answer: sowjetischen Besatzungszone

Aufgabe 173: 
Die Bundesrepublik Deutschland ist ein Gründungsmitglied …

•	des Nordatlantikpakts (NATO).
•	der Vereinten Nationen (VN).
•	der Europäischen Union (EU). 
•	des Warschauer Pakts.

Correct answer: der Europäischen Union (EU).

Aufgabe 174: 
Wann wurde die DDR gegründet?

•	1947
•	1949 
•	1953
•	1956

Correct answer: 1949

Aufgabe 175: 
Wie viele Besatzungszonen gab es in Deutschland nach dem Zweiten Weltkrieg?

•	3
•	4 
•	5
•	6

Correct answer: 4

Aufgabe 176: 
Wie waren die Besatzungszonen Deutschlands nach 1945 verteilt?

•	1=Großbritannien, 2=Sowjetunion, 3=Frankreich, 4=USA
•	1=Sowjetunion, 2=Großbritannien, 3=USA, 4=Frankreich
•	1=Großbritannien, 2=Sowjetunion, 3=USA, 4=Frankreich
•	1=Großbritannien, 2=USA, 3=Sowjetunion, 4=Frankreich

Correct answer: 1=Sowjetunion, 2=Großbritannien, 3=USA, 4=Frankreich

Aufgabe 177: 
Welche deutsche Stadt wurde nach dem Zweiten Weltkrieg in vier Sektoren aufgeteilt?

•	München
•	Berlin 
•	Dresden
•	Frankfurt/Oder

Correct answer: Berlin

Aufgabe 178: 
Vom Juni 1948 bis zum Mai 1949 wurden die Bürgerinnen und Bürger von West-Berlin durch eine Luftbrücke versorgt. Welcher Umstand war dafür verantwortlich?

•	Für Frankreich war eine Versorgung der West-Berliner Bevölkerung mit dem Flugzeug kostengünstiger.
•	Die amerikanischen Soldatinnen und Soldaten hatten beim Landtransport Angst vor Überfällen.
•	Für Großbritannien war die Versorgung über die Luftbrücke schneller.
•	Die Sowjetunion unterbrach den gesamten Verkehr auf dem Landwege.

Correct answer: Die Sowjetunion unterbrach den gesamten Verkehr auf dem Landwege.

Aufgabe 179: 
Wie endete der Zweite Weltkrieg in Europa offiziell?

•	mit dem Tod Adolf Hitlers
•	durch die bedingungslose Kapitulation Deutschlands 
•	mit dem Rückzug der Deutschen aus den besetzten Gebieten
•	durch eine Revolution in Deutschland

Correct answer: durch die bedingungslose Kapitulation Deutschlands

Aufgabe 180: 
Der erste Bundeskanzler der Bundesrepublik Deutschland war …

•	Ludwig Erhard.
•	Willy Brandt.
•	Konrad Adenauer. 
•	Gerhard Schröder.

Correct answer: Konrad Adenauer.

Aufgabe 181: 
Was wollte Willy Brandt mit seinem Kniefall 1970 im ehemaligen jüdischen Ghetto in Warschau ausdrücken?

•	Er hat sich den ehemaligen Alliierten unterworfen.
•	Er bat Polen und die polnischen Juden um Vergebung. 
•	Er zeigte seine Demut vor dem Warschauer Pakt.
•	Er sprach ein Gebet am Grab des Unbekannten Soldaten.

Correct answer: Er bat Polen und die polnischen Juden um Vergebung.

Aufgabe 182: 
Wie heißt das jüdische Gebetshaus?

•	Basilika
•	Moschee
•	Synagoge 
•	Kirche

Correct answer: Synagoge

Aufgabe 183: 
Wann war in der Bundesrepublik Deutschland das "Wirtschaftswunder"?

•	40er Jahre
•	50er Jahre 
•	70er Jahre
•	80er Jahre

Correct answer: 50er Jahre

Aufgabe 184: 
Auf welcher rechtlichen Grundlage wurde der Staat Israel gegründet?

•	eine Resolution der Vereinten Nationen 
•	ein Beschluss des Zionistenkongresses
•	ein Vorschlag der Bundesregierung
•	ein Vorschlag der UdSSR

Correct answer: eine Resolution der Vereinten Nationen

Aufgabe 185: 
Wofür stand der Ausdruck "Eiserner Vorhang"? Für die Abschottung …

•	des Warschauer Pakts gegen den Westen 
•	Norddeutschlands gegen Süddeutschland
•	Nazi-Deutschlands gegen die Alliierten
•	Europas gegen die USA

Correct answer: des Warschauer Pakts gegen den Westen

Aufgabe 186: 
Im Jahr 1953 gab es in der DDR einen Aufstand, an den lange Zeit in der Bundesrepublik Deutschland ein Feiertag erinnerte. Wann war das?

•	Mai
•	17. Juni 
•	Juli
•	November

Correct answer: 17. Juni

Aufgabe 187: 
Welcher deutsche Staat hatte eine schwarz-rot-goldene Flagge mit Hammer, Zirkel und Ährenkranz?

•	Preußen
•	Bundesrepublik Deutschland
•	"Drittes Reich"
•	DDR 

Correct answer: DDR

Aufgabe 188: 
In welchem Jahr wurde die Mauer in Berlin gebaut?

•	1953
•	1956
•	1959
•	1961 

Correct answer: 1961

Aufgabe 189: 
Wann baute die DDR die Mauer in Berlin?

•	1919
•	1933
•	1961 
•	1990

Correct answer: 1961

Aufgabe 190: 
Was bedeutet die Abkürzung DDR?

•	Dritter Deutscher Rundfunk
•	Die Deutsche Republik
•	Dritte Deutsche Republik
•	Deutsche Demokratische Republik 

Correct answer: Deutsche Demokratische Republik

Aufgabe 191: 
Wann wurde die Mauer in Berlin für alle geöffnet?

•	1987
•	1989 
•	1992
•	1995

Correct answer: 1989

Aufgabe 192: 
Welches heutige deutsche Bundesland gehörte früher zum Gebiet der DDR?

•	Brandenburg 
•	Bayern
•	Saarland
•	Hessen

Correct answer: Brandenburg

Aufgabe 193: 
Von 1961 bis 1989 war Berlin …

•	ohne Bürgermeister.
•	ein eigener Staat.
•	durch eine Mauer geteilt. 
•	nur mit dem Flugzeug erreichbar.

Correct answer: durch eine Mauer geteilt.

Aufgabe 194: 
Am 3. Oktober feiert man in Deutschland den Tag der Deutschen …

•	Einheit. 
•	Nation.
•	Bundesländer.
•	Städte.

Correct answer: Einheit.

Aufgabe 195: 
Welches heutige deutsche Bundesland gehörte früher zum Gebiet der DDR?

•	Hessen
•	Sachsen-Anhalt 
•	Nordrhein-Westfalen
•	Saarland

Correct answer: Sachsen-Anhalt

Aufgabe 196: 
Warum nennt man die Zeit im Herbst 1989 in der DDR "Die Wende"? In dieser Zeit veränderte sich die DDR politisch …

•	von einer Diktatur zur Demokratie. 
•	von einer liberalen Marktwirtschaft zum Sozialismus.
•	von einer Monarchie zur Sozialdemokratie.
•	von einem religiösen Staat zu einem kommunistischen Staat.

Correct answer: von einer Diktatur zur Demokratie.

Aufgabe 197: 
Welches heutige deutsche Bundesland gehörte früher zum Gebiet der DDR?

•	Thüringen
•	Hessen
•	Bayern
•	Bremen

Correct answer: Thüringen

Aufgabe 198: 
Welches heutige deutsche Bundesland gehörte früher zum Gebiet der DDR?

•	Bayern
•	Niedersachsen
•	Sachsen
•	Baden-Württemberg

Correct answer: Sachsen

Aufgabe 199: 
Mit der Abkürzung "Stasi" meinte man in der DDR …

•	das Parlament.
•	das Ministerium für Staatssicherheit. 
•	eine regierende Partei.
•	das Ministerium für Volksbildung.

Correct answer: das Ministerium für Staatssicherheit.

Aufgabe 200: 
Welches heutige deutsche Bundesland gehörte früher zum Gebiet der DDR?

•	Hessen
•	Schleswig-Holstein
•	Mecklenburg-Vorpommern 
•	Saarland

Correct answer: Mecklenburg-Vorpommern
"""

def parse_questions(text):
    questions = []
    parts = re.split(r'Aufgabe \d+:', text)
    
    for idx, part in enumerate(parts[1:], 1):
        try:
            lines = [l.strip() for l in part.strip().split('\n') if l.strip()]
            if not lines:
                print(f"Warning: Aufgabe {idx} has no content")
                continue
                
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
            
            options = []
            while i < len(lines) and lines[i].startswith('•'):
                option_text = lines[i][1:].strip()
                if option_text:
                    options.append(option_text)
                i += 1
            
            if len(options) != 4:
                print(f"Warning: Aufgabe {idx} has {len(options)} options instead of 4")
            
            correct_answer_text = ""
            while i < len(lines):
                if 'Correct answer:' in lines[i]:
                    correct_answer_text = lines[i].split('Correct answer:')[1].strip()
                    break
                i += 1
            
            if not correct_answer_text:
                print(f"Warning: Aufgabe {idx} has no correct answer specified.")
                continue

            formatted_options = []
            found_correct = False
            for opt_text in options:
                is_correct = (opt_text == correct_answer_text)
                if is_correct:
                    found_correct = True
                formatted_options.append({"text": opt_text, "isCorrect": is_correct})
            
            if not found_correct:
                print(f"Warning: Correct answer '{correct_answer_text}' for Aufgabe {idx} not found in options.")
                formatted_options.append({"text": correct_answer_text, "isCorrect": True})

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
    print("Parsing questions...")
    new_questions = parse_questions(questions_text)
    print(f"Parsed {len(new_questions)} questions")
    
    if len(new_questions) != 100:
        print(f"Warning: Expected 100 questions, got {len(new_questions)}")
    
    print("Reading existing file...")
    with open('questions/leben-in-deutschland-300-questions.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    original_count = len(data['questions'])
    print(f"Original file has {original_count} questions")
    
    # استبدال الأسئلة من 101 إلى 200 (indices 100-199)
    data['questions'][100:200] = new_questions
    
    print("Writing updated file...")
    with open('questions/leben-in-deutschland-300-questions.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"Successfully replaced questions 101-200. Total questions: {len(data['questions'])}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()











