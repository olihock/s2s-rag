# Implementierungsplan: Text-Chatbot

## Übersicht

Implementierung eines textbasierten Chatbots, der die bestehende RAG-Pipeline (VectorService + LlmService) ohne STT/TTS nutzt. Das Backend erhält einen neuen `ChatController`, das Frontend eine `ChatWindow`-Komponente sowie einen Chat-Button in `App.tsx`.

## Aufgaben

- [x] 1. Backend-Abhängigkeit installieren
  - `fast-check` als Dev-Abhängigkeit im Backend installieren: `cd backend && npm install --save-dev fast-check`
  - _Anforderungen: 4.1_

- [ ] 2. Backend: Typen und Interfaces ergänzen
  - [x] 2.1 `ChatQueryResult`-Interface in `backend/src/types/index.ts` hinzufügen
    - Interface mit den Feldern `answer: string` und `sources: Array<{ documentId, filename, chunkText, similarity }>`
    - _Anforderungen: 4.4_

- [ ] 3. Backend: ChatController und DTO implementieren
  - [x] 3.1 `ChatQueryDto` mit `class-validator`-Dekoratoren in `backend/src/controllers/chat.controller.ts` erstellen
    - Felder: `message: string` (IsString, IsNotEmpty), `language?: SupportedLanguage` (IsOptional, IsIn)
    - _Anforderungen: 4.1, 4.7_
  - [x] 3.2 `ChatController` mit `POST /chat/query`-Endpunkt implementieren
    - JwtAuthGuard, CurrentUser-Dekorator, Embedding generieren, VectorService.search(), LlmService.generateAnswer() aufrufen
    - Rückgabe: `ChatQueryResult`
    - _Anforderungen: 4.2, 4.3, 4.4, 4.5, 4.6, 9.2, 9.3_

- [ ] 4. Backend: AppModule aktualisieren
  - [x] 4.1 `ChatController` in `backend/src/app.module.ts` registrieren
    - Import und Eintrag in `controllers`-Array – keine neuen Provider nötig
    - _Anforderungen: 4.1_

- [ ] 5. Backend: Unit-Tests und Property-Tests schreiben
  - [x] 5.1 Unit-Tests für `ChatController` in `backend/tests/unit/chat.controller.spec.ts` erstellen
    - Test: gültiger Body → 200 + `{ answer, sources }`
    - Test: fehlendes JWT → 401
    - Test: leeres `message` → 400
    - Test: LLM nicht erreichbar → 503
    - Edge Case: `message` nur Whitespace → 400
    - _Anforderungen: 4.1, 4.4, 4.5, 4.6, 4.7_
  - [x] 5.2 Property-Test: Gültige Anfragen rufen RAG-Pipeline auf (`backend/tests/unit/chat.controller.property.spec.ts`)
    - **Property 6: Gültige Anfragen rufen RAG-Pipeline auf**
    - **Validates: Anforderungen 4.2, 4.3, 4.4**
  - [x] 5.3 Property-Test: Ungültige Eingaben werden mit HTTP 400 abgelehnt
    - **Property 7: Ungültige Eingaben werden mit HTTP 400 abgelehnt**
    - **Validates: Anforderungen 4.7**
  - [x] 5.4 Property-Test: Sprachparameter-Weiterleitung
    - **Property 9: Sprachparameter-Weiterleitung**
    - **Validates: Anforderungen 6.1, 6.2, 6.3**
  - [x] 5.5 Property-Test: Kein TTS-Aufruf bei Chat-Anfragen
    - **Property 13: Kein TTS-Aufruf bei Chat-Anfragen**
    - **Validates: Anforderungen 9.2, 9.3**

- [x] 6. Checkpoint – Backend vollständig
  - Alle Backend-Tests ausführen, sicherstellen dass alle Tests bestehen. Bei Fragen den Benutzer ansprechen.

- [x] 7. Frontend-Abhängigkeit installieren
  - `fast-check` als Dev-Abhängigkeit im Frontend installieren: `cd frontend && npm install --save-dev fast-check`
  - _Anforderungen: (Testvorbereitung)_

- [ ] 8. Frontend: Typen ergänzen
  - [x] 8.1 `ChatMessage`- und `ChatQueryResult`-Interfaces in `frontend/src/types/types.ts` hinzufügen
    - `ChatMessage`: `id`, `role: 'user' | 'bot'`, `text`, `sources?`, `timestamp`
    - `ChatQueryResult`: `answer`, `sources`
    - _Anforderungen: 2.1, 2.2, 5.1, 5.2_

- [ ] 9. Frontend: api.ts – queryWithChat() hinzufügen
  - [x] 9.1 Funktion `queryWithChat(message, language?)` in `frontend/src/services/api.ts` implementieren
    - `POST /chat/query` mit `{ message, language }` via Axios, Rückgabe `ChatQueryResult`
    - _Anforderungen: 4.1, 6.1_

