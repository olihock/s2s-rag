import React, { useState, useEffect } from 'react';
import { Upload } from './components/Upload';
import { VoiceInput } from './components/VoiceInput';
import { Answer } from './components/Answer';
import { OCRUpload } from './components/OCRUpload';
import { FolderTree } from './components/FolderTree';
import { ShareFolder } from './components/ShareFolder';
import { RecycleBin } from './components/RecycleBin';
import { LanguageSettings } from './components/LanguageSettings';
import { listDocuments, listFolders, createFolder, deleteFolder, listRecycleBin, login, register } from './services/api';
import type { Document, Folder, VoiceQueryResult, RecycleBinItem, SupportedLanguage } from './types/types';

type Tab = 'documents' | 'folders' | 'recycle-bin' | 'settings';

export default function App(): React.ReactElement {
  const [accessToken, setAccessToken] = useState<string | null>(
    () => localStorage.getItem('accessToken'),
  );
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [recycleBinItems, setRecycleBinItems] = useState<RecycleBinItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [voiceResult, setVoiceResult] = useState<VoiceQueryResult | null>(null);
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [activeTab, setActiveTab] = useState<Tab>('documents');
  const [shareFolderId, setShareFolderId] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const loadData = async (): Promise<void> => {
    const [docs, fols, bin] = await Promise.all([
      listDocuments(),
      listFolders(),
      listRecycleBin(),
    ]);
    setDocuments(docs);
    setFolders(fols);
    setRecycleBinItems(bin);
  };

  useEffect(() => {
    if (accessToken) void loadData();
  }, [accessToken]);

  const handleAuth = async (mode: 'login' | 'register'): Promise<void> => {
    setAuthError(null);
    try {
      const res =
        mode === 'login'
          ? await login(loginEmail, loginPassword)
          : await register(loginEmail, loginPassword, language);

      localStorage.setItem('accessToken', res.accessToken);
      setAccessToken(res.accessToken);
      setLanguage(res.user.preferredLanguage);
    } catch {
      setAuthError('Authentication failed. Please check your credentials.');
    }
  };

  const handleLogout = (): void => {
    localStorage.removeItem('accessToken');
    setAccessToken(null);
  };

  if (!accessToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-bold text-gray-800 text-center">PDF Voice RAG</h1>
          {authError && <p className="text-sm text-red-600 text-center">{authError}</p>}
          <input
            type="email"
            placeholder="Email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleAuth('login'); }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={() => void handleAuth('login')}
            className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
          >
            Login
          </button>
          <button
            onClick={() => void handleAuth('register')}
            className="w-full py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 font-medium"
          >
            Register
          </button>
        </div>
      </div>
    );
  }

  const shareFolderObj = folders.find((f) => f.id === shareFolderId) ?? null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">PDF Voice RAG</h1>
          <div className="flex items-center gap-4">
            <nav className="flex gap-1 text-sm">
              {(['documents', 'folders', 'recycle-bin', 'settings'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg capitalize ${
                    activeTab === tab
                      ? 'bg-primary-100 text-primary-700 font-medium'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.replace('-', ' ')}
                </button>
              ))}
            </nav>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {activeTab === 'documents' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Upload onSuccess={() => void loadData()} folderId={selectedFolder?.id} />
              <OCRUpload onSuccess={() => void loadData()} folderId={selectedFolder?.id} />
            </div>

            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">My Documents</h2>
              <span className="text-sm text-gray-400">{documents.length} document(s)</span>
            </div>

            <ul className="space-y-2">
              {documents.map((doc) => (
                <li key={doc.id} className="bg-white rounded-lg p-3 shadow-sm flex items-center gap-3">
                  <svg className="h-5 w-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{doc.filename}</p>
                    <p className="text-xs text-gray-400">
                      {doc.detectedLanguage.toUpperCase()} · {(doc.fileSize / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    doc.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {doc.status}
                  </span>
                </li>
              ))}
            </ul>

            {/* Voice Q&A */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold text-gray-700 mb-4">Ask a Question</h2>
              <VoiceInput
                documentIds={documents.map((d) => d.id)}
                onResult={setVoiceResult}
                language={language}
              />
            </div>

            {voiceResult && (
              <Answer result={voiceResult} />
            )}
          </>
        )}

        {activeTab === 'folders' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FolderTree
              folders={folders}
              selectedFolderId={selectedFolder?.id}
              onSelect={setSelectedFolder}
              onCreateFolder={async (name, parentId) => {
                await createFolder(name, parentId);
                await loadData();
              }}
              onDeleteFolder={async (id) => {
                await deleteFolder(id);
                await loadData();
              }}
            />
            <div className="md:col-span-2 space-y-2">
              {selectedFolder && (
                <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
                  <p className="font-medium text-gray-700">{selectedFolder.name}</p>
                  <button
                    onClick={() => setShareFolderId(selectedFolder.id)}
                    className="text-sm px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Share
                  </button>
                </div>
              )}
              {documents
                .filter((d) => d.folderId === selectedFolder?.id)
                .map((doc) => (
                  <div key={doc.id} className="bg-white rounded-lg p-3 shadow-sm text-sm text-gray-700">
                    {doc.filename}
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'recycle-bin' && (
          <RecycleBin items={recycleBinItems} onItemsChanged={() => void loadData()} />
        )}

        {activeTab === 'settings' && (
          <LanguageSettings currentLanguage={language} onLanguageChange={setLanguage} />
        )}
      </main>

      {/* Share folder modal */}
      {shareFolderId && shareFolderObj && (
        <ShareFolder
          folderId={shareFolderId}
          folderName={shareFolderObj.name}
          onClose={() => setShareFolderId(null)}
        />
      )}
    </div>
  );
}
