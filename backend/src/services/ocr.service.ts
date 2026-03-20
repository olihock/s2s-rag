import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { VectorService } from '../vector/vector.service';
import { DocumentsService } from './documents.service';
import { Document, SupportedLanguage } from '../types';
import FormData from 'form-data';

const MAX_PHOTO_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png'];

type MulterFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly whisperUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly vectorService: VectorService,
    private readonly documentsService: DocumentsService,
  ) {
    this.whisperUrl = process.env.WHISPER_URL ?? 'http://localhost:9000';
  }

  async uploadPhotoForOcr(
    file: MulterFile,
    ownerId: string,
    folderId: string | undefined,
  ): Promise<Document> {
    if (!ALLOWED_PHOTO_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG and PNG files are allowed for OCR');
    }
    if (file.size > MAX_PHOTO_SIZE) {
      throw new BadRequestException('Photo size exceeds 25MB limit');
    }

    const { text, confidence } = await this.runOcr(file.buffer, file.mimetype);
    const detectedLanguage = this.documentsService.detectLanguage(text);

    const doc = await this.prisma.document.create({
      data: {
        ownerId,
        folderId: folderId ?? null,
        filename: file.originalname,
        fileSize: file.size,
        contentText: text,
        detectedLanguage,
        searchable: true,
        status: 'active',
        ocrConfidence: confidence,
        metadata: { sourceType: 'ocr' },
      },
    });

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

  private async runOcr(
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<{ text: string; confidence: number }> {
    const form = new FormData();
    form.append('file', imageBuffer, {
      filename: 'image.jpg',
      contentType: mimeType,
    });
    form.append('response_format', 'json');

    const response = await fetch(`${this.whisperUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      body: form as unknown as BodyInit,
      headers: form.getHeaders(),
    });

    if (!response.ok) {
      this.logger.error(`OCR failed: ${response.status}`);
      return { text: '', confidence: 0 };
    }

    const data = (await response.json()) as { text: string; confidence?: number };
    return {
      text: data.text ?? '',
      confidence: (data.confidence ?? 0.8) * 100,
    };
  }
}
