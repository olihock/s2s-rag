# Anforderungsdokument: Text-Chatbot

## Einleitung

Neben der bestehenden Spracheingabe (Mikrofon-Button) soll ein Text-Chatbot als alternative Eingabemethode eingeführt werden. Ein neuer Button öffnet ein Chatfenster, über das der Benutzer Fragen per Text eingeben und Antworten des LLM-gestützten Assistenten lesen kann. Der Chatbot nutzt dieselbe RAG-Pipeline (Vektorsuche + LLM) wie die Spracheingabe, jedoch ohne STT- und TTS-Verarbeitung.

## Glossar

- **Chatbot**: Die neue Text-basierte Eingabe- und Antwortkomponente im Frontend.
- **Chatfenster**: Das modale oder eingebettete UI-Panel, das die Konversation anzeigt.
- **Chat_API**: Der neue Backend-Endpunkt, der Textanfragen entgegennimmt und Antworten zurückgibt.
- **LLM_Service**: Der bestehende `LlmService` im Backend, der Antworten auf Basis von Kontext-Chunks generiert.
- **Vector_Service**: Der bestehende `VectorService`, der semantische Suche über Dokumente des Benutzers durchführt.
- **Nachricht**: Eine einzelne Text-Eingabe des Benutzers oder eine Antwort des Chatbots.
- **Konversationsverlauf**: Die geordnete Liste aller Nachrichten einer Chat-Sitzung.
- **Quelle**: Ein Dokument-Chunk, der als Grundlage für eine Chatbot-Antwort verwendet wurde.
- **Sitzung**: Eine zusammenhängende Abfolge von Nachrichten innerhalb eines geöffneten Chatfensters.

---

## Anforderungen

### Anforderung 1: Chat-Button in der Benutzeroberfläche

**User Story:** Als Benutzer möchte ich einen Chat-Button neben dem Mikrofon-Button sehen, damit ich zwischen Sprach- und Texteingabe wählen kann.

#### Akzeptanzkriterien

1. THE Chatbot SHALL einen Chat-Button in der Nähe des bestehenden Mikrofon-Buttons (`VoiceInput`) rendern.
2. WHEN der Benutzer den Chat-Button anklickt, THE Chatbot SHALL das Chatfenster öffnen.
3. WHEN das Chatfenster geöffnet ist und der Benutzer den Chat-Button erneut anklickt, THE Chatbot SHALL das Chatfenster schließen.
4. THE Chatbot SHALL den Chat-Button mit einem eindeutigen Icon und einem zugänglichen `aria-label` versehen.

---

### Anforderung 2: Chatfenster-Darstellung

**User Story:** Als Benutzer möchte ich ein übersichtliches Chatfenster sehen, damit ich den Gesprächsverlauf verfolgen kann.

#### Akzeptanzkriterien

1. WHEN das Chatfenster geöffnet wird, THE Chatbot SHALL alle Nachrichten der aktuellen Sitzung in chronologischer Reihenfolge anzeigen.
2. THE Chatbot SHALL Benutzernachrichten und Chatbot-Antworten visuell unterscheidbar darstellen.
3. WHEN eine neue Nachricht hinzugefügt wird, THE Chatbot SHALL automatisch zum Ende des Konversationsverlaufs scrollen.
4. WHEN keine Nachrichten vorhanden sind, THE Chatbot SHALL einen Hinweistext anzeigen, der den Benutzer zur Eingabe einer Frage auffordert.
5. THE Chatbot SHALL eine Schaltfläche zum Schließen des Chatfensters bereitstellen.

---

### Anforderung 3: Texteingabe und Absenden

**User Story:** Als Benutzer möchte ich eine Textnachricht eingeben und absenden können, damit ich eine Antwort vom Assistenten erhalte.

#### Akzeptanzkriterien

1. THE Chatbot SHALL ein Texteingabefeld und eine Senden-Schaltfläche im Chatfenster bereitstellen.
2. WHEN der Benutzer die Enter-Taste drückt, THE Chatbot SHALL die eingegebene Nachricht absenden.
3. WHEN der Benutzer die Senden-Schaltfläche anklickt, THE Chatbot SHALL die eingegebene Nachricht absenden.
4. WHEN eine Nachricht abgesendet wird, THE Chatbot SHALL das Texteingabefeld leeren.
5. IF das Texteingabefeld leer ist, THEN THE Chatbot SHALL das Absenden verhindern.
6. WHILE eine Anfrage verarbeitet wird, THE Chatbot SHALL das Texteingabefeld und die Senden-Schaltfläche deaktivieren.
7. WHILE eine Anfrage verarbeitet wird, THE Chatbot SHALL einen Ladeindikator anzeigen.

---

### Anforderung 4: Backend-Endpunkt für Textanfragen

**User Story:** Als Entwickler möchte ich einen dedizierten REST-Endpunkt für Textanfragen, damit der Chatbot Antworten ohne STT-Verarbeitung abrufen kann.

