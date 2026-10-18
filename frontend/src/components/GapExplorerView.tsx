import React, { useEffect, useState } from 'react';
import type { GapResponse } from '../types';
import { api } from '../api/client';
import type { TabView } from './Navbar';
import { 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  Layers, 
  Loader2, 
  AlertCircle,
  Lightbulb,
  Play
} from 'lucide-react';

interface GapExplorerViewProps {
  onInspectEvidence: (statementId: string) => void;
  onSelectTab: (tab: TabView) => void;
  onGenerateOpportunity: (gapId: string) => void;
}

export const GapExplorerView: React.FC<GapExplorerViewProps> = ({
  onGenerateOpportunity,
}) => {
  const [gaps, setGaps] = useState<GapResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState<boolean>(false);
  const [generatingGapId, setGeneratingGapId] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const fetchGaps = () => {
    setLoading(true);
    setError(null);
    api.getGaps()
      .then((data) => setGaps(data))
      .catch((err) => setError(err.message || 'Failed to load research gaps'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGaps();
  }, []);

  const handleTriggerDiscovery = async () => {
    setDiscovering(true);
    setError(null);
    try {
      await api.discoverGaps();
      fetchGaps();
    } catch (err: any) {
      setError(err.message || 'Failed to trigger gap discovery');
    } finally {
      setDiscovering(false);
    }
  };

  const handleGenerate = async (gapId: string) => {
    setGeneratingGapId(gapId);
    try {
      await api.generateOpportunity(gapId);
      onGenerateOpportunity(gapId);
    } catch (err: any) {
      setError(err.message || 'Failed to generate research opportunity');
      setGeneratingGapId(null);
    }
  };

  const filteredGaps = filterStatus === 'ALL'
    ? gaps
    : gaps.filter((g) => g.status === filterStatus);

  const validatedCount = gaps.filter((g) => g.status === 'VALIDATED').length;
  const candidateCount = gaps.filter((g) => g.status === 'CANDIDATE').length;
  const rejectedCount = gaps.filter((g) => g.status === 'REJECTED').length;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <section className="dashboard-card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#6C4CE3] uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cross-Literature Synthesis</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#20233A] tracking-tight">
            Research Gap Explorer
          </h1>
          <p className="text-sm text-[#777B91] mt-1 max-w-2xl leading-relaxed">
            Grounded gap candidates discovered across literature and validated against empirical evidence.
          </p>
        </div>

        <button
          onClick={handleTriggerDiscovery}
          disabled={discovering}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#6C4CE3] hover:bg-[#5A3BD1] text-white text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          {discovering ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing Gaps...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Run Gap Discovery</span>
            </>
          )}
        </button>
      </section>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-900">Gap Pipeline Notification</p>
            <p className="text-xs text-rose-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* SIMILARITY ≠ GAP Principle Callout */}
      <div className="p-5 rounded-[18px] bg-[#EEE8FF]/50 border border-[#D6C8FF] flex items-start space-x-3 text-xs text-[#20233A]">
        <Sparkles className="w-5 h-5 text-[#6C4CE3] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold tracking-wide uppercase font-mono text-[#6C4CE3] text-[11px] block">
            Methodological Principle: Similarity ≠ Gap
          </span>
          <p className="text-[#585D76] leading-relaxed font-sans text-xs">
            Semantic or thematic similarity between papers does not constitute a scientific research gap. IdeaGen requires validated, recurring limitations, conflicting findings, or unaddressed technical boundaries grounded in explicit literature statements.
          </p>
        </div>
      </div>

      {/* Filter status tabs */}
      {!loading && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition cursor-pointer ${
              filterStatus === 'ALL'
                ? 'bg-[#6C4CE3] text-white font-semibold shadow-xs'
                : 'bg-white border border-[#EAE7F2] text-[#585D76] hover:bg-[#F8F6FD]'
            }`}
          >
            ALL ({gaps.length})
          </button>
          <button
            onClick={() => setFilterStatus('VALIDATED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition flex items-center space-x-1.5 cursor-pointer ${
              filterStatus === 'VALIDATED'
                ? 'bg-[#10B981] text-white font-semibold shadow-xs'
                : 'bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>VALIDATED ({validatedCount})</span>
          </button>
          <button
            onClick={() => setFilterStatus('CANDIDATE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition flex items-center space-x-1.5 cursor-pointer ${
              filterStatus === 'CANDIDATE'
                ? 'bg-[#F59E0B] text-white font-semibold shadow-xs'
                : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>CANDIDATE ({candidateCount})</span>
          </button>
          <button
            onClick={() => setFilterStatus('REJECTED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition flex items-center space-x-1.5 cursor-pointer ${
              filterStatus === 'REJECTED'
                ? 'bg-[#EF4444] text-white font-semibold shadow-xs'
                : 'bg-white border border-rose-200 text-rose-800 hover:bg-rose-50'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>REJECTED ({rejectedCount})</span>
          </button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-[#777B91] bg-white rounded-2xl border border-[#EAE7F2]">
          <Loader2 className="w-8 h-8 animate-spin text-[#6C4CE3] mb-3" />
          <p className="text-sm font-medium text-[#20233A]">Fetching discovered research gaps...</p>
        </div>
      )}

      {!loading && filteredGaps.length === 0 && (
        <div className="p-12 text-center rounded-2xl bg-white border border-[#EAE7F2] text-[#777B91] space-y-3 shadow-2xs">
          <Sparkles className="w-8 h-8 text-[#C9C4DC] mx-auto" />
          <h3 className="text-base font-semibold text-[#20233A]">No Research Gaps Available</h3>
          <p className="text-xs text-[#777B91] max-w-sm mx-auto">
            No research gaps match this filter category.
          </p>
        </div>
      )}

      {/* Gaps List */}
      <div className="space-y-4">
        {filteredGaps.map((gap) => {
          const isGenerating = generatingGapId === gap.id;

          return (
            <div
              key={gap.id}
              className={`p-6 rounded-[18px] bg-white border transition space-y-4 shadow-2xs ${
                gap.status === 'VALIDATED'
                  ? 'border-emerald-200 hover:border-emerald-300'
                  : gap.status === 'REJECTED'
                  ? 'border-rose-200 bg-rose-50/20'
                  : 'border-[#EAE7F2] hover:border-[#DDD8E8]'
              }`}
            >
              {/* Gap Header / Status */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  {gap.status === 'VALIDATED' && (
                    <span className="badge-validated flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>VALIDATED</span>
                    </span>
                  )}
                  {gap.status === 'CANDIDATE' && (
                    <span className="badge-candidate flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>CANDIDATE</span>
                    </span>
                  )}
                  {gap.status === 'REJECTED' && (
                    <span className="badge-rejected flex items-center space-x-1">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>REJECTED</span>
                    </span>
                  )}

                  {gap.validation_confidence !== null && gap.validation_confidence !== undefined && (
                    <span className="text-xs font-mono text-[#777B91] font-medium">
                      Confidence: {(gap.validation_confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1.5 text-xs text-[#777B91] font-mono">
                  <FileText className="w-3.5 h-3.5 text-[#777B91]" />
                  <span>{gap.evidence_count} evidence items</span>
                </div>
              </div>

              {/* Gap Statement */}
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-[#6C4CE3] uppercase tracking-wider font-semibold block">
                  Identified Gap Statement
                </span>
                <h3 className="text-base font-bold text-[#20233A] leading-snug">
                  {gap.gap_statement}
                </h3>
              </div>

              {/* Research Problem context */}
              {gap.research_problem && (
                <div className="p-3.5 rounded-xl bg-[#F8F6FD] border border-[#EAE7F2] text-xs text-[#20233A]">
                  <span className="font-mono text-[#777B91] block mb-1 font-semibold">Target Research Problem:</span>
                  <p className="leading-relaxed">{gap.research_problem}</p>
                </div>
              )}

              {/* Validation Reasoning */}
              {gap.validation_reasoning && (
                <div className="text-xs text-[#585D76] space-y-1 pt-1">
                  <span className="font-mono text-[#777B91] block font-semibold">Validation Analysis:</span>
                  <div className="p-3.5 rounded-xl bg-[#F8F6FD] border border-[#EAE7F2] text-[#20233A] italic leading-relaxed">
                    "{gap.validation_reasoning}"
                  </div>
                </div>
              )}

              {/* Supporting papers / Actions */}
              <div className="pt-3 border-t border-[#EAE7F2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-[#777B91] flex items-center space-x-1.5 font-mono">
                  <Layers className="w-3.5 h-3.5 text-[#777B91]" />
                  <span>
                    Supporting Papers: {gap.supporting_papers ? gap.supporting_papers.length : 0}
                  </span>
                </div>

                {gap.status === 'VALIDATED' && (
                  <button
                    onClick={() => handleGenerate(gap.id)}
                    disabled={isGenerating}
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#6C4CE3] hover:bg-[#5A3BD1] text-white text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Synthesizing Opportunity...</span>
                      </>
                    ) : (
                      <>
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>Synthesize Opportunity Proposal →</span>
                      </>
                    )}
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
