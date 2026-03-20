import React from 'react';
import type { SupportedLanguage } from '../types/types';

interface LanguageSettingsProps {
  currentLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
}

const LANGUAGES: { code: SupportedLanguage; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
];

export const LanguageSettings: React.FC<LanguageSettingsProps> = ({
  currentLanguage,
  onLanguageChange,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Language / Sprache</h3>
      <div className="space-y-2">
        {LANGUAGES.map((lang) => (
          <label key={lang.code} className="flex items-center gap-3 cursor-pointer group">
            <input
              type="radio"
              name="language"
              value={lang.code}
              checked={currentLanguage === lang.code}
              onChange={() => onLanguageChange(lang.code)}
              aria-label={`${lang.label} (${lang.nativeLabel})`}
              className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 group-hover:text-primary-600">
              <span className="font-medium">{lang.nativeLabel}</span>
              {lang.code !== 'en' && (
                <span className="text-gray-400 ml-1">({lang.label})</span>
              )}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};
