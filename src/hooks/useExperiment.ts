import { useState, useCallback, useRef } from 'react';
import { db, type Experiment, type DatasetRow, type Judgment, type Generation } from '../db/db';
import { GenerationQueue, type ProgressUpdate } from '../services/queue';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';

export function useExperiment(experimentId: string | null) {
    const [progress, setProgress] = useState<ProgressUpdate | null>(null);
    const [apiKey, setApiKey] = useState<string>(() => sessionStorage.getItem('api_key') || '');
    const activeQueue = useRef<GenerationQueue | null>(null);

    const experiment = useLiveQuery(
        () => experimentId ? db.experiments.get(experimentId) : Promise.resolve(undefined),
        [experimentId]
    ) as Experiment | undefined;

    const rows = useLiveQuery(
        () => experimentId ? db.datasetRows.where('experimentId').equals(experimentId).toArray() : Promise.resolve([] as DatasetRow[]),
        [experimentId]
    ) || [] as DatasetRow[];

    const generations = useLiveQuery(
        () => experimentId ? db.generations.where('experimentId').equals(experimentId).toArray() : Promise.resolve([] as Generation[]),
        [experimentId]
    ) || [] as Generation[];

    const judgments = useLiveQuery(
        () => experimentId ? db.judgments.where('experimentId').equals(experimentId).toArray() : Promise.resolve([] as Judgment[]),
        [experimentId]
    ) || [] as Judgment[];

    const updateApiKey = useCallback((key: string) => {
        setApiKey(key);
        sessionStorage.setItem('api_key', key);
    }, []);

    const startBatchGeneration = useCallback(async () => {
        if (!experiment || !rows.length) return;

        const provider = experiment.modelConfig.provider;

        // Priority: localStorage (UI) -> sessionStorage (Legacy) -> .env
        const uiKey = localStorage.getItem(`${provider}_api_key`);
        const sessionKey = sessionStorage.getItem('api_key'); // Generic fallback
        const envKey = provider === 'openai' ? import.meta.env.VITE_OPENAI_API_KEY :
            provider === 'anthropic' ? import.meta.env.VITE_ANTHROPIC_API_KEY :
                provider === 'google' ? import.meta.env.VITE_GOOGLE_API_KEY : '';

        const effectiveKey = uiKey || apiKey || sessionKey || envKey;

        if (!effectiveKey) {
            alert(`Missing API key for ${provider}. Please set it in the settings or .env file.`);
            return;
        }

        await db.experiments.update(experiment.id, { status: 'generating' });

        const queue = new GenerationQueue(
            experiment,
            rows,
            effectiveKey,
            (update) => setProgress(update)
        );

        activeQueue.current = queue;
        const result = await queue.start();
        activeQueue.current = null;

        if (result.completed > 0) {
            await db.experiments.update(experiment.id, { status: 'evaluating' });
        } else if (!queue.active) { // Stopped manually
            await db.experiments.update(experiment.id, { status: 'draft' });
        }
    }, [experiment, rows, apiKey]);

    const stopBatchGeneration = useCallback(async () => {
        if (activeQueue.current) {
            activeQueue.current.stop();
            if (experimentId) {
                await db.experiments.update(experimentId, { status: 'draft' });
            }
        }
    }, [experimentId]);

    const saveJudgment = useCallback(async (judgment: Partial<Judgment>) => {
        if (!experimentId) return;
        const fullJudgment: Judgment = {
            id: uuidv4(),
            experimentId: experimentId,
            rowId: judgment.rowId!,
            repIndex: judgment.repIndex ?? 0,
            selectedVariantId: judgment.selectedVariantId!,
            rating: judgment.rating || 0,
            tags: judgment.tags || [],
            timestamp: Date.now()
        };
        await db.judgments.put(fullJudgment);

        const totalExpected = rows.length * (experiment?.modelConfig.repetitions || 1);
        if (judgments.length + 1 >= totalExpected) {
            await db.experiments.update(experimentId, { status: 'finished' });
        }
    }, [experimentId, rows, judgments, experiment]);

    return {
        experiment,
        rows,
        generations,
        judgments,
        progress,
        apiKey,
        updateApiKey,
        startBatchGeneration,
        stopBatchGeneration,
        saveJudgment
    };
}
