import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { MilvusClient, DataType, MetricType, IndexType } from '@zilliz/milvus2-sdk-node';

export const DOCUMENTS_COLLECTION = 'documents';
export const VECTOR_DIMENSION = 768;

@Injectable()
export class VectorService implements OnModuleInit {
  private readonly logger = new Logger(VectorService.name);
  private client: MilvusClient;

  constructor() {
    const host = process.env.MILVUS_HOST ?? 'localhost';
    const port = process.env.MILVUS_PORT ?? '19530';
    this.client = new MilvusClient({ address: `${host}:${port}` });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureCollection();
    this.logger.log('Milvus connection established and collection ready');
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.checkHealth();
      return true;
    } catch {
      return false;
    }
  }

  private async ensureCollection(): Promise<void> {
    const exists = await this.client.hasCollection({ collection_name: DOCUMENTS_COLLECTION });
    if (exists.value) {
      this.logger.log(`Collection "${DOCUMENTS_COLLECTION}" already exists`);
      return;
    }

    await this.client.createCollection({
      collection_name: DOCUMENTS_COLLECTION,
      fields: [
        {
          name: 'id',
          data_type: DataType.VarChar,
          is_primary_key: true,
          max_length: 36,
        },
        {
          name: 'document_id',
          data_type: DataType.VarChar,
          max_length: 36,
        },
        {
          name: 'owner_id',
          data_type: DataType.VarChar,
          max_length: 36,
        },
        {
          name: 'chunk_text',
          data_type: DataType.VarChar,
          max_length: 65535,
        },
        {
          name: 'language',
          data_type: DataType.VarChar,
          max_length: 2,
        },
        {
          name: 'chunk_index',
          data_type: DataType.Int32,
        },
        {
          name: 'embedding',
          data_type: DataType.FloatVector,
          dim: VECTOR_DIMENSION,
        },
      ],
    });

    await this.client.createIndex({
      collection_name: DOCUMENTS_COLLECTION,
      field_name: 'embedding',
      index_name: 'embedding_idx',
      index_type: IndexType.IVF_FLAT,
      metric_type: MetricType.COSINE,
      params: { nlist: 128 },
    });

    await this.client.loadCollection({ collection_name: DOCUMENTS_COLLECTION });
    this.logger.log(`Collection "${DOCUMENTS_COLLECTION}" created and loaded`);
  }

  async insertChunks(
    chunks: Array<{
      id: string;
      documentId: string;
      ownerId: string;
      chunkText: string;
      language: string;
      chunkIndex: number;
      embedding: number[];
    }>,
  ): Promise<void> {
    const data = {
      fields_data: chunks.map((c) => ({
        id: c.id,
        document_id: c.documentId,
        owner_id: c.ownerId,
        chunk_text: c.chunkText,
        language: c.language,
        chunk_index: c.chunkIndex,
        embedding: c.embedding,
      })),
    };

    await this.client.insert({
      collection_name: DOCUMENTS_COLLECTION,
      data: data.fields_data,
    });
    await this.client.flush({ collection_names: [DOCUMENTS_COLLECTION] });
  }

  async search(
    queryEmbedding: number[],
    ownerId: string,
    topK = 5,
  ): Promise<
    Array<{
      id: string;
      documentId: string;
      chunkText: string;
      similarity: number;
    }>
  > {
    const results = await this.client.search({
      collection_name: DOCUMENTS_COLLECTION,
      vectors: [queryEmbedding],
      filter: `owner_id == "${ownerId}"`,
      output_fields: ['id', 'document_id', 'chunk_text'],
      limit: topK,
      metric_type: MetricType.COSINE,
    });

    return (results.results[0] ?? []).map((r) => ({
      id: r.id as string,
      documentId: r.document_id as string,
      chunkText: r.chunk_text as string,
      similarity: r.score,
    }));
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    await this.client.deleteEntities({
      collection_name: DOCUMENTS_COLLECTION,
      filter: `document_id == "${documentId}"`,
    });
  }
}
