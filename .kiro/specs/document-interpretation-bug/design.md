# Document Interpretation Bug – Bugfix Design

## Overview

Beim Hochladen eines Dokuments werden Chunk-Embeddings mit einer Dummy-Sinus-Funktion
(`dummyEmbedding`) statt mit dem echten Ollama-Embedding-Modell (`LlmService.generateEmbedding`)
erzeugt. Dadurch liefert die Vektorsuche semantisch irrelevante Ergebnisse, und der LLM erhält
falschen Kontext. Zusätzlich gibt der `ChatController` in den Quellenangaben immer `filename: ''`
zurück, weil der Dateiname nicht aus der Datenbank nachgeladen wird.

Der Fix besteht aus zwei minimalen, isolierten Änderungen:

1. `DocumentsService.indexDocument()` ruft `LlmService.generateEmbedding()` auf.
2. `ChatController.chatQuery()` lädt den Dateinamen per `PrismaService` nach.

## Glossary

- **Bug_Condition (C)**: Die Bedingung, unter der der Bug auftritt – entweder beim Indizieren
  eines Dokuments (Dummy-Embedding) oder beim Beantworten einer Chat-Anfrage (leerer Dateiname).
- **Property (P)**: Das gewünschte korrekte Verhalten – echte Embeddings beim Indizieren,
  tatsächlicher Dateiname in den Quellen.
- **Preservation**: Alle Verhaltensweisen, die durch den Fix nicht verändert werden dürfen
  (DB-Speicherung, Authentifizierung, Fehlerbehandlung, leere Suchergebnisse etc.).
- **`DocumentsService.indexDocument()`**: Private Methode in
  `backend/src/services/documents.service.ts`, die Chunks erzeugt und in Milvus speichert.
- **`dummyEmbedding()`**: Sinus-Heuristik in `DocumentsService`, die einen 768-dim Vektor
  ohne semantischen Inhalt erzeugt – nur als Platzhalter gedacht.
- **`LlmService.generateEmbedding()`**: Methode in `backend/src/services/llm.service.ts`,
  die das Ollama-Modell `nomic-embed-text` aufruft und bei Fehler graceful auf Null-Vektor
  degradiert.
- **`ChatController.chatQuery()`**: POST-Handler in
  `backend/src/controllers/chat.controller.ts`, der Vektorsuche und LLM-Antwort orchestriert.
- **`PrismaService`**: Datenbankzugriff über Prisma ORM; `document.findUnique` liefert den
  gespeicherten `filename`.

## Bug Details

### Bug Condition

Der Bug tritt in zwei unabhängigen Codepfaden auf:

**(a) Embedding-Bug**: Beim Indizieren eines Dokuments verwendet `indexDocument()` die
`dummyEmbedding()`-Methode statt `LlmService.generateEmbedding()`. Alle gespeicherten
Vektoren sind semantisch bedeutungslos.

**(b) Filename-Bug**: Der `ChatController` konstruiert die `sources`-Liste mit hartkodiertem
`filename: ''`, ohne den Dateinamen aus der Datenbank zu laden.

**Formale Spezifikation:**

```
FUNCTION isBugCondition(X)
  INPUT: X of type DocumentUploadOrChatQuery
  OUTPUT: boolean

  RETURN (X is DocumentUpload AND usesRealEmbedding(X) = false)
      OR (X is ChatQuery AND sourcesContainEmptyFilename(X) = true)
END FUNCTION
```

### Beispiele

- **Embedding-Bug**: Upload von `trassenportal-handbuch.pdf` → Chunks werden mit
  `dummyEmbedding()` indiziert → Frage "Was ist TPN?" → Vektorsuche liefert zufällige Chunks →
  LLM antwortet "The context provided does not mention TPN."
- **Filename-Bug**: Chat-Anfrage mit Suchergebnissen → Response enthält
  `sources: [{ documentId: "abc", filename: "", chunkText: "...", similarity: 0.87 }]`
  statt `filename: "trassenportal-handbuch.pdf"`.
- **Edge Case**: Wenn Ollama nicht erreichbar ist → `generateEmbedding()` gibt Null-Vektor
  zurück (graceful degradation) → Verhalten bleibt korrekt, kein Upload-Abbruch.

## Expected Behavior

### Preservation Requirements

**Unverändertes Verhalten:**

- Dokumente werden weiterhin in der PostgreSQL-Datenbank gespeichert (Dateiname, Größe,
  extrahierter Text, erkannte Sprache).
- Die Authentifizierung und Autorisierung aller Endpunkte bleibt unverändert.
- Wenn die Vektorsuche keine Treffer liefert, gibt der Controller weiterhin eine leere
  `sources`-Liste zurück.
