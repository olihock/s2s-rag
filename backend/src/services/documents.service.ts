import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { VectorService } from '../vector/vector.service';
import { LlmService } from './llm.service';
import { Document, SupportedLanguage } from '../types';
import { v4 as uuidv4 } from 'uuid';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const MAX_PDF_SIZE = 100 * 1024 * 1024; // 100 MB
const CHUNK_SIZE = 500; // characters
const CHUNK_OVERLAP = 100;

type MulterFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vectorService: VectorService,
    private readonly llmService: LlmService,
  ) {}

  async uploadPdf(
    file: MulterFile,
    ownerId: string,
    folderId: string | undefined,
  ): Promise<Document> {
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }
    if (file.size > MAX_PDF_SIZE) {
      throw new BadRequestException('File size exceeds 100MB limit');
    }

    let contentText = '';
    let extractionFailed = false;
    try {
      const rawText = await this.extractPdfText(file.buffer);

      if (this.isGarbledText(rawText)) {
        const ratio = this.cjkRatio(rawText);
        this.logger.warn(
          `PDF "${file.originalname}" has garbled text after extraction ` +
            `(${(ratio * 100).toFixed(1)}% CJK characters — font encoding mismatch). ` +
            `Document will be stored but NOT indexed. Re-upload via OCR to enable search.`,
        );
        extractionFailed = true;
        contentText = rawText;
      } else {
        contentText = rawText;
        this.logger.log(
          `PDF "${file.originalname}" parsed: ${contentText.length} characters extracted`,
        );
      }
    } catch (err) {
      this.logger.warn(`Failed to parse PDF "${file.originalname}": ${(err as Error).message}`);
      contentText = '';
      extractionFailed = true;
    }

    const detectedLanguage = this.detectLanguage(contentText);

    const doc = await this.prisma.document.create({
      data: {
        ownerId,
        folderId: folderId ?? null,
        filename: file.originalname,
        fileSize: file.size,
        contentText,
        detectedLanguage,
        searchable: !extractionFailed,
        status: extractionFailed ? 'excluded' : 'active',
        metadata: extractionFailed ? { extractionError: 'garbled_text' } : {},
      },
    });

    // Index in Milvus asynchronously — only if text extraction succeeded
    if (!extractionFailed) {
      this.indexDocument(doc.id, ownerId, contentText, detectedLanguage).catch((err: unknown) =>
        this.logger.error(`Failed to index document ${doc.id}`, err),
      );
    }

    return this.mapDocument(doc);
  }

  async listDocuments(ownerId: string): Promise<Document[]> {
    const docs = await this.prisma.document.findMany({ where: { ownerId } });
    return docs.map((d: Parameters<typeof this.mapDocument>[0]) => this.mapDocument(d));
  }

  async findById(id: string, userId: string): Promise<Document> {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.ownerId !== userId) throw new ForbiddenException();
    return this.mapDocument(doc);
  }

  async excludeFromSearch(id: string, userId: string): Promise<void> {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.ownerId !== userId) throw new ForbiddenException();

    await this.prisma.document.update({
      where: { id },
      data: { searchable: false, status: 'excluded' },
    });
  }

  async reEnableSearch(id: string, userId: string): Promise<void> {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.ownerId !== userId) throw new ForbiddenException();

    await this.prisma.document.update({
      where: { id },
      data: { searchable: true, status: 'active' },
    });
  }

  detectLanguage(text: string): SupportedLanguage {
    // Heuristic: count common German words
    const germanWords = [
      'der',
      'die',
      'das',
      'und',
      'von',
      'mit',
      'ist',
      'ein',
      'eine',
      'auf',
      'für',
      'nicht',
      'Sie',
      'ich',
      'wir',
    ];
    const words = text.toLowerCase().split(/\s+/);
    const germanCount = words.filter((w) => germanWords.includes(w)).length;
    const ratio = germanCount / Math.max(words.length, 1);
    return ratio > 0.05 ? 'de' : 'en';
  }

  private async indexDocument(
    documentId: string,
    ownerId: string,
    text: string,
    language: SupportedLanguage,
  ): Promise<void> {
    const chunks = this.chunkText(text);
    if (chunks.length === 0) return;

    // Use real embedding model for semantic search
    const chunkData = await Promise.all(
      chunks.map(async (chunk, i) => ({
        id: uuidv4(),
        documentId,
        ownerId,
        chunkText: chunk,
        language,
        chunkIndex: i,
        embedding: await this.llmService.generateEmbedding(chunk),
      })),
    );

    await this.vectorService.insertChunks(chunkData);
  }

  /** Extract plain text from a PDF buffer using PDF.js (handles complex font encoding). */
  private async extractPdfText(buffer: Buffer): Promise<string> {
    const data = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({ data, useSystemFonts: true });
    const pdfDocument = await loadingTask.promise;

    const pageTexts: string[] = [];
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => ('str' in item ? item.str : '')).join(' ');
      pageTexts.push(pageText);
    }

    return pageTexts.join('\n');
  }

  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + CHUNK_SIZE, text.length);
      chunks.push(text.slice(start, end));
      start += CHUNK_SIZE - CHUNK_OVERLAP;
    }
    return chunks.filter((c) => c.trim().length > 0);
  }

  /** Returns the fraction of non-whitespace characters that are CJK (Korean, Chinese, Japanese). */
  cjkRatio(text: string): number {
    const nonWs = text.replace(/\s/g, '');
    if (nonWs.length === 0) return 0;
    // Hangul syllables, Hangul Jamo, CJK Unified Ideographs, CJK Extension A
    const cjk = nonWs.match(/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7A3\u4E00-\u9FFF\u3400-\u4DBF]/g);
    return (cjk?.length ?? 0) / nonWs.length;
  }

  /** Returns true when the extracted text looks like an encoding artefact (>10% CJK). */
  private isGarbledText(text: string): boolean {
    return this.cjkRatio(text) > 0.1;
  }

  private mapDocument(doc: {
    id: string;
    ownerId: string;
    folderId: string | null;
    filename: string;
    uploadDate: Date;
    fileSize: number;
    contentText: string;
    detectedLanguage: string;
    searchable: boolean;
    status: string;
    ocrConfidence: number | null;
    metadata: unknown;
  }): Document {
    return {
      id: doc.id,
      ownerId: doc.ownerId,
      folderId: doc.folderId,
      filename: doc.filename,
      uploadDate: doc.uploadDate,
      fileSize: doc.fileSize,
      contentText: doc.contentText,
      detectedLanguage: doc.detectedLanguage as SupportedLanguage,
      searchable: doc.searchable,
      status: doc.status as Document['status'],
      ocrConfidence: doc.ocrConfidence,
      metadata: doc.metadata as Record<string, unknown>,
    };
  }
}
