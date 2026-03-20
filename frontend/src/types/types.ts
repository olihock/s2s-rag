// Shared types between frontend and backend
export type SupportedLanguage = 'en' | 'de';
export type DocumentStatus = 'active' | 'excluded' | 'recycle-bin';
export type SharePermission = 'read';
export type RecycleBinItemType = 'document' | 'folder';

export interface User {
  id: string;
  email: string;
  preferredLanguage: SupportedLanguage;
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  ownerId: string;
  folderId: string | null;
  filename: string;
  uploadDate: Date;
  fileSize: number;
  contentText: string;
  detectedLanguage: SupportedLanguage;
  searchable: boolean;
  status: DocumentStatus;
  ocrConfidence: number | null;
  metadata: Record<string, unknown>;
}

export interface Folder {
  id: string;
  ownerId: string;
  name: string;
  parentFolderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FolderShare {
  id: string;
  folderId: string;
  recipientUserId: string;
  permission: SharePermission;
  grantedAt: Date;
}

export interface VoiceQueryResult {
  transcription: string;
  answer: string;
  audioUrl?: string;
  sources: Array<{
    documentId: string;
    filename: string;
    chunkText: string;
    similarity: number;
  }>;
  language: SupportedLanguage;
}

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  timestamp: string;
  path: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface RecycleBinItem {
  id: string;
  userId: string;
  itemType: RecycleBinItemType;
  itemId: string;
  deletedAt: Date;
  originalLocation: string;
}