- Wenn Ollama nicht erreichbar ist, degradiert `generateEmbedding()` graceful auf einen
  Null-Vektor, ohne den Upload-Prozess zu unterbrechen.
- `documentId`, `chunkText` und `similarity` in den Quellenangaben bleiben unverändert.
- Alle anderen Controller und Services (Folders, OCR, RecycleBin, Auth) sind vom Fix
  nicht betroffen.

**Scope:**
Alle Eingaben, bei denen `isBugCondition(X) = false` gilt, müssen nach dem Fix identisches
Verhalten wie vor dem Fix zeigen. Das umfasst insbesondere:

- Dokument-Uploads, bei denen Ollama nicht erreichbar ist (Null-Vektor-Fallback).
- Chat-Anfragen ohne Suchergebnisse (`sources: []`).
- Alle anderen API-Endpunkte.

## Hypothesized Root Cause

1. **Fehlende Dependency-Injection in `DocumentsService`**: `DocumentsService` hat keinen
   `LlmService` im Konstruktor. Deshalb wurde `dummyEmbedding()` als lokaler Platzhalter
   implementiert, anstatt `LlmService.generateEmbedding()` aufzurufen.

2. **Fehlende Datenbankabfrage im `ChatController`**: Der `ChatController` hat keinen
   `PrismaService` im Konstruktor. Die `sources`-Liste wird direkt aus den Milvus-Ergebnissen
   gebaut, die keinen `filename` enthalten – daher das hartkodierte `filename: ''`.

## Correctness Properties

Property 1: Bug Condition – Echte Embeddings beim Indizieren

_For any_ Dokument-Upload, bei dem `isBugCondition(X) = true` gilt (d. h. das System würde
`dummyEmbedding()` verwenden), SHALL die fixierte `indexDocument()`-Funktion für jeden Chunk
ein Embedding erzeugen, das durch `LlmService.generateEmbedding(chunkText)` berechnet wurde,
sodass der gespeicherte Vektor den semantischen Inhalt des Chunks repräsentiert.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition – Dateiname in Quellenangaben

_For any_ Chat-Anfrage, bei der Suchergebnisse vorliegen und `isBugCondition(X) = true` gilt
(d. h. `filename` wäre leer), SHALL die fixierte `chatQuery()`-Funktion für jede Quelle den
tatsächlichen Dateinamen aus der Datenbank laden und in `source.filename` zurückgeben, sodass
`source.filename !== ''`.

**Validates: Requirements 2.5**

Property 3: Preservation – Unverändertes Verhalten für Nicht-Bug-Eingaben

_For any_ Eingabe, bei der `isBugCondition(X) = false` gilt, SHALL die fixierte Funktion
exakt dasselbe Ergebnis liefern wie die ursprüngliche Funktion – insbesondere bei
Null-Vektor-Fallback (Ollama nicht erreichbar), leeren Suchergebnissen und allen anderen
API-Endpunkten.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Änderung 1: `DocumentsService` – echte Embeddings

**Datei**: `backend/src/services/documents.service.ts`

**Spezifische Änderungen:**

1. **`LlmService` per Dependency Injection einbinden**: `LlmService` als Parameter im
   Konstruktor ergänzen.

2. **`indexDocument()` anpassen**: `this.dummyEmbedding(chunk)` durch
   `await this.llmService.generateEmbedding(chunk)` ersetzen. Die Methode wird dadurch
   `async` (ist sie bereits) und muss `await` für jeden Chunk verwenden.

3. **`dummyEmbedding()` entfernen** (optional, da nicht mehr aufgerufen – kann als
   Dead Code entfernt werden).

---

### Änderung 2: `ChatController` – Dateiname aus DB laden

**Datei**: `backend/src/controllers/chat.controller.ts`

**Spezifische Änderungen:**

1. **`PrismaService` per Dependency Injection einbinden**: `PrismaService` als Parameter
   im Konstruktor ergänzen.

2. **Dateinamen nachladen**: Nach der Vektorsuche für jede `documentId` in den
   Suchergebnissen `prisma.document.findUnique({ where: { id: documentId } })` aufrufen
   und `filename` aus dem Ergebnis verwenden. Bei nicht gefundenem Dokument Fallback auf
   leeren String oder `'unknown'`.

3. **`sources`-Mapping aktualisieren**: `filename: ''` durch den nachgeladenen Dateinamen
   ersetzen.

## Testing Strategy

### Validation Approach

Zweiphasiger Ansatz: Zuerst Counterexamples auf dem unfixierten Code demonstrieren
(Exploratory), dann Fix und Preservation verifizieren.

### Exploratory Bug Condition Checking

