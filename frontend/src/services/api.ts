import axios from 'axios';
import type {
  Document,
  Folder,
  LoginResponse,
  RecycleBinItem,
  VoiceQueryResult,
  SupportedLanguage,
  ChatQueryResult,
} from '../types/types';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Attach JWT token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ──────────────── Auth ────────────────
export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/login', { email, password });
  return res.data;
}

export async function register(
  email: string,
  password: string,
  preferredLanguage?: SupportedLanguage,
): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/register', {
    email,
    password,
    preferredLanguage,
  });
  return res.data;
}

// ──────────────── Documents ────────────────
export async function uploadDocument(file: File, folderId?: string): Promise<Document> {
  const form = new FormData();
  form.append('file', file);
  if (folderId) form.append('folderId', folderId);

  const res = await api.post<Document>('/documents', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function listDocuments(): Promise<Document[]> {
  const res = await api.get<Document[]>('/documents');
  return res.data;
}

export async function uploadOcrDocument(file: File, folderId?: string): Promise<Document> {
  const form = new FormData();
  form.append('file', file);
  if (folderId) form.append('folderId', folderId);

  const res = await api.post<Document>('/documents/ocr', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function excludeDocument(id: string): Promise<void> {
  await api.patch(`/documents/${id}/exclude`);
}

export async function reEnableDocument(id: string): Promise<void> {
  await api.patch(`/documents/${id}/re-enable`);
}

export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`/documents/${id}`);
}

// ──────────────── Voice Q&A ────────────────
export async function queryWithVoice(
  audio: Blob,
  documentIds: string[],
  language?: SupportedLanguage,
): Promise<VoiceQueryResult> {
  const form = new FormData();
  form.append('audio', audio, 'voice.webm');
  if (documentIds.length > 0) form.append('documentId', documentIds[0]);
  if (language) form.append('language', language);

  const docId = documentIds[0] ?? 'all';
  const res = await api.post<VoiceQueryResult>(`/documents/${docId}/query`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

// ──────────────── Folders ────────────────
export async function listFolders(): Promise<Folder[]> {
  const res = await api.get<Folder[]>('/folders');
  return res.data;
}

export async function createFolder(name: string, parentFolderId?: string): Promise<Folder> {
  const res = await api.post<Folder>('/folders', { name, parentFolderId });
  return res.data;
}

export async function deleteFolder(id: string): Promise<void> {
  await api.delete(`/folders/${id}`);
}

export async function shareFolder(folderId: string, email: string): Promise<void> {
  await api.post(`/folders/${folderId}/share`, { email });
}

export async function revokeShare(folderId: string, email: string): Promise<void> {
  await api.delete(`/folders/${folderId}/share`, { data: { email } });
}

// ──────────────── Recycle Bin ────────────────
export async function listRecycleBin(): Promise<RecycleBinItem[]> {
  const res = await api.get<RecycleBinItem[]>('/recycle-bin');
  return res.data;
}

export async function restoreRecycleBinItem(id: string): Promise<void> {
  await api.post(`/recycle-bin/${id}/restore`);
}

export async function permanentDeleteRecycleBinItem(id: string): Promise<void> {
  await api.delete(`/recycle-bin/${id}`);
}

// ──────────────── Chat Q&A ────────────────
export async function queryWithChat(
  message: string,
  language?: SupportedLanguage,
): Promise<ChatQueryResult> {
  const res = await api.post<ChatQueryResult>('/chat/query', { message, language });
  return res.data;
}

// ──────────────── Language ────────────────
export async function updateLanguagePreference(language: SupportedLanguage): Promise<void> {
  await api.patch('/users/me/language', { preferredLanguage: language });
}
