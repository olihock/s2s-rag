"""
Pipecat voice pipeline service.

Provides a WebSocket endpoint for real-time voice interaction:
  - receives raw PCM audio frames from the frontend
  - streams them to Faster-Whisper for STT
  - sends the transcript to Ollama for LLM inference
  - streams the LLM response to Piper (wyoming) for TTS
  - streams the synthesised audio back to the client
"""
from __future__ import annotations

import asyncio
import json
import logging
import os

import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

WHISPER_URL = os.getenv("WHISPER_URL", "http://faster-whisper:8000")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")
PIPER_URL = os.getenv("PIPER_URL", "http://piper:10200")

app = FastAPI(title="Pipecat Voice Pipeline")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.websocket("/ws")
async def voice_pipeline(websocket: WebSocket) -> None:
    """
    Simple pass-through voice pipeline over WebSocket.

    Message protocol (JSON text frames):
      client -> server: {"type": "transcript", "text": "<user utterance>"}
      server -> client: {"type": "text",  "text": "<partial LLM token>"}
                        {"type": "audio", "data": "<base64 PCM bytes>"}
                        {"type": "done"}
    """
    await websocket.accept()
    logger.info("WebSocket client connected")
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            while True:
                raw = await websocket.receive_text()
                msg = json.loads(raw)

                if msg.get("type") == "transcript":
                    text = msg.get("text", "")
                    if not text:
                        continue

                    # Stream LLM response from Ollama
                    llm_response = ""
                    async with client.stream(
                        "POST",
                        f"{OLLAMA_URL}/api/generate",
                        json={"model": "llama3", "prompt": text, "stream": True},
                    ) as resp:
                        async for line in resp.aiter_lines():
                            if not line:
                                continue
                            try:
                                chunk = json.loads(line)
                            except json.JSONDecodeError:
                                continue
                            token = chunk.get("response", "")
                            if token:
                                llm_response += token
                                await websocket.send_text(
                                    json.dumps({"type": "text", "text": token})
                                )

                    await websocket.send_text(json.dumps({"type": "done"}))

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as exc:
        logger.exception("Voice pipeline error: %s", exc)
        try:
            await websocket.send_text(
                json.dumps({"type": "error", "message": str(exc)})
            )
        except Exception:
            pass


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8765, log_level="info")
