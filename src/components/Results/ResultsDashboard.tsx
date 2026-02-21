import React, { useState } from 'react';
import { BarChart3, Eye, Download, Info, CheckCircle2, TrendingUp, Zap, Coins } from 'lucide-react';
import { type StatsResult } from '../../utils/stats';
import { type PromptVariant, type Generation } from '../../db/db';
import { clsx } from 'clsx';

interface ResultsDashboardProps {
    stats: StatsResult[];
    variants: PromptVariant[];
    generations: Generation[];
    onExport: (format: 'csv' | 'json') => void;
    onRerun?: (updatedVariants: PromptVariant[]) => void;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ stats, variants: initialVariants, generations, onExport, onRerun }) => {
    const [reveal, setReveal] = useState(true);
    const [variants, setVariants] = useState(initialVariants);

    const totalTokens = generations.reduce((acc, g) => acc + (g.tokenUsage?.total || 0), 0);
    const avgLatency = generations.length > 0
        ? generations.reduce((acc, g) => acc + (g.latency || 0), 0) / generations.length
        : 0;

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">Experiment Insights</h1>
                    <p className="text-gray-400 mt-1">Based on {stats[0]?.total || 0} peer-reviewed judgments</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => onExport('csv')}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm transition-all"
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                    <button
                        onClick={() => setReveal(!reveal)}
                        className={clsx(
                            "flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all border shadow-lg",
                            reveal
                                ? "bg-purple-500/20 border-purple-500 text-purple-400 shadow-purple-900/20"
                                : "bg-blue-600 hover:bg-blue-700 border-blue-500 text-white shadow-blue-900/20"
                        )}
                    >
                        {reveal ? <><Eye className="w-4 h-4" /> Reveal Prompt Differences</> : <><Eye className="w-4 h-4" /> Reveal Variants</>}
                    </button>
                </div>
            </div>

            {/* High Level Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Winner (Highest WR)', value: stats.length > 0 ? `Variant ${String.fromCharCode(64 + stats.indexOf([...stats].sort((a, b) => b.winRate - a.winRate)[0]) + 1)}` : 'N/A', icon: TrendingUp, color: 'text-green-400' },
                    { label: 'Avg Latency', value: `${(avgLatency / 1000).toFixed(2)}s`, icon: Zap, color: 'text-yellow-400' },
                    { label: 'Token Intensity', value: totalTokens.toLocaleString(), icon: Coins, color: 'text-blue-400' },
                    { label: 'Confidence Level', value: '95%', icon: CheckCircle2, color: 'text-purple-400' },
                ].map((item, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-2xl glass hover:border-white/20 transition-all">
                        <div className="flex items-center gap-3 mb-2">
                            <item.icon className={clsx("w-4 h-4", item.color)} />
                            <span className="text-[10px] font-bold text-gray-500 tracking-tight">{item.label}</span>
                        </div>
                        <div className="text-2xl font-bold text-white">{item.value}</div>
                    </div>
                ))}
            </div>

            {/* Win Rate Visualization */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 glass">
                <div className="flex items-center gap-2 mb-8">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    <h2 className="text-xl font-semibold">Win Rate Distribution</h2>
                </div>

                <div className="space-y-10">
                    {stats.map((s, i) => {
                        const variant = variants.find(v => v.id === s.variantId);
                        const letter = String.fromCharCode(65 + i);
                        const winPercent = (s.winRate * 100).toFixed(1);
                        const lowerPercent = (s.wilson.lower * 100).toFixed(1);
                        const upperPercent = (s.wilson.upper * 100).toFixed(1);

                        return (
                            <div key={s.variantId} className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400">
                                            {letter}
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium block">{reveal ? variant?.version : `Variant ${letter}`}</span>
                                            {reveal && <span className="text-xs text-gray-500">{variant?.note || 'no note'}</span>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl font-bold text-white">{winPercent}%</span>
                                        <span className="block text-[10px] text-gray-500 font-mono mt-1">
                                            {lowerPercent}% — {upperPercent}% (95% CI)
                                        </span>
                                    </div>
                                </div>

                                <div className="relative h-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    {/* Confidence Interval Shadow */}
                                    <div
                                        className="absolute h-full bg-blue-400/10 transition-all duration-1000 ease-out"
                                        style={{ left: `${s.wilson.lower * 100}%`, width: `${(s.wilson.upper - s.wilson.lower) * 100}%` }}
                                    />
                                    {/* Main Bar */}
                                    <div
                                        className="absolute h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000 ease-out rounded-full"
                                        style={{ width: `${s.winRate * 100}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {reveal && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-500">
                    {variants.map((v, i) => (
                        <div key={v.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 glass overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-5 text-8xl font-black">{String.fromCharCode(65 + i)}</div>
                            <div className="flex items-center gap-2 relative">
                                <h3 className="font-bold text-blue-400">Variant {String.fromCharCode(65 + i)} Prompt</h3>
                                <span className="text-xs px-2 py-0.5 bg-blue-500/10 rounded-full border border-blue-500/20">{v.version}</span>
                            </div>
                            <textarea
                                value={v.template}
                                onChange={(e) => {
                                    const newVariants = [...variants];
                                    newVariants[i] = { ...v, template: e.target.value };
                                    setVariants(newVariants);
                                }}
                                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 font-mono text-sm text-gray-400 leading-relaxed min-h-[150px] outline-none focus:border-blue-500/30 transition-all resize-none"
                            />
                            {onRerun && (
                                <button
                                    onClick={() => onRerun(variants)}
                                    className="w-full py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-xs font-bold transition-all border border-blue-500/20 mt-2"
                                >
                                    Rerun Experiment with these Prompts
                                </button>
                            )}
                            <div className="flex items-center gap-2 text-[10px] text-gray-600">
                                <Info className="w-3 h-3" />
                                <span>Showing original template string</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