**Ziel**: Counterexamples auf dem UNFIXIERTEN Code demonstrieren, um Root Cause zu
bestätigen.

**Testplan**: Unit-Tests mocken `LlmService.generateEmbedding` und `dummyEmbedding`,
um zu beobachten, welche Methode tatsächlich aufgerufen wird. Für den Filename-Bug wird
geprüft, ob `filename` leer ist.

**Test Cases:**

1. **Embedding-Bug-Test**: `indexDocument()` aufrufen und prüfen, ob
   `LlmService.generateEmbedding` aufgerufen wurde → schlägt auf unfixiertem Code fehl.
2. **Dummy-Embedding-Test**: Prüfen, ob `dummyEmbedding()` aufgerufen wird →
   bestätigt Root Cause auf unfixiertem Code.
3. **Filename-Bug-Test**: `chatQuery()` mit gemockten Suchergebnissen aufrufen und
   prüfen, ob `sources[0].filename !== ''` → schlägt auf unfixiertem Code fehl.
4. **Edge Case – Ollama nicht erreichbar**: `generateEmbedding` wirft Fehler →
   Null-Vektor-Fallback greift, Upload wird nicht abgebrochen.

**Erwartete Counterexamples:**

- `generateEmbedding` wird nicht aufgerufen (0 Aufrufe), `dummyEmbedding` wird aufgerufen.
- `sources[0].filename === ''` obwohl das Dokument in der DB existiert.

### Fix Checking

**Ziel**: Für alle Eingaben mit `isBugCondition(X) = true` das korrekte Verhalten
nach dem Fix verifizieren.

```
FOR ALL X WHERE X is DocumentUpload DO
  chunks ← indexDocument_fixed(X)
  ASSERT LlmService.generateEmbedding wurde für jeden Chunk aufgerufen
  ASSERT dummyEmbedding wurde NICHT aufgerufen
END FOR

FOR ALL X WHERE X is ChatQuery AND searchResults(X).length > 0 DO
  result ← chatQuery_fixed(X)
  ASSERT FOR ALL source IN result.sources: source.filename !== ''
  ASSERT FOR ALL source IN result.sources: source.filename = DB.document(source.documentId).filename
END FOR
```

### Preservation Checking

**Ziel**: Für alle Eingaben mit `isBugCondition(X) = false` identisches Verhalten
wie vor dem Fix sicherstellen.

```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT originalFunction(X) = fixedFunction(X)
END FOR
```

**Testing Approach**: Property-Based Testing für Preservation, weil:

- Viele zufällige Eingaben automatisch generiert werden.
- Edge Cases (leere Suchergebnisse, Ollama-Ausfall) systematisch abgedeckt werden.
- Starke Garantie, dass kein Regressionsverhalten eingeführt wird.

**Test Cases:**

1. **Leere Suchergebnisse**: `chatQuery()` ohne Vektortreffer → `sources: []` bleibt
   unverändert nach Fix.
2. **Ollama-Ausfall beim Embedding**: `generateEmbedding` gibt Null-Vektor zurück →
   Upload wird nicht abgebrochen, Chunk wird mit Null-Vektor gespeichert.
3. **Dokument nicht in DB**: `findUnique` gibt `null` zurück → Fallback-Verhalten
   korrekt (kein Crash).

### Unit Tests

- `indexDocument()` ruft `LlmService.generateEmbedding` für jeden Chunk auf.
- `indexDocument()` ruft `dummyEmbedding()` nicht mehr auf.
- `chatQuery()` gibt `filename` aus der DB zurück, wenn Suchergebnisse vorhanden.
- `chatQuery()` gibt `sources: []` zurück, wenn keine Suchergebnisse vorhanden.
- `chatQuery()` crasht nicht, wenn `findUnique` `null` zurückgibt.

### Property-Based Tests

- Für beliebige Chunk-Texte: `indexDocument_fixed` ruft immer `generateEmbedding` auf,
  nie `dummyEmbedding`.
- Für beliebige Suchergebnisse mit gültigen `documentId`s: `chatQuery_fixed` gibt immer
  `filename !== ''` zurück (sofern Dokument in DB existiert).
- Für beliebige Eingaben ohne Bug-Bedingung: Verhalten ist identisch mit unfixiertem Code.

### Integration Tests

- Vollständiger Upload-Flow: PDF hochladen → Embedding mit echtem Ollama-Mock erzeugen →
  Vektorsuche liefert semantisch relevante Chunks.
- Vollständiger Chat-Flow: Frage stellen → Antwort enthält korrekte Dateinamen in `sources`.
- Kontext-Switching: Mehrere Dokumente hochladen, Fragen zu verschiedenen Dokumenten
  stellen → korrekte Quellenangaben für jedes Dokument.
