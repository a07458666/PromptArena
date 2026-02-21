import { useState, useMemo, useCallback, useEffect } from 'react';
import { db, type Experiment, type PromptVariant, type ModelConfig, type DatasetRow, type Judgment, type Generation } from './db/db';
import { useExperiment } from './hooks/useExperiment';
import { DatasetUpload } from './components/Setup/DatasetUpload';
import { PromptEditor } from './components/Setup/PromptEditor';
import { ModelConfigEditor } from './components/Setup/ModelConfigEditor';
import { BlindTest } from './components/Eval/BlindTest';
import { ResultsDashboard } from './components/Results/ResultsDashboard';
import { ExperimentSelector } from './components/Setup/ExperimentSelector';
import { SettingsPopover } from './components/Setup/SettingsPopover';
import { calculateExperimentStats } from './utils/stats';
import { v4 as uuidv4 } from 'uuid';
import { Layout, Play, Github, Sparkles, Save, Box, CheckCircle, FlaskConical, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';

function App() {
  const [activeExpId, setActiveExpId] = useState<string | null>(() => localStorage.getItem('activeExperimentId'));
  const {
    experiment,
    rows,
    generations,
    judgments,
    progress,
    startBatchGeneration,
    stopBatchGeneration,
    saveJudgment
  } = useExperiment(activeExpId);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [setupData, setSetupData] = useState<{
    variants: PromptVariant[];
    config: ModelConfig;
    columns: string[];
    name: string;
  }>({
    name: 'New Experiment',
    variants: [
      { id: uuidv4(), version: 'v1.0', template: '', note: 'Control' },
      { id: uuidv4(), version: 'v1.1', template: '', note: 'Variant B' },
    ],
    config: {
      provider: 'google',
      model: 'gemini-3-flash-preview',
      temperature: 0.7,
      topP: 1,
      maxTokens: 1000,
      repetitions: 1
    },
    columns: []
  });

  const [evalIndex, setEvalIndex] = useState(0);

  // Persistence: Save activeExpId
  useEffect(() => {
    if (activeExpId) {
      localStorage.setItem('activeExperimentId', activeExpId);
    } else {
      localStorage.removeItem('activeExperimentId');
    }
  }, [activeExpId]);

  // Sync setupData when experiment is loaded/changed
  useEffect(() => {
    if (experiment) {
      setSetupData(prev => ({
        ...prev,
        name: experiment.name,
        variants: experiment.promptVariants,
        config: experiment.modelConfig
      }));
    }
  }, [experiment?.id]); // Only sync when experiment ID changes

  // Auto-save setupData for draft/setup experiments
  useEffect(() => {
    if (activeExpId && (experiment?.status === 'draft')) {
      const timer = setTimeout(async () => {
        await db.experiments.update(activeExpId, {
          name: setupData.name,
          modelConfig: setupData.config,
          promptVariants: setupData.variants,
          updatedAt: Date.now()
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [setupData, activeExpId, experiment?.status]);

  const createExperiment = async (data: Record<string, any>[], columns: string[]) => {
    const id = uuidv4();
    const newExp: Experiment = {
      id,
      name: setupData.name,
      status: 'draft',
      modelConfig: setupData.config,
      promptVariants: setupData.variants,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await db.experiments.add(newExp);
    await db.datasetRows.bulkAdd(data.map(d => ({ experimentId: id, content: d } as DatasetRow)));
    setSetupData(prev => ({ ...prev, columns }));
    setActiveExpId(id);
  };

  const handleSaveDraft = async () => {
    if (activeExpId) {
      await db.experiments.update(activeExpId, {
        name: setupData.name,
        modelConfig: setupData.config,
        promptVariants: setupData.variants,
        updatedAt: Date.now()
      });
      showToast('Draft saved successfully!');
    }
  };

  const handleExport = useCallback((format: 'csv' | 'json') => {
    if (format === 'csv' && experiment) {
      const stats = calculateExperimentStats(judgments as Judgment[], experiment.promptVariants);
      const csvRows = [
        ['Variant', 'Wins', 'Ties', 'Losses', 'WinRate'],
        ...stats.map(s => [s.variantId, s.wins, s.ties, s.losses, s.winRate.toFixed(4)])
      ];
      const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `arena_${activeExpId}.csv`);
      document.body.appendChild(link);
      link.click();
    }
  }, [experiment, judgments, activeExpId]);

  const evalItems = useMemo(() => {
    const items: { rowId: number, repIndex: number, rowContent: any }[] = [];
    rows.forEach(row => {
      const reps = experiment?.modelConfig.repetitions || 1;
      for (let i = 0; i < reps; i++) {
        items.push({ rowId: row.id!, repIndex: i, rowContent: row.content });
      }
    });
    return items;
  }, [rows, experiment?.modelConfig.repetitions]);

  const handleRerun = async (updatedVariants: PromptVariant[]) => {
    const id = uuidv4();
    const name = `${experiment?.name || 'Experiment'} (Forked)`;
    const newExperiment: Experiment = {
      ...experiment!,
      id,
      name,
      promptVariants: updatedVariants,
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await db.experiments.put(newExperiment);
    const rowsToClone = await db.datasetRows.where('experimentId').equals(activeExpId!).toArray();
    await db.datasetRows.bulkAdd(rowsToClone.map(r => ({ ...r, id: undefined, experimentId: id })));

    setActiveExpId(id);
    showToast('Created new experiment iteration');
  };

  const handleJudge = async (judgment: any) => {
    const currentItem = evalItems[evalIndex];
    if (!currentItem) return;
    await saveJudgment({
      ...judgment,
      rowId: currentItem.rowId,
      repIndex: currentItem.repIndex
    });
  };

  const currentView = experiment?.status || 'setup';

  // Header content based on view
  const headerContent = useMemo(() => {
    switch (currentView) {
      case 'setup':
      case 'draft':
        return { title: 'Setup', sub: 'Upload dataset and define prompts.' };
      case 'generating':
        return { title: 'Generating', sub: 'Manufacturing model outputs in the background.' };
      case 'evaluating':
        return { title: 'Evaluation', sub: 'Blinded side-by-side comparison.' };
      case 'finished':
        return { title: 'Results', sub: 'Statistical insights and winner reveal.' };
      default:
        return { title: 'Setup', sub: 'Upload dataset and define prompts.' };
    }
  }, [currentView]);

  const currentRowGenerations = useMemo(() => {
    const currentItem = evalItems[evalIndex];
    if (!currentItem) return [] as Generation[];
    return (generations as Generation[]).filter(g =>
      g.rowId === currentItem.rowId && g.repIndex === currentItem.repIndex
    );
  }, [generations, evalItems, evalIndex]);

  return (
    <div className="min-h-screen bg-[#0d0f14] text-slate-200 flex flex-col selection:bg-blue-500/30 font-sans">
      {/* Top Bar */}
      <header className="h-16 border-b border-white/5 px-8 flex justify-between items-center bg-[#0d0f14]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white leading-none">Prompt Arena</h1>
        </div>

        <div className="flex-grow max-w-md px-10">
          <ExperimentSelector activeId={activeExpId} onSelect={setActiveExpId} />
        </div>

        <div className="flex items-center gap-4">
          <nav className="flex items-center p-1 bg-white/5 rounded-xl border border-white/5 mr-4">
            {['Setup', 'Eval', 'Results'].map(tab => {
              const isActive = (currentView === 'setup' || currentView === 'draft' && tab === 'Setup') ||
                (currentView === 'evaluating' && tab === 'Eval') ||
                (currentView === 'finished' && tab === 'Results');
              return (
                <button
                  key={tab}
                  className={clsx(
                    "px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                    isActive ? "text-white bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  {tab}
                </button>
              );
            })}
          </nav>
          <SettingsPopover />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow flex flex-col max-w-6xl mx-auto w-full px-8 pt-10 pb-32">
        {/* Page Header */}
        <div className="mb-10 animate-fade-in">
          <h2 className="text-4xl font-black tracking-tight text-white mb-2">{headerContent.title}</h2>
          <p className="text-gray-400 font-medium">{headerContent.sub}</p>
        </div>

        {/* Content Area */}
        <div className="flex-grow">
          {currentView === 'draft' || currentView === 'setup' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-2 duration-500">
              {/* Card 1: Dataset & Info */}
              <div className="space-y-8">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col gap-6 glass shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                      <FlaskConical className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold tracking-tight text-slate-300">Experiment Details</h3>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 font-bold px-1">Experiment Name</label>
                    <input
                      type="text"
                      value={setupData.name}
                      onChange={(e) => setSetupData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Experiment Name..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500/50 transition-all text-white"
                    />
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col gap-6 glass shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                      <Box className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold tracking-tight text-slate-300">Dataset</h3>
                  </div>
                  <DatasetUpload onUpload={createExperiment} />
                </div>
              </div>

              {/* Card 2: Prompts */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col gap-6 glass shadow-xl min-h-[500px]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                    <Layout className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold tracking-tight text-slate-300">Prompt Variants</h3>
                </div>
                <PromptEditor
                  variants={setupData.variants}
                  onChange={(v) => setSetupData(prev => ({ ...prev, variants: v }))}
                  availableColumns={setupData.columns}
                />
                <div className="mt-auto pt-6 border-t border-white/5">
                  <ModelConfigEditor
                    config={setupData.config}
                    onChange={(c) => setSetupData(prev => ({ ...prev, config: c }))}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {currentView === 'generating' && (
            <div className="flex flex-col items-center justify-center h-full space-y-12 py-20 animate-fade-in border border-white/5 rounded-3xl bg-white/5 glass">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full border-4 border-blue-500/10 flex items-center justify-center bg-blue-500/5 glass">
                  <Layout className="w-12 h-12 text-blue-400 animate-pulse" />
                </div>
                <div className="absolute -top-1 -left-1 w-34 h-34 rounded-full border-t-2 border-blue-500 animate-spin" />
              </div>

              <div className="text-center space-y-6 max-w-xs">
                <h2 className="text-xl font-bold text-white tracking-tight">Manufacturing Outputs...</h2>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/10 p-px">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-700 ease-in-out"
                    style={{ width: `${(progress?.completed || 0) / (progress?.total || 1) * 100}%` }}
                  />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs font-bold text-slate-500 font-mono">
                    {progress?.completed} / {progress?.total} DONE
                  </p>

                  {progress?.isRetrying && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-[10px] text-yellow-500 font-bold animate-pulse">
                      <Zap className="w-3 h-3" /> Rate limit active (429) - Cooling down...
                    </div>
                  )}

                  {progress?.failed ? <p className="text-[10px] text-red-500 font-bold">{progress.failed} errors encountered</p> : null}
                </div>

                <div className="pt-4">
                  <button
                    onClick={stopBatchGeneration}
                    className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-500 text-[10px] font-bold transition-all"
                  >
                    Cancel Generation
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentView === 'evaluating' && evalItems[evalIndex] && (
            <BlindTest
              rowId={evalItems[evalIndex].rowId}
              rowContent={evalItems[evalIndex].rowContent}
              generations={currentRowGenerations}
              variants={experiment?.promptVariants || []}
              onJudge={handleJudge}
              onNext={() => setEvalIndex(prev => Math.min(prev + 1, evalItems.length - 1))}
              onPrev={() => setEvalIndex(prev => Math.max(prev - 1, 0))}
              currentIndex={evalIndex}
              total={evalItems.length}
            />
          )}

          {currentView === 'finished' && experiment && (
            <ResultsDashboard
              stats={calculateExperimentStats(judgments as Judgment[], experiment.promptVariants)}
              variants={experiment.promptVariants}
              generations={generations as Generation[]}
              onExport={handleExport}
              onRerun={handleRerun}
            />
          )}
        </div>
      </main>

      {/* Footer Action Bar */}
      {(currentView === 'setup' || currentView === 'draft') && activeExpId && (
        <footer className="fixed bottom-0 left-0 right-0 h-20 border-t border-white/5 bg-[#0d0f14]/90 backdrop-blur-2xl flex items-center justify-center z-40 px-8">
          <div className="max-w-6xl w-full flex justify-between items-center">
            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              Dataset Loaded: {rows.length} rows detected
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleSaveDraft}
                className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all"
              >
                <Save className="w-4 h-4" /> Save Draft
              </button>
              <button
                onClick={startBatchGeneration}
                className="flex items-center gap-3 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-sm shadow-xl shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-current" />
                Generate Outputs
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-24 left-1/2 z-[100] px-6 py-3 bg-white border border-white/10 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-xl"
          >
            <div className={clsx(
              "w-6 h-6 rounded-full flex items-center justify-center",
              toast.type === 'success' ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
            )}>
              {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <Box className="w-4 h-4" />}
            </div>
            <span className="text-sm font-bold text-gray-900">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Basic Footer for other views */}
      {currentView !== 'setup' && currentView !== 'draft' && (
        <footer className="border-t border-white/5 py-4 px-10 flex justify-between items-center text-[8px] text-slate-600 font-bold tracking-wider">
          <div className="flex gap-8">
            <span>Local DB Synchronized</span>
            <span>Edge-to-Edge Encryption</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-white transition-colors flex items-center gap-2">
              <Github className="w-3 h-3" /> Open Source
            </a>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;
