import Dexie, { type Table } from 'dexie';

export interface DatasetRow {
  id?: number;
  experimentId: string;
  content: Record<string, any>;
}

export interface PromptVariant {
  id: string;
  version: string;
  template: string;
  note: string;
}

export interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  seed?: number;
  repetitions: number;
}

export interface Generation {
  id: string;
  experimentId: string;
  rowId: number;
  variantId: string;
  output: string;
  modelConfig: ModelConfig;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  latency: number;
  cacheKey: string;
  timestamp: number;
  repIndex: number;
  error?: string;
}

export interface Judgment {
  id: string;
  experimentId: string;
  rowId: number;
  selectedVariantId: string | 'tie' | 'none';
  rating: number;
  tags: string[];
  comment?: string;
  repIndex: number;
  timestamp: number;
}

export interface Experiment {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'generating' | 'evaluating' | 'finished';
  modelConfig: ModelConfig;
  promptVariants: PromptVariant[];
  createdAt: number;
  updatedAt: number;
}

export class AppDatabase extends Dexie {
  experiments!: Table<Experiment>;
  datasetRows!: Table<DatasetRow>;
  generations!: Table<Generation>;
  judgments!: Table<Judgment>;

  constructor() {
    super('PromptArenaDB');
    this.version(2).stores({
      experiments: 'id, status, createdAt',
      datasetRows: '++id, experimentId',
      generations: 'id, experimentId, rowId, variantId, cacheKey, timestamp, [experimentId+rowId+variantId+repIndex]',
      judgments: 'id, experimentId, rowId, repIndex, selectedVariantId, [experimentId+rowId+repIndex]'
    });
  }
}

export const db = new AppDatabase();