- [ ] 10. Frontend: ChatWindow-Komponente implementieren
  - [x] 10.1 `frontend/src/components/ChatWindow.tsx` erstellen
    - State: `messages: ChatMessage[]`, `input: string`, `isLoading: boolean`
    - Nachrichten in chronologischer Reihenfolge rendern (User: rechtsbündig/blau, Bot: linksbündig/grau)
    - Quellenbereich nur wenn `sources.length > 0`
    - Auto-Scroll via `useRef` + `scrollIntoView` bei neuer Nachricht
    - Ladeindikator (animierter Punkt) während `isLoading === true`
    - Eingabefeld und Senden-Button während `isLoading` disabled
    - Leere/Whitespace-only Eingaben nicht absenden
    - Schließen-Button oben rechts
    - Löschen-Button für den Konversationsverlauf
    - Fehler als Bot-Nachricht einfügen, `isLoading` auf `false` setzen
    - _Anforderungen: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 5.1, 5.2, 5.3, 7.1, 7.2, 7.3, 8.3, 8.4, 9.1, 9.4_

- [ ] 11. Frontend: App.tsx – Chat-Button und State integrieren
  - [x] 11.1 `chatOpen: boolean`-State und `messages: ChatMessage[]`-State in `App.tsx` hinzufügen
    - `messages` in `App.tsx` halten und als Prop an `ChatWindow` übergeben (Persistenz nach Schließen)
    - _Anforderungen: 8.1, 8.2_
  - [x] 11.2 Chat-Button neben `VoiceInput` im "Ask a Question"-Bereich platzieren
    - Button mit Icon und `aria-label`, Toggle-Logik für `chatOpen`
    - _Anforderungen: 1.1, 1.2, 1.3, 1.4_
  - [x] 11.3 `ChatWindow` als Overlay rendern wenn `chatOpen === true`
    - `language`-Prop und `onClose`-Handler übergeben
    - _Anforderungen: 1.2, 1.3, 6.1_

- [ ] 12. Frontend: Unit-Tests und Property-Tests schreiben
  - [x] 12.1 Unit-Tests für `ChatWindow` in `frontend/tests/ChatWindow.spec.tsx` erstellen
    - Test: Chat-Button im DOM mit `aria-label`
    - Test: leere Nachrichtenliste → Hinweistext sichtbar
    - Test: Schließen-Button vorhanden
    - Test: Löschen-Button vorhanden
    - Test: Loading-Zustand → Eingabefeld und Button disabled, Ladeindikator sichtbar
    - Test: Antwort ohne Quellen → kein Quellenbereich
    - _Anforderungen: 1.4, 2.4, 2.5, 3.6, 3.7, 5.3, 8.3_
  - [x] 12.2 Property-Test: Chat-Button Toggle (`frontend/tests/ChatWindow.property.spec.tsx`)
    - **Property 1: Chat-Button Toggle**
    - **Validates: Anforderungen 1.2, 1.3**
  - [x] 12.3 Property-Test: Chronologische Nachrichtenreihenfolge
    - **Property 2: Chronologische Nachrichtenreihenfolge**
    - **Validates: Anforderungen 2.1**
  - [x] 12.4 Property-Test: Visuelle Unterscheidbarkeit von Nachrichten
    - **Property 3: Visuelle Unterscheidbarkeit von Nachrichten**
    - **Validates: Anforderungen 2.2**
  - [x] 12.5 Property-Test: Absenden leert das Eingabefeld
    - **Property 4: Absenden leert das Eingabefeld**
    - **Validates: Anforderungen 3.2, 3.3, 3.4**
  - [x] 12.6 Property-Test: Leere Eingaben werden abgelehnt
    - **Property 5: Leere Eingaben werden abgelehnt**
    - **Validates: Anforderungen 3.5**
  - [x] 12.7 Property-Test: Quellenanzeige abhängig von sources-Länge
    - **Property 8: Quellenanzeige abhängig von sources-Länge**
    - **Validates: Anforderungen 5.1, 5.2, 5.3**
  - [x] 12.8 Property-Test: Fehlerbehandlung reaktiviert Eingabe
    - **Property 10: Fehlerbehandlung reaktiviert Eingabe**
    - **Validates: Anforderungen 7.1, 7.2, 7.3**
  - [x] 12.9 Property-Test: Konversationsverlauf-Persistenz
    - **Property 11: Konversationsverlauf-Persistenz**
    - **Validates: Anforderungen 8.1, 8.2**
  - [x] 12.10 Property-Test: Löschen leert den Konversationsverlauf
    - **Property 12: Löschen leert den Konversationsverlauf**
    - **Validates: Anforderungen 8.4**

- [x] 13. Abschluss-Checkpoint – Alle Tests bestehen
  - Alle Backend- und Frontend-Tests ausführen, sicherstellen dass alle Tests bestehen. Bei Fragen den Benutzer ansprechen.

## Hinweise

- Aufgaben mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jede Aufgabe referenziert spezifische Anforderungen zur Rückverfolgbarkeit
- Property-Tests laufen mit mindestens 100 Iterationen (`{ numRuns: 100 }`)
- `fast-check` muss in beiden Paketen (Backend + Frontend) installiert werden
