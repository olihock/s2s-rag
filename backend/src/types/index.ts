// ─────────────── Shared language type ───────────────
export type SupportedLanguage = 'en' | 'de';

// ─────────────── User types ───────────────
export interface User {
  id: string;
  email: string;
  preferredLanguage: SupportedLanguage;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────── Document types ───────────────
export type DocumentStatus = 'active' | 'excluded' | 'recycle-bin';

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

// ─────────────── Folder types ───────────────
export interface Folder {
  id: string;
  ownerId: string;
  name: string;
  parentFolderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────── FolderShare types ───────────────
export type SharePermission = 'read';

export interface FolderShare {
  id: string;
  folderId: string;
  recipientUserId: string;
  permission: SharePermission;
  grantedAt: Date;
}

// ─────────────── VoiceQuery types ───────────────
export interface VoiceQuery {
  id: string;
  userId: string;
  transcribedText: string;
  audioFileUrl: string | null;
  timestamp: Date;
  searchResultIds: string[];
}

// ─────────────── SearchIndex / Vector types ───────────────
export interface SearchIndex {
  id: string;
  documentId: string;
  chunkText: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

// ─────────────── RecycleBin types ───────────────
export type RecycleBinItemType = 'document' | 'folder';

export interface RecycleBinItem {
  id: string;
  userId: string;
  itemType: RecycleBinItemType;
  itemId: string;
  deletedAt: Date;
  originalLocation: string;
}

// ─────────────── API Response types ───────────────
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  timestamp: string;
  path: string;
}

// ─────────────── Auth types ───────────────
export interface JwtPayload {
  sub: string; // userId
  email: string;
  iat?: number;
  exp?: number;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

// ─────────────── Voice Q&A types ───────────────
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

// ─────────────── Upload types ───────────────
export interface UploadDocumentDto {
  folderId?: string;
}

export type AllowedMimeType = 'application/pdf' | 'image/jpeg' | 'image/png';

// ─────────────── Chat Q&A types ───────────────
export interface ChatQueryResult {
  answer: string;
  sources: Array<{
    documentId: string;
    filename: string;
    chunkText: string;
    similarity: number;
  }>;
}
