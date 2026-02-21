import React from 'react';
import { type ModelConfig } from '../../db/db';
import { Settings, Zap } from 'lucide-react';

interface ModelConfigEditorProps {
    config: ModelConfig;
    onChange: (config: ModelConfig) => void;
}

const PROVIDERS = [
    { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'o1-preview', 'o3-mini'] },
    { id: 'anthropic', name: 'Anthropic', models: ['claude-3-7-sonnet-latest', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest'] },
    { id: 'google', name: 'Google (Gemini)', models: ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.0-flash'] },
] as const;

export const ModelConfigEditor: React.FC<ModelConfigEditorProps> = ({ config, onChange }) => {
    const currentProvider = PROVIDERS.find(p => p.id === config.provider) || PROVIDERS[0];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 px-1">
                <Settings className="w-3 h-3 text-blue-400" />
                <h4 className="text-xs tracking-tight font-bold text-slate-300">Engine Configuration</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-500 font-bold px-1">Provider</label>
                        <select
                            value={config.provider}
                            onChange={(e) => {
                                const provider = e.target.value as ModelConfig['provider'];
                                const firstModel = PROVIDERS.find(p => p.id === provider)?.models[0] || '';
                                onChange({ ...config, provider, model: firstModel });
                            }}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-blue-500/50 transition-all text-white appearance-none"
                        >
                            {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-500 font-bold px-1">Model</label>
                        <select
                            value={config.model}
                            onChange={(e) => onChange({ ...config, model: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-blue-500/50 transition-all text-white appearance-none shadow-sm"
                        >
                            {currentProvider.models.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>

                <div className="space-y-5">
                    <div className="space-y-2">
                        <div className="flex justify-between px-1">
                            <label className="text-[10px] text-gray-500 font-bold">Temperature</label>
                            <span className="text-[10px] text-blue-400 font-black font-mono">{config.temperature.toFixed(1)}</span>
                        </div>
                        <div className="px-1 py-1">
                            <input
                                type="range"
                                min="0"
                                max="2"
                                step="0.1"
                                value={config.temperature}
                                onChange={(e) => onChange({ ...config, temperature: parseFloat(e.target.value) })}
                                className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-gray-500 font-bold px-1 text-nowrap">Top P</label>
                            <input
                                type="number"
                                min="0"
                                max="1"
                                step="0.05"
                                value={config.topP}
                                onChange={(e) => onChange({ ...config, topP: parseFloat(e.target.value) })}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold outline-none focus:border-blue-500/50 transition-all text-gray-200"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-gray-500 font-bold px-1 text-nowrap">Max Tokens</label>
                            <input
                                type="number"
                                min="1"
                                max="8192"
                                value={config.maxTokens}
                                onChange={(e) => onChange({ ...config, maxTokens: parseInt(e.target.value) })}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold outline-none focus:border-blue-500/50 transition-all text-gray-200"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-5 border-t border-white/5 space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between px-1">
                            <label className="text-[10px] text-gray-500 font-bold">Repetitions (Outputs per case)</label>
                            <span className="text-[10px] text-blue-400 font-black font-mono">{config.repetitions || 1}x</span>
                        </div>
                        <div className="px-1 py-1">
                            <input
                                type="range"
                                min="1"
                                max="10"
                                step="1"
                                value={config.repetitions || 1}
                                onChange={(e) => onChange({ ...config, repetitions: parseInt(e.target.value) })}
                                className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-5 border-t border-white/5 flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-white/5">
                    <Zap className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <div>
                    <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                        Keys are pulled from <strong>.env</strong> by default. Performance settings are now global and can be adjusted via the settings gear in the top right.
                    </p>
                </div>
            </div>
        </div>
    );
};
