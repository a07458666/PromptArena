import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { ChevronDown, Plus, FlaskConical, Calendar, Box, Layers } from 'lucide-react';
import { clsx } from 'clsx';

interface ExperimentSelectorProps {
    activeId: string | null;
    onSelect: (id: string | null) => void;
}

export const ExperimentSelector: React.FC<ExperimentSelectorProps> = ({ activeId, onSelect }) => {
    const experiments = useLiveQuery(async () => {
        const list = await db.experiments.toArray();
        return list.sort((a, b) => b.updatedAt - a.updatedAt);
    });
    const activeExp = experiments?.find(e => e.id === activeId);

    return (
        <div className="relative group">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2 hover:bg-white/10 transition-all cursor-pointer">
                <FlaskConical className="w-4 h-4 text-blue-400" />
                <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 font-bold leading-none mb-1">Experiment</span>
                    <span className="text-sm font-bold text-white truncate max-w-[150px]">
                        {activeExp ? activeExp.name : 'Select or Create...'}
                    </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 ml-2" />
            </div>

            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1c23] border border-white/10 rounded-xl shadow-2xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="p-2 space-y-1">
                    <button
                        onClick={() => onSelect(null)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-500/10 text-blue-400 transition-all text-left"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="text-xs font-bold">New Experiment</span>
                    </button>
                    <div className="h-px bg-white/5 mx-2 my-1" />
                    <div className="max-h-[300px] overflow-y-auto">
                        {experiments?.map(exp => (
                            <button
                                key={exp.id}
                                onClick={() => onSelect(exp.id)}
                                className={clsx(
                                    "w-full px-3 py-3 rounded-xl transition-all text-left group/item flex flex-col gap-2",
                                    exp.id === activeId ? "bg-white/10 ring-1 ring-white/10" : "hover:bg-white/5"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={clsx(
                                        "text-sm font-bold truncate pr-2",
                                        exp.id === activeId ? "text-blue-400" : "text-gray-200"
                                    )}>{exp.name}</span>
                                    <span className={clsx(
                                        "text-[8px] font-bold px-1.5 py-0.5 rounded border leading-none capitalize",
                                        exp.status === 'finished' ? "border-green-500/30 text-green-500" :
                                            exp.status === 'evaluating' ? "border-blue-500/30 text-blue-500" : "border-gray-500/30 text-gray-500"
                                    )}>
                                        {exp.status}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 items-center">
                                    <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-bold">
                                        <Calendar className="w-3 h-3 opacity-50" />
                                        {new Date(exp.createdAt).toLocaleString(undefined, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-bold">
                                        <Box className="w-3 h-3 opacity-50" />
                                        {exp.modelConfig.model}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-bold">
                                        <Layers className="w-3 h-3 opacity-50" />
                                        {exp.promptVariants.length} Variants
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
