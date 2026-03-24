# Bugfix Requirements Document

## Introduction

Beim Hochladen eines Dokuments (z. B. ein deutsches Handbuch für das Trassenportal) werden die Vektoren mit einer Dummy-Embedding-Funktion (Sinus-Heuristik) statt mit dem echten Embedding-Modell erzeugt. Dadurch liefert die semantische Suche irrelevante oder zufällige Chunks, der LLM erhält falschen Kontext und antwortet entweder mit rohen Textfragmenten, mit "The context provided does not mention..." oder beantwortet Fragen nicht korrekt. Zusätzlich werden in den Quellenangaben leere Dateinamen zurückgegeben, da der `ChatController` den Dateinamen nicht aus der Datenbank nachlädt.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN ein Dokument hochgeladen wird THEN erzeugt das System die Chunk-Embeddings mit einer Dummy-Sinus-Funktion statt mit dem echten Embedding-Modell (`LlmService.generateEmbedding`)

1.2 WHEN der Chatbot eine Frage zu einem hochgeladenen Dokument erhält THEN liefert die Vektorsuche semantisch irrelevante Chunks, weil die gespeicherten Embeddings nicht den tatsächlichen Textinhalt repräsentieren

1.3 WHEN der LLM irrelevante oder zufällige Chunks als Kontext erhält THEN antwortet das System mit "The context provided does not mention..." obwohl die Information im Dokument vorhanden ist

1.4 WHEN der LLM zufällig passende Chunks erhält THEN gibt das System rohe, unkomprimierte Quelltextfragmente direkt in der Antwort aus statt einer zusammengefassten Antwort

1.5 WHEN der Chatbot eine Antwort mit Quellen zurückgibt THEN enthält das System leere Dateinamen (`filename: ''`) in den Quellenangaben, weil der `ChatController` den Dateinamen nicht aus der Datenbank nachlädt

### Expected Behavior (Correct)

2.1 WHEN ein Dokument hochgeladen wird THEN SHALL das System die Chunk-Embeddings mit `LlmService.generateEmbedding` erzeugen, sodass die Vektoren den semantischen Inhalt der Chunks korrekt repräsentieren

2.2 WHEN der Chatbot eine Frage zu einem hochgeladenen Dokument erhält THEN SHALL die Vektorsuche semantisch relevante Chunks zurückliefern, die thematisch zur Frage passen

2.3 WHEN der LLM relevante Chunks als Kontext erhält THEN SHALL das System eine zusammengefasste, präzise Antwort auf die Frage liefern (z. B. "TPN steht für...")

2.4 WHEN der LLM relevante Chunks als Kontext erhält THEN SHALL das System keine rohen Dokumentfragmente direkt in die Antwort einfügen

2.5 WHEN der Chatbot eine Antwort mit Quellen zurückgibt THEN SHALL das System den tatsächlichen Dateinamen des Quelldokuments in den Quellenangaben anzeigen

### Unchanged Behavior (Regression Prevention)

3.1 WHEN ein Dokument hochgeladen wird THEN SHALL das System CONTINUE TO das Dokument in der Datenbank speichern und den Text extrahieren wie bisher

3.2 WHEN die Vektorsuche keine Treffer findet THEN SHALL das System CONTINUE TO eine leere `sources`-Liste zurückgeben und den LLM ohne Kontext aufrufen

3.3 WHEN das Ollama-Embedding-Modell nicht erreichbar ist THEN SHALL das System CONTINUE TO graceful degradieren (leeres Embedding zurückgeben) ohne den Upload-Prozess zu unterbrechen

3.4 WHEN eine Frage gestellt wird, deren Antwort nicht im Dokument enthalten ist THEN SHALL das System CONTINUE TO klar kommunizieren, dass die Information nicht im Kontext gefunden wurde

3.5 WHEN ein Benutzer ein Dokument hochlädt THEN SHALL das System CONTINUE TO die Authentifizierung und Autorisierung wie bisher durchführen

3.6 WHEN der `ChatController` Suchergebnisse verarbeitet THEN SHALL das System CONTINUE TO `documentId`, `chunkText` und `similarity` unverändert in den Quellen zurückgeben

---

## Bug Condition (Pseudocode)

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type DocumentUploadOrChatQuery
  OUTPUT: boolean

  // Bug tritt auf wenn:
  // (a) Ein Dokument indiziert wird und dummyEmbedding statt generateEmbedding verwendet wird
  // (b) Eine Chat-Anfrage gestellt wird und der filename leer zurückgegeben wird
  RETURN (X is DocumentUpload AND X.usesRealEmbedding = false)
      OR (X is ChatQuery AND X.sourcesContainEmptyFilename = true)
END FUNCTION
```

```pascal
// Property: Fix Checking – Korrekte Embeddings beim Indizieren
FOR ALL X WHERE X is DocumentUpload DO
  chunks ← indexDocument'(X)
  ASSERT FOR ALL chunk IN chunks: chunk.embedding = generateEmbedding(chunk.text)
  ASSERT chunk.embedding ≠ dummySinusEmbedding(chunk.text)
END FOR

// Property: Fix Checking – Dateiname in Quellenangaben
FOR ALL X WHERE X is ChatQuery AND searchResults(X).length > 0 DO
  result ← chatQuery'(X)
  ASSERT FOR ALL source IN result.sources: source.filename ≠ ''
END FOR
```

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR
```
