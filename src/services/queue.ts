import { db, type Experiment, type Generation, type DatasetRow, type PromptVariant } from '../db/db';
import { generateText } from './llm';
import { generateCacheKey } from '../utils/csv';
import { renderTemplate } from '../utils/template';
import { v4 as uuidv4 } from 'uuid';

export interface ProgressUpdate {
    total: number;
    completed: number;
    failed: number;
    active: boolean;
    isRetrying?: boolean;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Manages batch generation tasks with concurrency and caching.
 */
export class GenerationQueue {
    private experiment: Experiment;
    private rows: DatasetRow[];
    private apiKey: string;
    private onProgress: (progress: ProgressUpdate) => void;

    private completedCount = 0;
    private failedCount = 0;
    private retryCount = 0; // Number of workers currently in a retry loop
    private isRunning = false;

    get active() {
        return this.isRunning;
    }

    constructor(
        experiment: Experiment,
        rows: DatasetRow[],
        apiKey: string,
        onProgress: (progress: ProgressUpdate) => void
    ) {
        this.experiment = experiment;
        this.rows = rows;
        this.apiKey = apiKey;
        this.onProgress = onProgress;
    }

    private updateProgress() {
        const variants = this.experiment.promptVariants;
        const reps = this.experiment.modelConfig.repetitions || 1;
        const total = this.rows.length * variants.length * reps;

        this.onProgress({
            total,
            completed: this.completedCount,
            failed: this.failedCount,
            active: this.isRunning,
            isRetrying: this.retryCount > 0
        });
    }

    async start() {
        this.isRunning = true;
        this.completedCount = 0;
        this.failedCount = 0;
        this.retryCount = 0;

        const variants = this.experiment.promptVariants;
        const reps = this.experiment.modelConfig.repetitions || 1;
        const tasks: { row: DatasetRow; variant: PromptVariant; repIndex: number }[] = [];

        for (const row of this.rows) {
            for (const variant of variants) {
                for (let r = 0; r < reps; r++) {
                    tasks.push({ row, variant, repIndex: r });
                }
            }
        }

        // Global settings
        const concurrency = Number(localStorage.getItem('global_concurrency')) || 3;
        const delay = (Number(localStorage.getItem('global_request_delay')) || 0) * 1000;
        const taskQueue = [...tasks];

        this.updateProgress();

        const workers = Array(concurrency).fill(null).map(async (_, workerIndex) => {
            if (delay > 0) {
                await sleep(workerIndex * (delay / concurrency));
            }

            while (taskQueue.length > 0 && this.isRunning) {
                const task = taskQueue.shift();
                if (!task) break;

                try {
                    await this.processTask(task.row, task.variant, task.repIndex);
                    this.completedCount++;
                } catch (error) {
                    console.error('Task failed:', error);
                    this.failedCount++;
                }

                this.updateProgress();

                if (delay > 0 && taskQueue.length > 0 && this.isRunning) {
                    await sleep(delay);
                }
            }
        });

        await Promise.all(workers);
        this.isRunning = false;
        this.updateProgress();

        return { completed: this.completedCount, failed: this.failedCount };
    }

    stop() {
        this.isRunning = false;
        this.updateProgress();
    }

    private async processTask(row: DatasetRow, variant: PromptVariant, repIndex: number) {
        const cacheKey = await generateCacheKey(`${variant.version}-rep${repIndex}`, row.content, this.experiment.modelConfig);

        const existingInExperiment = await db.generations
            .where('[experimentId+rowId+variantId+repIndex]')
            .equals([this.experiment.id, row.id!, variant.id, repIndex])
            .first();

        if (existingInExperiment && !existingInExperiment.error) {
            return;
        }

        const cached = await db.generations.where('cacheKey').equals(cacheKey).first();
        if (cached && !cached.error) {
            await db.generations.put({
                ...cached,
                id: uuidv4(),
                experimentId: this.experiment.id,
                rowId: row.id!,
                variantId: variant.id,
                repIndex: repIndex,
                timestamp: Date.now()
            });
            return;
        }

        const renderedPrompt = renderTemplate(variant.template, row.content);

        const onRetry = (isRetrying: boolean) => {
            if (isRetrying) this.retryCount++;
            else this.retryCount = Math.max(0, this.retryCount - 1);
            this.updateProgress();
        };

        const result = await generateText(renderedPrompt, this.experiment.modelConfig, this.apiKey, onRetry);

        const generation: Generation = {
            id: uuidv4(),
            experimentId: this.experiment.id,
            rowId: row.id!,
            variantId: variant.id,
            repIndex,
            output: result.output,
            modelConfig: this.experiment.modelConfig,
            tokenUsage: result.usage,
            latency: result.latency,
            cacheKey,
            timestamp: Date.now(),
            error: result.error
        };

        await db.generations.put(generation);
        if (result.error) throw new Error(result.error);
    }
}
