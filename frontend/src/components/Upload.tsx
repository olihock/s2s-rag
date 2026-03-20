import React, { useState, useCallback } from 'react';
import { uploadDocument } from '../services/api';
import type { Document } from '../types/types';

interface UploadProps {
  onSuccess: (doc: Document) => void;
  folderId?: string;
}

export const Upload: React.FC<UploadProps> = ({ onSuccess, folderId }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (file.type !== 'application/pdf') {
        setError('Only PDF files are allowed');
        return;
      }

      if (file.size > 100 * 1024 * 1024) {
        setError('File size must not exceed 100 MB');
        return;
      }

      setUploading(true);
      setProgress(0);

      try {
        const doc = await uploadDocument(file, folderId);
        setProgress(100);
        onSuccess(doc);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [onSuccess, folderId],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
          ${dragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'}`}
      >
        <svg className="mx-auto mb-4 h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-lg font-semibold text-gray-700">Upload PDF Document</p>
        <p className="mt-1 text-sm text-gray-500">Drag & drop or click to select (max 100 MB)</p>
        <input
          data-testid="file-input"
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          id="pdf-upload"
          onChange={handleChange}
          disabled={uploading}
        />
        <label
          htmlFor="pdf-upload"
          className="mt-4 inline-block px-4 py-2 bg-primary-600 text-white rounded-lg cursor-pointer hover:bg-primary-700"
        >
          Choose File
        </label>
      </div>

      {uploading && (
        <div className="mt-4">
          <progress
            data-testid="upload-progress"
            value={progress}
            max={100}
            className="h-2 w-full bg-gray-200 rounded-full overflow-hidden"
            title="Upload progress"
          />
          <p className="mt-1 text-sm text-gray-500 text-center">Uploading…</p>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