#### Akzeptanzkriterien

1. THE Chat_API SHALL einen `POST /chat/query`-Endpunkt bereitstellen, der `{ message: string, language?: string }` im Request-Body akzeptiert.
2. WHEN eine gültige Anfrage eingeht, THE Chat_API SHALL den Vector_Service zur semantischen Suche über die Dokumente des authentifizierten Benutzers verwenden.
3. WHEN eine gültige Anfrage eingeht, THE Chat_API SHALL den LLM_Service mit der Benutzerfrage und den gefundenen Kontext-Chunks aufrufen.
4. THE Chat_API SHALL `{ answer: string, sources: Source[] }` als Antwort zurückgeben.
5. IF kein gültiges JWT-Token vorhanden ist, THEN THE Chat_API SHALL mit HTTP 401 antworten.
6. IF der LLM_Service nicht erreichbar ist, THEN THE Chat_API SHALL mit HTTP 503 und einer beschreibenden Fehlermeldung antworten.
7. IF der Request-Body kein `message`-Feld enthält oder dieses leer ist, THEN THE Chat_API SHALL mit HTTP 400 antworten.

---

### Anforderung 5: Anzeige von Quellen

**User Story:** Als Benutzer möchte ich sehen, auf welchen Dokumenten eine Antwort basiert, damit ich die Herkunft der Information nachvollziehen kann.

#### Akzeptanzkriterien

1. WHEN der Chatbot eine Antwort mit mindestens einer Quelle erhält, THE Chatbot SHALL die Quellen unterhalb der Antwort anzeigen.
2. THE Chatbot SHALL für jede Quelle den Dateinamen und einen Ausschnitt des relevanten Textes anzeigen.
3. WHEN der Chatbot eine Antwort ohne Quellen erhält, THE Chatbot SHALL keinen Quellenbereich anzeigen.

---

### Anforderung 6: Sprachunterstützung

**User Story:** Als Benutzer möchte ich, dass der Chatbot in meiner bevorzugten Sprache antwortet, damit ich die Antworten besser verstehe.

#### Akzeptanzkriterien

1. THE Chatbot SHALL die aktuell eingestellte Sprache (`en` oder `de`) mit jeder Anfrage an die Chat_API übermitteln.
2. WHEN die Sprache `de` übermittelt wird, THE LLM_Service SHALL auf Deutsch antworten.
3. WHEN die Sprache `en` übermittelt wird, THE LLM_Service SHALL auf Englisch antworten.

---

### Anforderung 7: Fehlerbehandlung im Frontend

**User Story:** Als Benutzer möchte ich bei Fehlern eine verständliche Meldung sehen, damit ich weiß, was schiefgelaufen ist.

#### Akzeptanzkriterien

1. IF die Chat_API einen Fehler zurückgibt, THEN THE Chatbot SHALL eine Fehlermeldung im Chatfenster anzeigen.
2. IF ein Netzwerkfehler auftritt, THEN THE Chatbot SHALL eine Fehlermeldung im Chatfenster anzeigen.
3. THE Chatbot SHALL nach einem Fehler das Texteingabefeld wieder aktivieren, damit der Benutzer eine neue Anfrage stellen kann.

---

### Anforderung 9: Keine Text-to-Speech-Ausgabe

**User Story:** Als Benutzer möchte ich, dass Chatbot-Antworten ausschließlich als Text angezeigt werden, damit keine unerwünschte Sprachausgabe erfolgt.

#### Akzeptanzkriterien

1. THE Chatbot SHALL Antworten des LLM_Service ausschließlich als Text im Chatfenster darstellen.
2. THE Chatbot SHALL keine TTS-Verarbeitung (Text-to-Speech) für Chatbot-Antworten aufrufen.
3. THE Chat_API SHALL den TTS_Service für Anfragen an `POST /chat/query` nicht aufrufen.
4. IF eine Chatbot-Antwort empfangen wird, THEN THE Chatbot SHALL keine Audiowiedergabe starten.

---

### Anforderung 8: Sitzungsverwaltung

**User Story:** Als Benutzer möchte ich den Chatverlauf während einer Sitzung behalten, damit ich den Kontext meiner Fragen nachvollziehen kann.

#### Akzeptanzkriterien

1. THE Chatbot SHALL den Konversationsverlauf für die Dauer einer geöffneten Sitzung im Frontend-State speichern.
2. WHEN das Chatfenster geschlossen und erneut geöffnet wird, THE Chatbot SHALL den Konversationsverlauf der vorherigen Sitzung beibehalten.
3. THE Chatbot SHALL eine Schaltfläche zum Löschen des Konversationsverlaufs bereitstellen.
4. WHEN der Benutzer den Konversationsverlauf löscht, THE Chatbot SHALL alle Nachrichten der aktuellen Sitzung entfernen.
