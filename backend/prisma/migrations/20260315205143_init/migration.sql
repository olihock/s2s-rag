-- CreateEnum
CREATE TYPE "SupportedLanguage" AS ENUM ('en', 'de');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('active', 'excluded', 'recycle_bin');

-- CreateEnum
CREATE TYPE "SharePermission" AS ENUM ('read');

-- CreateEnum
CREATE TYPE "RecycleBinItemType" AS ENUM ('document', 'folder');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "preferredLanguage" "SupportedLanguage" NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "folderId" TEXT,
    "filename" TEXT NOT NULL,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileSize" INTEGER NOT NULL,
    "contentText" TEXT NOT NULL,
    "detectedLanguage" "SupportedLanguage" NOT NULL DEFAULT 'en',
    "searchable" BOOLEAN NOT NULL DEFAULT true,
    "status" "DocumentStatus" NOT NULL DEFAULT 'active',
    "ocrConfidence" DOUBLE PRECISION,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentFolderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FolderShare" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "permission" "SharePermission" NOT NULL DEFAULT 'read',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FolderShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceQuery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transcribedText" TEXT NOT NULL,
    "audioFileUrl" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "searchResultIds" TEXT[],

    CONSTRAINT "VoiceQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecycleBin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemType" "RecycleBinItemType" NOT NULL,
    "itemId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalLocation" TEXT NOT NULL,

    CONSTRAINT "RecycleBin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Document_ownerId_idx" ON "Document"("ownerId");

-- CreateIndex
CREATE INDEX "Document_folderId_idx" ON "Document"("folderId");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- CreateIndex
CREATE INDEX "Folder_ownerId_idx" ON "Folder"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Folder_ownerId_name_parentFolderId_key" ON "Folder"("ownerId", "name", "parentFolderId");

-- CreateIndex
CREATE INDEX "FolderShare_recipientUserId_idx" ON "FolderShare"("recipientUserId");

-- CreateIndex
CREATE UNIQUE INDEX "FolderShare_folderId_recipientUserId_key" ON "FolderShare"("folderId", "recipientUserId");

-- CreateIndex
CREATE INDEX "VoiceQuery_userId_idx" ON "VoiceQuery"("userId");

-- CreateIndex
CREATE INDEX "RecycleBin_userId_idx" ON "RecycleBin"("userId");

-- CreateIndex
CREATE INDEX "RecycleBin_deletedAt_idx" ON "RecycleBin"("deletedAt");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentFolderId_fkey" FOREIGN KEY ("parentFolderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderShare" ADD CONSTRAINT "FolderShare_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderShare" ADD CONSTRAINT "FolderShare_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceQuery" ADD CONSTRAINT "VoiceQuery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecycleBin" ADD CONSTRAINT "RecycleBin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
