import React, { useRef, useState } from 'react';
import type { VoiceQueryResult } from '../types/types';

interface AnswerProps {
  result: VoiceQueryResult;
}

export const Answer: React.FC<AnswerProps> = ({ result }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const handlePlay = (): void => {
    if (!result.audioUrl || !audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      void audioRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
      {/* Transcription */}
      <div className="text-sm text-gray-500">
        <span className="font-medium">You asked:</span> {result.transcription}
      </div>

      {/* Answer */}
      <div className="text-gray-800 text-base leading-relaxed">{result.answer}</div>

      {/* Play button */}
      {result.audioUrl && (
        <div className="flex items-center gap-3">
          <audio
            ref={audioRef}
            src={result.audioUrl}
            onEnded={() => setPlaying(false)}
            className="hidden"
          />
          <button
            aria-label={playing ? 'Pause' : 'Play'}
            onClick={handlePlay}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            {playing ? (
              <>
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Pause
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Play answer
              </>
            )}
          </button>
          <span className="text-xs text-gray-400">
            {result.language === 'de' ? 'Deutsch' : 'English'}
          </span>
        </div>
      )}

      {/* Sources */}
      {result.sources.length > 0 && (
        <div className="border-t pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Sources
          </p>
          <ul className="space-y-2">
            {result.sources.map((source, i) => (
              <li key={i} className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-gray-700">{source.filename || source.documentId}</p>
                <p className="text-gray-500 truncate">{source.chunkText}</p>
                <p className="text-xs text-primary-500 mt-1">
                  Similarity: {(source.similarity * 100).toFixed(0)}%
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
