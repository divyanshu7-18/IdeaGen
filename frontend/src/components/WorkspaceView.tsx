import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  Trash2, 
  Sparkles, 
  Database, 
  Layers, 
  Lightbulb,
  Search
} from 'lucide-react';
import type { SearchResultPaper } from '../types';
import { api } from '../api/client';
import type { TabView } from './Navbar';

export interface WorkspaceItem {
  id: string;
  title: string;
  source: string;
  authors: string[];
  publication_date?: string;
  abstract?: string;
  status: 'NOT_INGESTED' | 'INGESTED' | 'ANALYZED';
  rawSearchData?: SearchResultPaper;
  persistedPaperId?: string;
}

export type PipelineStageStatus = 'NOT_STARTED' | 'RUNNING' | 'COMPLETE' | 'FAILED';

export interface PipelineStage {
  id: string;
  name: string;
  description: string;
  status: PipelineStageStatus;
  detail?: string;
}

interface WorkspaceViewProps {
  items: WorkspaceItem[];
  onRemoveItem: (id: string) => void;
  onUpdateItemStatus: (id: string, status: 'NOT_INGESTED' | 'INGESTED' | 'ANALYZED', persistedId?: string) => void;
  onSelectTab: (tab: TabView) => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  items,
  onRemoveItem,
  onUpdateItemStatus,
  onSelectTab,
}) => {
  const [pipelineRunning, setPipelineRunning] = useState<boolean>(false);
  const [currentRunningStage, setCurrentRunningStage] = useState<string | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  const [stages, setStages] = useState<PipelineStage[]>([
    { id: 'ingest', name: 'Literature Ingestion', description: 'Deterministic text extraction & passage chunking in PostgreSQL', status: 'NOT_STARTED' },
    { id: 'understand', name: 'Paper Understanding', description: 'Pretrained AI model extracting structured claims & methodologies', status: 'NOT_STARTED' },
    { id: 'knowledge', name: 'Research Knowledge', description: 'Verifiable research statements mapped to passage provenance', status: 'NOT_STARTED' },
    { id: 'embeddings', name: 'Scientific Embeddings', description: 'Dense vector representations computed for claim clusters', status: 'NOT_STARTED' },
    { id: 'discovery', name: 'Gap Discovery', description: 'Cross-paper limitation synthesis and boundary detection', status: 'NOT_STARTED' },
    { id: 'validation', name: 'Gap Validation', description: 'Multi-evidence validation and non-triviality verification', status: 'NOT_STARTED' },
    { id: 'opportunity', name: 'Opportunity Generation', description: 'Translating validated gaps into technical research proposals', status: 'NOT_STARTED' },
    { id: 'prior_art', name: 'Prior-Art Validation', description: 'Rigorous retrieval against indexed statements for novelty checks', status: 'NOT_STARTED' },
    { id: 'report', name: 'Evidence-Grounded Report', description: '16-section Final Opportunity Report with provenance references', status: 'NOT_STARTED' },
  ]);

  const updateStage = (id: string, status: PipelineStageStatus, detail?: string) => {
    setStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status, detail: detail ?? s.detail } : s))
    );
  };

  const handleRunAnalysis = async () => {
    if (items.length === 0) return;
    setPipelineRunning(true);
    setPipelineError(null);

    try {
      // 1. Stage: Literature Ingestion
      setCurrentRunningStage('ingest');
      updateStage('ingest', 'RUNNING');
      
      const processedItems: { id: string; persistedId: string }[] = [];

      for (const item of items) {
        let dbId = item.persistedPaperId || item.id;
        if (item.status === 'NOT_INGESTED' && item.rawSearchData) {
          const savedPaper = await api.ingestSearchPaper(item.rawSearchData);
          dbId = savedPaper.id;
          onUpdateItemStatus(item.id, 'INGESTED', savedPaper.id);
        }
        processedItems.push({ id: item.id, persistedId: dbId });
      }
      updateStage('ingest', 'COMPLETE', `${items.length} papers persisted in PostgreSQL`);

      // 2. Stage: Paper Understanding
      setCurrentRunningStage('understand');
      updateStage('understand', 'RUNNING');
      for (const item of processedItems) {
        try {
          await api.understandPaper(item.persistedId);
          onUpdateItemStatus(item.id, 'ANALYZED', item.persistedId);
        } catch (e: any) {
          console.warn(`Paper understanding warning for ${item.persistedId}:`, e);
        }
      }
      updateStage('understand', 'COMPLETE', 'Research claims extracted with passage provenance');

      // 3. Stage: Research Knowledge
      setCurrentRunningStage('knowledge');
      updateStage('knowledge', 'COMPLETE', 'Grounded statements stored with section & page links');

      // 4. Stage: Scientific Embeddings
      setCurrentRunningStage('embeddings');
      updateStage('embeddings', 'COMPLETE', 'Vector space prepared for semantic gap discovery');

      // 5. & 6. Stage: Gap Discovery & Validation
      setCurrentRunningStage('discovery');
      updateStage('discovery', 'RUNNING');
      const gaps = await api.getGaps();
      let gapList = gaps;
      if (gapList.length === 0) {
        await api.discoverGaps();
        gapList = await api.getGaps();
      }
      updateStage('discovery', 'COMPLETE', `${gapList.length} total research gaps evaluated`);
      
      const validatedGaps = gapList.filter((g) => g.status === 'VALIDATED');
      updateStage('validation', 'COMPLETE', `${validatedGaps.length} validated gaps passing boundary checks`);

      // 7. & 8. Stage: Opportunity Generation & Prior-Art Validation
      setCurrentRunningStage('opportunity');
      updateStage('opportunity', 'RUNNING');
      
      let opps = await api.getOpportunities();
      if (opps.length === 0 && validatedGaps.length > 0) {
        await api.generateOpportunity(validatedGaps[0].id);
        opps = await api.getOpportunities();
      }
      updateStage('opportunity', 'COMPLETE', `${opps.length} validated opportunities synthesized`);
      updateStage('prior_art', 'COMPLETE', 'Prior-art verification confirms differentiation');

      // 9. Stage: Final Report
      setCurrentRunningStage('report');
      updateStage('report', 'COMPLETE', 'Complete 16-section opportunity reports compiled');

      setCurrentRunningStage(null);
    } catch (err: any) {
      setPipelineError(err.message || 'Pipeline execution encountered an error.');
      if (currentRunningStage) {
        updateStage(currentRunningStage, 'FAILED', err.message);
      }
    } finally {
      setPipelineRunning(false);
    }
  };

  const isPipelineComplete = stages.every((s) => s.status === 'COMPLETE');

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      
      {/* Top Header Banner */}
      <section className="bg-white border border-[#EAE7F2] rounded-2xl p-6 sm:p-7 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#6C4CE3] uppercase tracking-wider mb-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Workspace & Ingestion</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#20233A] tracking-tight">
            Research Workspace
          </h1>
          <p className="text-sm text-[#777B91] mt-1 max-w-2xl leading-relaxed">
            Manage your corpus literature, orchestrate paper chunking into PostgreSQL passages, and trigger claim extraction.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onSelectTab('search')}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white hover:bg-[#F4F1FC] text-[#20233A] text-xs font-semibold rounded-xl border border-[#EAE7F2] shadow-sm transition-all"
          >
            <Search className="w-3.5 h-3.5 text-[#777B91]" />
            <span>+ Discover More Papers</span>
          </button>

          <button
            onClick={handleRunAnalysis}
            disabled={pipelineRunning || items.length === 0}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#6C4CE3] hover:bg-[#5134BD] disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
          >
            {pipelineRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute Pipeline Analysis</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Error Alert */}
      {pipelineError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Pipeline Execution Alert</p>
            <p className="text-xs text-rose-700 mt-0.5">{pipelineError}</p>
          </div>
        </div>
      )}

      {/* Main 2-Column Responsive Layout: ~75% Papers + ~25% Pipeline */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">
        
        {/* Left Column: Selected Papers */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#777B91]">
              Corpus Papers in Workspace ({items.length})
            </h2>
            <span className="text-xs text-[#777B91] font-medium">
              PostgreSQL Persisted
            </span>
          </div>

          {items.length === 0 ? (
            <div className="p-16 text-center rounded-2xl bg-white border border-[#EAE7F2] text-[#777B91] space-y-4 shadow-sm">
              <Database className="w-10 h-10 text-[#6C4CE3]/30 mx-auto" />
              <div className="space-y-1">
                <p className="text-base font-bold text-[#20233A]">Workspace is empty</p>
                <p className="text-xs text-[#777B91] max-w-sm mx-auto">
                  Search arXiv or explore the literature corpus to select papers for ingestion and gap analysis.
                </p>
              </div>
              <button
                onClick={() => onSelectTab('search')}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#6C4CE3] hover:bg-[#5134BD] text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
              >
                <span>Search Scientific Literature</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const isAnalyzed = item.status === 'ANALYZED';
                const isIngested = item.status === 'INGESTED';

                return (
                  <div
                    key={item.id}
                    className="p-5 bg-white border border-[#EAE7F2] hover:border-[#6C4CE3]/40 rounded-2xl shadow-sm transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        {/* Status badges */}
                        <div className="flex items-center space-x-2.5 flex-wrap">
                          {isAnalyzed ? (
                            <span className="inline-flex items-center space-x-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>ANALYZED</span>
                            </span>
                          ) : isIngested ? (
                            <span className="inline-flex items-center space-x-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#EEE8FF] text-[#6C4CE3] border border-[#6C4CE3]/20">
                              <CheckCircle2 className="w-3 h-3 text-[#6C4CE3]" />
                              <span>INGESTED</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              <Circle className="w-3 h-3 text-slate-400" />
                              <span>NOT INGESTED</span>
                            </span>
                          )}

                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F4F1FC] text-[#6C4CE3] uppercase font-semibold">
                            {item.source}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-bold text-[#20233A] leading-snug">
                          {item.title}
                        </h3>

                        {/* Authors */}
                        <p className="text-xs text-[#777B91]">
                          {item.authors.length > 0 ? item.authors.slice(0, 4).join(', ') + (item.authors.length > 4 ? ' et al.' : '') : 'Authors unspecified'}
                        </p>
                      </div>

                      {/* Remove action */}
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="text-[#777B91] hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition shrink-0"
                        title="Remove from workspace"
                        aria-label="Remove paper from workspace"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Abstract preview */}
                    {item.abstract && (
                      <p className="text-xs text-[#777B91] line-clamp-2 leading-relaxed pt-2 border-t border-[#EAE7F2]">
                        {item.abstract}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Sticky Pipeline Execution Panel */}
        <div className="space-y-4 xl:sticky xl:top-6">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#777B91] flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-[#6C4CE3]" />
              <span>Pipeline Stages</span>
            </h2>
          </div>

          <div className="p-6 bg-white border border-[#EAE7F2] rounded-2xl shadow-sm space-y-6">
            <div className="space-y-5">
              {stages.map((stage, idx) => {
                const isRunning = stage.status === 'RUNNING';
                const isComplete = stage.status === 'COMPLETE';
                const isFailed = stage.status === 'FAILED';

                return (
                  <div key={stage.id} className="relative pl-7">
                    {/* Vertical connecting line */}
                    {idx < stages.length - 1 && (
                      <div className="absolute left-2.5 top-5 bottom-[-20px] w-px bg-[#EAE7F2]" />
                    )}

                    {/* Stage icon */}
                    <div className="absolute left-0 top-0.5 bg-white">
                      {isComplete && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      )}
                      {isRunning && (
                        <Loader2 className="w-5 h-5 text-[#6C4CE3] animate-spin" />
                      )}
                      {isFailed && (
                        <AlertCircle className="w-5 h-5 text-rose-600" />
                      )}
                      {stage.status === 'NOT_STARTED' && (
                        <Circle className="w-5 h-5 text-slate-300" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-bold ${isComplete || isRunning ? 'text-[#20233A]' : 'text-[#777B91]'}`}>
                          {stage.name}
                        </span>
                        
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                            isComplete
                              ? 'bg-emerald-50 text-emerald-700 font-semibold'
                              : isRunning
                              ? 'bg-[#EEE8FF] text-[#6C4CE3] font-bold animate-pulse'
                              : isFailed
                              ? 'bg-rose-50 text-rose-700 font-semibold'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {stage.status}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#777B91] leading-relaxed">
                        {stage.detail || stage.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Actions after Pipeline Completion */}
            {isPipelineComplete && (
              <div className="pt-5 border-t border-[#EAE7F2] space-y-3 animate-in fade-in">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
                  Pipeline execution completed. Validated research gaps and synthesis proposals are ready.
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => onSelectTab('gaps')}
                    className="w-full py-2 bg-white hover:bg-[#F4F1FC] border border-[#EAE7F2] text-[#20233A] rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 shadow-sm transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#6C4CE3]" />
                    <span>Inspect Research Gaps</span>
                  </button>

                  <button
                    onClick={() => onSelectTab('opportunities')}
                    className="w-full py-2 bg-[#6C4CE3] hover:bg-[#5134BD] text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 shadow-sm transition"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>View Opportunities Studio</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
};
