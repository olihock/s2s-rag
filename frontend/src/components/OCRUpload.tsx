import React, { useState, useCallback } from 'react';
import { uploadOcrDocument } from '../services/api';
import type { Document } from '../types/types';

interface OCRUploadProps {
  onSuccess: (doc: Document) => void;
  folderId?: string;
}

export const OCRUpload: React.FC<OCRUploadProps> = ({ onSuccess, folderId }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        setError('Only JPEG and PNG files are allowed');
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        setError('File size must not exceed 25 MB');
        return;
      }

      setPreview(URL.createObjectURL(file));
      setUploading(true);

      try {
        const doc = await uploadOcrDocument(file, folderId);
        onSuccess(doc);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'OCR upload failed');
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

  return (
    <div className="w-full">
      <div className="border-2 border-dashed rounded-xl p-8 text-center border-gray-300 hover:border-primary-400 transition-colors">
        <svg className="mx-auto mb-3 h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="font-semibold text-gray-700">Scan Document (OCR)</p>
        <p className="text-sm text-gray-500 mt-1">JPEG or PNG, max 25 MB</p>

        <input
          data-testid="ocr-file-input"
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          id="ocr-upload"
          onChange={handleChange}
          disabled={uploading}
        />
        <label
          htmlFor="ocr-upload"
          className="mt-4 inline-block px-4 py-2 bg-green-600 text-white rounded-lg cursor-pointer hover:bg-green-700"
        >
          {uploading ? 'Uploading…' : 'Choose Photo'}
        </label>
      </div>

      {preview && (
        <img src={preview} alt="Preview" className="mt-4 max-h-40 rounded-lg object-contain mx-auto" />
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
};
