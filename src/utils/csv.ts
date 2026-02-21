import Papa from 'papaparse';

export interface ParseResult {
    data: Record<string, any>[];
    errors: Papa.ParseError[];
    meta: Papa.ParseMeta;
}

/**
 * Parses a CSV file and returns the data as an array of objects.
 */
export function parseCSV(file: File): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                resolve(results as ParseResult);
            },
            error: (error) => {
                reject(error);
            }
        });
    });
}

/**
 * Generates a SHA-256 hash for caching purposes.
 */
export async function generateCacheKey(
    promptVersion: string,
    rowContent: Record<string, any>,
    modelConfig: any
): Promise<string> {
    const content = JSON.stringify({
        promptVersion,
        rowContent,
        modelConfig
    });
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}
