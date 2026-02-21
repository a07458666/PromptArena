import { type ModelConfig } from '../db/db';

export interface GenerationResult {
    output: string;
    usage: {
        prompt: number;
        completion: number;
        total: number;
    };
    latency: number;
    error?: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries = 5,
    onRetry?: (isRetrying: boolean) => void
): Promise<Response> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) {
                if (i > 0 && onRetry) onRetry(false);
                return response;
            }

            // Handle rate limits and high demand
            if (response.status === 429 || response.status === 503) {
                if (onRetry) onRetry(true);
                const waitTime = Math.pow(2, i) * 1000 + Math.random() * 1000;
                console.warn(`API error ${response.status}. Retrying in ${waitTime.toFixed(0)}ms... (Attempt ${i + 1}/${maxRetries})`);
                await sleep(waitTime);
                continue;
            }

            if (i > 0 && onRetry) onRetry(false);
            return response; // Return other errors (400, 401, etc.) to be handled by caller
        } catch (error) {
            lastError = error;
            if (onRetry) onRetry(true);
            const waitTime = Math.pow(2, i) * 1000 + Math.random() * 1000;
            await sleep(waitTime);
        }
    }
    if (onRetry) onRetry(false);
    throw lastError || new Error('Max retries reached');
}

export async function generateText(
    prompt: string,
    config: ModelConfig,
    apiKey?: string,
    onRetry?: (isRetrying: boolean) => void
): Promise<GenerationResult> {
    const startTime = Date.now();

    const getApiKey = () => {
        if (apiKey) return apiKey;
        if (config.provider === 'openai') return import.meta.env.VITE_OPENAI_API_KEY;
        if (config.provider === 'anthropic') return import.meta.env.VITE_ANTHROPIC_API_KEY;
        if (config.provider === 'google') return import.meta.env.VITE_GOOGLE_API_KEY;
        return '';
    };

    const effectiveKey = getApiKey();
    if (!effectiveKey) {
        return {
            output: '',
            usage: { prompt: 0, completion: 0, total: 0 },
            latency: 0,
            error: `Missing API key for provider: ${config.provider}`
        };
    }

    try {
        let output = '';
        let usage = { prompt: 0, completion: 0, total: 0 };

        if (config.provider === 'openai') {
            const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${effectiveKey}`
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: config.temperature,
                    top_p: config.topP,
                    max_tokens: config.maxTokens,
                    seed: config.seed
                })
            }, 5, onRetry);
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            output = data.choices[0].message.content;
            usage = {
                prompt: data.usage.prompt_tokens,
                completion: data.usage.completion_tokens,
                total: data.usage.total_tokens
            };
        } else if (config.provider === 'anthropic') {
            const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': effectiveKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: config.maxTokens,
                    temperature: config.temperature,
                    top_p: config.topP
                })
            }, 5, onRetry);
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            output = data.content[0].text;
            usage = {
                prompt: data.usage.input_tokens,
                completion: data.usage.output_tokens,
                total: data.usage.input_tokens + data.usage.output_tokens
            };
        } else if (config.provider === 'google') {
            const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${effectiveKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: config.temperature,
                        topP: config.topP,
                        maxOutputTokens: config.maxTokens
                    }
                })
            }, 5, onRetry);
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            output = data.candidates[0].content.parts[0].text;
            usage = {
                prompt: data.usageMetadata.promptTokenCount,
                completion: data.usageMetadata.candidatesTokenCount,
                total: data.usageMetadata.totalTokenCount
            };
        } else {
            throw new Error(`Unsupported provider: ${config.provider}`);
        }

        return {
            output,
            usage,
            latency: Date.now() - startTime
        };
    } catch (error: any) {
        console.error('Generation Detail Error:', error);
        return {
            output: '',
            usage: { prompt: 0, completion: 0, total: 0 },
            latency: Date.now() - startTime,
            error: error.message || 'Unknown network error'
        };
    }
}
