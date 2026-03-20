import React, { useState, useRef, useCallback } from 'react';
import { queryWithVoice } from '../services/api';
import type { VoiceQueryResult } from '../types/types';

interface VoiceInputProps {
  documentIds: string[];
  onResult: (result: VoiceQueryResult) => void;
  language?: 'en' | 'de';
}

type RecordingState = 'idle' | 'recording' | 'processing' | 'error';

export const VoiceInput: React.FC<VoiceInputProps> = ({ documentIds, onResult, language }) => {
  const [state, setState] = useState<RecordingState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    setErrorMsg(null);
    setState('recording');
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start();
    } catch {
      setState('error');
      setErrorMsg('Microphone access denied');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    setState('processing');

    const audioBlob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(chunksRef.current, { type: 'audio/webm' }));
      };
      recorder.stop();
      recorder.stream.getTracks().forEach((t) => t.stop());
    });

    try {
      const result = await queryWithVoice(audioBlob, documentIds, language);
      onResult(result);
      setState('idle');
    } catch {
      setState('error');
      setErrorMsg('Voice query failed. Please try again.');
    }
  }, [documentIds, onResult, language]);

  const buttonLabel =
    state === 'idle' ? 'Hold to Speak' :
    state === 'recording' ? 'Recording…' :
    state === 'processing' ? 'Processing…' : 'Error';

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        role="button"
        aria-label={buttonLabel}
        onMouseDown={() => void startRecording()}
        onMouseUp={() => void stopRecording()}
        onTouchStart={() => void startRecording()}
        onTouchEnd={() => void stopRecording()}
        disabled={state === 'processing'}
        className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-semibold transition-all shadow-lg
          ${state === 'recording' ? 'bg-red-500 scale-110 animate-pulse' : ''}
          ${state === 'idle' ? 'bg-primary-600 hover:bg-primary-700' : ''}
          ${state === 'processing' ? 'bg-gray-400 cursor-wait' : ''}
          ${state === 'error' ? 'bg-red-400' : ''}`}
      >
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>

      <p className="text-sm text-gray-600">
        {state === 'idle' && 'Hold to Speak'}
        {state === 'recording' && <span className="text-red-500 font-medium">Recording…</span>}
        {state === 'processing' && <span className="text-gray-500">Processing…</span>}
        {state === 'error' && <span className="text-red-500">{errorMsg}</span>}
      </p>
    </div>
  );
};
