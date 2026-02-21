/**
 * Calculates the Wilson Score Interval for a Bernoulli distribution.
 * This provides a reliable confidence interval for win rates even with small samples.
 */
export function calculateWilsonInterval(successes: number, total: number, _confidence: number = 0.95) {
    if (total === 0) return { lower: 0, upper: 0, center: 0 };

    // Z-score for confidence level (e.g., 1.96 for 95%)
    const z = 1.96;
    const phat = successes / total;

    const denominator = 1 + z ** 2 / total;
    const center = (phat + (z ** 2 / (2 * total))) / denominator;
    const spread = z * Math.sqrt((phat * (1 - phat) + (z ** 2 / (4 * total))) / total) / denominator;

    return {
        lower: Math.max(0, center - spread),
        upper: Math.min(1, center + spread),
        center: phat
    };
}

export interface StatsResult {
    variantId: string;
    wins: number;
    losses: number;
    ties: number;
    total: number;
    winRate: number;
    wilson: { lower: number; upper: number; center: number };
}

/**
 * Computes statistics for each prompt variant based on judgments.
 */
export function calculateExperimentStats(judgments: any[], variants: any[]): StatsResult[] {
    const totalJudgments = judgments.length;

    return variants.map(variant => {
        const wins = judgments.filter(j => j.selectedVariantId === variant.id).length;
        const ties = judgments.filter(j => ['tie', 'tie-good', 'tie-bad'].includes(j.selectedVariantId)).length;
        const total = totalJudgments;

        const winRate = total > 0 ? wins / total : 0;

        return {
            variantId: variant.id,
            wins,
            losses: total - wins - ties,
            ties,
            total,
            winRate,
            wilson: calculateWilsonInterval(wins, total)
        };
    });
}
