import React from 'react';
import { Plus, Trash2, Info, Code } from 'lucide-react';
import { type PromptVariant } from '../../db/db';
import { v4 as uuidv4 } from 'uuid';
import { clsx } from 'clsx';

interface PromptEditorProps {
    variants: PromptVariant[];
    onChange: (variants: PromptVariant[]) => void;
    availableColumns: string[];
}

export const PromptEditor: React.FC<PromptEditorProps> = ({ variants, onChange, availableColumns }) => {
    const addVariant = () => {
        if (variants.length >= 4) return;
        const newVariant: PromptVariant = {
            id: uuidv4(),
            version: `v${variants.length + 1}.0`,
            template: '',
            note: ''
        };
        onChange([...variants, newVariant]);
    };

    const updateVariant = (id: string, updates: Partial<PromptVariant>) => {
        onChange(variants.map(v => v.id === id ? { ...v, ...updates } : v));
    };

    const removeVariant = (id: string) => {
        if (variants.length <= 2) return;
        onChange(variants.filter(v => v.id !== id));
    };

    return (
        <div className="space-y-6 flex flex-col h-full">
            <div className="flex items-center justify-between px-1">
                <h4 className="text-xs tracking-tight font-bold text-slate-300 flex items-center gap-2">
                    <Code className="w-3 h-3 text-blue-400" /> Variant Configuration
                </h4>
                <button
                    onClick={addVariant}
                    disabled={variants.length >= 4}
                    className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 disabled:opacity-30 transition-colors"
                >
                    <Plus className="w-3 h-3" /> Add Variant
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6 flex-grow overflow-y-auto pr-2 custom-scrollbar">
                {variants.map((variant, index) => (
                    <div key={variant.id} className="group relative flex flex-col gap-3 bg-black/40 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-[10px] font-black text-blue-400 border border-blue-500/20">
                                    {String.fromCharCode(65 + index)}
                                </div>
                                <input
                                    type="text"
                                    value={variant.version}
                                    onChange={(e) => updateVariant(variant.id, { version: e.target.value })}
                                    placeholder="v1.0"
                                    className="bg-transparent text-[10px] font-bold text-gray-400 outline-none w-16 focus:text-white transition-colors"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => removeVariant(variant.id)}
                                    className={clsx(
                                        "p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all",
                                        variants.length <= 2 && "opacity-0 pointer-events-none"
                                    )}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        <textarea
                            value={variant.template}
                            onChange={(e) => updateVariant(variant.id, { template: e.target.value })}
                            placeholder="Paste your prompt template here... Use {{column}} for variables."
                            className="w-full h-40 bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-mono text-gray-200 outline-none focus:border-blue-500/30 transition-all resize-none leading-relaxed"
                        />

                        <div className="flex flex-wrap gap-1.5">
                            {availableColumns.length > 0 ? availableColumns.map(col => (
                                <button
                                    key={col}
                                    onClick={() => updateVariant(variant.id, { template: variant.template + `{{${col}}}` })}
                                    className="px-2 py-1 bg-white/5 border border-white/5 rounded-lg text-[9px] font-bold text-gray-500 hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all"
                                >
                                    {col}
                                </button>
                            )) : (
                                <span className="text-[9px] text-gray-600 italic font-bold px-2">No columns detected</span>
                            )}
                        </div>

                        <input
                            type="text"
                            value={variant.note}
                            onChange={(e) => updateVariant(variant.id, { note: e.target.value })}
                            placeholder="Internal notes for this variant..."
                            className="w-full bg-transparent text-[10px] font-medium text-gray-500 py-1 outline-none border-t border-transparent focus:border-white/5"
                        />
                    </div>
                ))}
            </div>

            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex gap-3">
                <Info className="w-4 h-4 text-blue-400 shrink-0" />
                <p className="text-[10px] text-blue-300 font-medium leading-relaxed">
                    <strong>Tip:</strong> Use <code>{"{{"} variable {"}}"}</code> to inject data from your CSV.
                    Prompt Arena will automatically create one task per row.
                </p>
            </div>
        </div>
    );
};
