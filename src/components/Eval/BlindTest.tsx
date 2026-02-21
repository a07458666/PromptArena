import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Shield, Info, Keyboard, Database, Eye, EyeOff } from 'lucide-react';
import { diffWordsWithSpace } from 'diff';
import { clsx } from 'clsx';
import { type Judgment, type Generation, type PromptVariant } from '../../db/db';

interface BlindTestProps {
    rowId: number;
    rowContent: Record<string, any>;
    generations: Generation[];
    variants: PromptVariant[];
    onJudge: (judgment: Partial<Judgment>) => void;
    onNext: () => void;
    onPrev: () => void;
    currentIndex: number;
    total: number;
}

export const BlindTest: React.FC<BlindTestProps> = ({
    rowId,
    rowContent,
    generations,
    onJudge,
    onNext,
    onPrev,
    currentIndex,
    total
}) => {
    const [showDiff, setShowDiff] = useState(false);
    const [showContext, setShowContext] = useState(true);
    const [tagsA, setTagsA] = useState<string[]>([]);
    const [tagsB, setTagsB] = useState<string[]>([]);
    const [rating, setRating] = useState(0);

    // Randomize A/B order per row
    const displayOrder = useMemo(() => {
        return Math.random() > 0.5 ? [0, 1] : [1, 0];
    }, [rowId]);

    const genA = generations[displayOrder[0]];
    const genB = generations[displayOrder[1]];

    const handleChoice = (winnerId: string | 'tie' | 'none') => {
        // Collect tags from both sides with prefixes
        const allTags = [
            ...tagsA.map(t => `${t} (A)`),
            ...tagsB.map(t => `${t} (B)`)
        ];

        onJudge({
            rowId,
            selectedVariantId: winnerId,
            rating,
            tags: allTags,
            timestamp: Date.now()
        });
        // Reset state for next item
        setTagsA([]);
        setTagsB([]);
        setRating(0);
        onNext();
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!genA || !genB) return;
            if (e.key === '1' || e.key === 'ArrowLeft') handleChoice(genA.variantId);
            if (e.key === '2' || e.key === 'ArrowRight') handleChoice(genB.variantId);
            if (e.key === '3') handleChoice('tie-good');
            if (e.key === '4') handleChoice('tie-bad');
            if (e.key === 'd' || e.key === 'D') setShowDiff(prev => !prev);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [genA, genB, rating, tagsA, tagsB]);

    const TAG_OPTIONS = ['Format Error', 'Missing Content', 'Hallucination', 'Tone Issue', 'Too Lengthy', 'Other'];

    if (!genA || !genB) return <div className="p-8 text-center text-gray-500">Wait for generations to complete...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10 glass">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-400 text-xs font-bold">
                        <Shield className="w-3 h-3" /> Blind Test
                    </div>
                    <span className="text-gray-400 text-sm font-medium">Case {currentIndex + 1} of {total}</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowContext(!showContext)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold transition-all text-gray-400 hover:text-white"
                    >
                        {showContext ? <><EyeOff className="w-3.5 h-3.5" /> Hide Context</> : <><Eye className="w-3.5 h-3.5" /> Show Context</>}
                    </button>
                    <div className="h-4 w-px bg-white/10 mx-1" />
                    <button onClick={onPrev} disabled={currentIndex === 0} className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-30 transition-all"><ChevronLeft className="w-5 h-5" /></button>
                    <button onClick={onNext} disabled={currentIndex === total - 1} className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-30 transition-all"><ChevronRight className="w-5 h-5" /></button>
                </div>
            </div>

            {/* Source Context Panel */}
            <AnimatePresence>
                {showContext && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6 mb-2 glass">
                            <div className="flex items-center gap-2 mb-4">
                                <Database className="w-4 h-4 text-blue-400" />
                                <h3 className="text-xs font-bold text-blue-400">Ground Truth / Source Graph</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {Object.entries(rowContent).map(([key, value]) => (
                                    <div key={key} className="space-y-1.5">
                                        <div className="text-[10px] text-gray-500 font-bold">{key}</div>
                                        <div className="p-4 bg-black/40 border border-white/5 rounded-xl font-mono text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                                            {String(value)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[500px]">
                {/* Output A */}
                <div className="flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden glass hover:border-white/20 transition-all">
                    <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
                        <span className="font-bold text-gray-400 text-xs">Option A</span>
                        <button
                            onClick={() => handleChoice(genA.variantId)}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                        >
                            Select A <span className="opacity-50 ml-1 ml-4">[1]</span>
                        </button>
                    </div>
                    <div className="p-6 overflow-y-auto flex-grow font-serif leading-relaxed text-gray-200 text-base">
                        {showDiff ? (
                            <div className="whitespace-pre-wrap">
                                <DiffView text={genA.output} oppositeText={genB.output} />
                            </div>
                        ) : (
                            <div className="prose prose-invert max-w-none text-base">
                                <ReactMarkdown>
                                    {genA.output}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                    {/* Tags for Side A */}
                    <div className="p-4 bg-white/5 border-t border-white/10 space-y-3">
                        <div className="text-[9px] font-bold text-gray-500 px-1">Quality Issues (Option A)</div>
                        <div className="flex flex-wrap gap-1.5">
                            {TAG_OPTIONS.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => setTagsA(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                                    className={clsx(
                                        "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border",
                                        tagsA.includes(tag)
                                            ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                                            : "bg-white/5 border-white/10 text-gray-500 hover:border-white/20"
                                    )}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Output B */}
                <div className="flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden glass hover:border-white/20 transition-all">
                    <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
                        <span className="font-bold text-gray-400 text-xs">Option B</span>
                        <button
                            onClick={() => handleChoice(genB.variantId)}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                        >
                            Select B <span className="opacity-50 ml-1 ml-4">[2]</span>
                        </button>
                    </div>
                    <div className="p-6 overflow-y-auto flex-grow font-serif leading-relaxed text-gray-200 text-base">
                        {showDiff ? (
                            <div className="whitespace-pre-wrap">
                                <DiffView text={genB.output} oppositeText={genA.output} />
                            </div>
                        ) : (
                            <div className="prose prose-invert max-w-none text-base">
                                <ReactMarkdown>
                                    {genB.output}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                    {/* Tags for Side B */}
                    <div className="p-4 bg-white/5 border-t border-white/10 space-y-3">
                        <div className="text-[9px] font-bold text-gray-500 px-1">Quality Issues (Option B)</div>
                        <div className="flex flex-wrap gap-1.5">
                            {TAG_OPTIONS.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => setTagsB(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                                    className={clsx(
                                        "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border",
                                        tagsB.includes(tag)
                                            ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                                            : "bg-white/5 border-white/10 text-gray-500 hover:border-white/20"
                                    )}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between glass">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-bold text-gray-300">Overall Winner Quality:</span>
                        </div>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(s => (
                                <button
                                    key={s}
                                    onMouseEnter={() => setRating(s)}
                                    onClick={() => setRating(s)}
                                    className={clsx(
                                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all text-xl",
                                        rating >= s ? "bg-yellow-500/10 text-yellow-500 scale-110" : "bg-white/5 text-gray-700 hover:bg-white/10"
                                    )}
                                >
                                    ★
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 flex flex-col justify-between glass">
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleChoice('tie-good')}
                                className="py-4 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-2xl text-[10px] font-bold text-green-500 transition-all active:scale-95 flex flex-col items-center gap-1"
                            >
                                <span>Both Good</span>
                                <span className="opacity-40">[3]</span>
                            </button>
                            <button
                                onClick={() => handleChoice('tie-bad')}
                                className="py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-2xl text-[10px] font-bold text-red-500 transition-all active:scale-95 flex flex-col items-center gap-1"
                            >
                                <span>Both Bad</span>
                                <span className="opacity-40">[4]</span>
                            </button>
                        </div>
                        <button
                            onClick={() => setShowDiff(!showDiff)}
                            className={clsx(
                                "w-full py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 border",
                                showDiff
                                    ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                                    : "bg-white/10 hover:bg-white/20 border-white/10"
                            )}
                        >
                            {showDiff ? "Hide Diff" : "Show Differences"} <span className="opacity-40 ml-1">[D]</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-gray-500 bg-black/40 p-3 rounded-xl border border-white/5">
                        <Keyboard className="w-4 h-4 mb-0.5" />
                        <span>Instant Shortcuts Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DiffView: React.FC<{ text: string, oppositeText: string }> = ({ text, oppositeText }) => {
    const diffs = useMemo(() => diffWordsWithSpace(oppositeText, text), [text, oppositeText]);
    return (
        <>
            {diffs.map((part, i) => (
                <span
                    key={i}
                    className={clsx(
                        part.added ? "bg-green-500/20 text-green-300 rounded-sm" : "",
                        part.removed ? "hidden" : ""
                    )}
                >
                    {part.value}
                </span>
            ))}
        </>
    );
};
