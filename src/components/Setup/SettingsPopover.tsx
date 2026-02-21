import { useState, useEffect } from 'react';
import { Settings, Github, Info, Trash2, Zap, Timer, Layers, Key, Eye, EyeOff } from 'lucide-react';
import { db } from '../../db/db';

export const SettingsPopover: React.FC = () => {
    const [concurrency, setConcurrency] = useState(() =>
        Number(localStorage.getItem('global_concurrency')) || 3
    );
    const [requestDelay, setRequestDelay] = useState(() =>
        Number(localStorage.getItem('global_request_delay')) || 0
    );

    // API Keys state
    const [openaiKey, setOpenaiKey] = useState(() => localStorage.getItem('openai_api_key') || '');
    const [anthropicKey, setAnthropicKey] = useState(() => localStorage.getItem('anthropic_api_key') || '');
    const [googleKey, setGoogleKey] = useState(() => localStorage.getItem('google_api_key') || '');

    const [showKey, setShowKey] = useState<string | null>(null);

    useEffect(() => {
        localStorage.setItem('global_concurrency', concurrency.toString());
    }, [concurrency]);

    useEffect(() => {
        localStorage.setItem('global_request_delay', requestDelay.toString());
    }, [requestDelay]);

    useEffect(() => {
        localStorage.setItem('openai_api_key', openaiKey);
    }, [openaiKey]);

    useEffect(() => {
        localStorage.setItem('anthropic_api_key', anthropicKey);
    }, [anthropicKey]);

    useEffect(() => {
        localStorage.setItem('google_api_key', googleKey);
    }, [googleKey]);

    const handleClearData = async () => {
        if (confirm('Are you sure you want to clear ALL experiments and data? This cannot be undone.')) {
            await db.delete();
            window.location.reload();
        }
    };

    return (
        <div className="relative group">
            <button className="p-2 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white border border-transparent hover:border-white/10">
                <Settings className="w-5 h-5" />
            </button>

            <div className="absolute top-full right-0 mt-2 w-80 bg-[#1a1c23] border border-white/10 rounded-2xl shadow-2xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                    {/* Performance Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-400" />
                            <h3 className="text-sm font-bold text-white">Performance</h3>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1.5 px-1">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] text-gray-400 font-bold flex items-center gap-1.5">
                                        <Layers className="w-3 h-3 text-blue-400" /> Parallel Concurrency
                                    </label>
                                    <span className="text-[10px] text-blue-400 font-black font-mono">{concurrency}</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    step="1"
                                    value={concurrency}
                                    onChange={(e) => setConcurrency(parseInt(e.target.value))}
                                    className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                                />
                            </div>

                            <div className="space-y-1.5 px-1">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] text-gray-400 font-bold flex items-center gap-1.5">
                                        <Timer className="w-3 h-3 text-blue-400" /> Request Delay
                                    </label>
                                    <span className="text-[10px] text-blue-400 font-black font-mono">{requestDelay}s</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="30"
                                    step="1"
                                    value={requestDelay}
                                    onChange={(e) => setRequestDelay(parseInt(e.target.value))}
                                    className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                                />
                                <p className="text-[8px] text-gray-600 italic mt-1">Global setting for batch generation throttling.</p>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    {/* API keys Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Key className="w-4 h-4 text-green-400" />
                            <h3 className="text-sm font-bold text-white">API Configuration</h3>
                        </div>

                        <div className="space-y-3">
                            {[
                                { label: 'OpenAI API Key', value: openaiKey, setter: setOpenaiKey, id: 'openai' },
                                { label: 'Anthropic API Key', value: anthropicKey, setter: setAnthropicKey, id: 'anthropic' },
                                { label: 'Google Gemini Key', value: googleKey, setter: setGoogleKey, id: 'google' },
                            ].map((item) => (
                                <div key={item.id} className="space-y-1.5 px-1">
                                    <label className="text-[10px] text-gray-400 font-bold px-1">{item.label}</label>
                                    <div className="relative">
                                        <input
                                            type={showKey === item.id ? "text" : "password"}
                                            value={item.value}
                                            onChange={(e) => item.setter(e.target.value)}
                                            placeholder="Enter key..."
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-mono outline-none focus:border-blue-500/50 transition-all text-gray-200"
                                        />
                                        <button
                                            onClick={() => setShowKey(showKey === item.id ? null : item.id)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                                        >
                                            {showKey === item.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Trash2 className="w-4 h-4 text-red-400" />
                            <h3 className="text-sm font-bold text-white">Data Management</h3>
                        </div>
                        <button
                            onClick={handleClearData}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-500 text-[10px] font-bold transition-all"
                        >
                            <Trash2 className="w-3.5 h-3.5" /> Clear All Experiments
                        </button>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <Info className="w-4 h-4 text-blue-400 shrink-0" />
                        <p className="text-[10px] text-blue-300 leading-snug">
                            Keys are stored locally in your browser. UI-entered keys take priority over <strong>.env</strong>.
                        </p>
                    </div>

                    <div className="h-px bg-white/5" />

                    <div className="flex justify-between items-center text-[10px] font-bold text-gray-500">
                        <span>Prompt Arena v1.0</span>
                        <a href="https://github.com/a07458666/PromptArena" target="_blank" className="flex items-center gap-1.5 hover:text-white transition-colors">
                            <Github className="w-3.5 h-3.5" /> Source
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
