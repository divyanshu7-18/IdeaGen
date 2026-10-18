import React, { useEffect, useState } from 'react';
import type { StatementResponse } from '../types';
import { api } from '../api/client';
import { 
  BookOpen, 
  HelpCircle, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Bookmark, 
  Loader2, 
  AlertCircle,
  FileText
} from 'lucide-react';

interface LandscapeViewProps {
  onInspectEvidence: (statementId: string) => void;
}

export const LandscapeView: React.FC<LandscapeViewProps> = ({ onInspectEvidence }) => {
  const [statements, setStatements] = useState<StatementResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.getStatements()
      .then((data) => setStatements(data))
      .catch((err) => setError(err.message || 'Failed to load research landscape statements'))
      .finally(() => setLoading(false));
  }, []);

  const filteredStatements = filterType === 'ALL'
    ? statements
    : statements.filter(s => s.statement_type?.toUpperCase() === filterType);

  // Categorized counts
  const problemCount = statements.filter(s => s.statement_type?.toUpperCase() === 'PROBLEM').length;
  const methodCount = statements.filter(s => s.statement_type?.toUpperCase() === 'METHOD' || s.statement_type?.toUpperCase() === 'METHODOLOGY').length;
  const findingCount = statements.filter(s => s.statement_type?.toUpperCase() === 'FINDING').length;
  const limitationCount = statements.filter(s => s.statement_type?.toUpperCase() === 'LIMITATION').length;
  const futureWorkCount = statements.filter(s => s.statement_type?.toUpperCase() === 'FUTURE_WORK').length;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <section className="dashboard-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#6C4CE3] uppercase tracking-wider mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Structured Scientific Knowledge</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#20233A] tracking-tight">
            Research Knowledge Landscape
          </h1>
          <p className="text-sm text-[#777B91] mt-1 max-w-2xl leading-relaxed">
            Sentence-level claims extracted from ingested scientific literature, categorized by epistemological role with direct passage provenance.
          </p>
        </div>

        <div className="text-xs font-mono px-3 py-1.5 rounded-xl bg-[#F8F6FD] text-[#6C4CE3] font-semibold border border-[#EAE7F2] self-start md:self-auto">
          {statements.length} Extracted Statements
        </div>
      </section>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Failed to fetch knowledge landscape</p>
            <p className="text-xs text-rose-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-[#777B91] bg-white border border-[#EAE7F2] rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-[#6C4CE3] mb-3" />
          <p className="text-sm font-medium text-[#20233A]">Retrieving extracted research statements...</p>
        </div>
      )}

      {/* Category Filter Cards */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          
          <button
            onClick={() => setFilterType('PROBLEM')}
            className={`p-4 rounded-[18px] border text-left transition-all cursor-pointer ${
              filterType === 'PROBLEM'
                ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-200/50 text-rose-950 shadow-xs'
                : 'bg-white border-[#EAE7F2] hover:border-[#DDD8E8] text-[#20233A] shadow-2xs'
            }`}
          >
            <div className="flex items-center space-x-2 text-xs font-semibold text-rose-700">
              <HelpCircle className="w-4 h-4 text-rose-600" />
              <span>Problems</span>
            </div>
            <span className="text-2xl font-bold text-[#20233A] block mt-2">{problemCount}</span>
            <span className="text-[11px] text-[#777B91] block">Target bottlenecks</span>
          </button>

          <button
            onClick={() => setFilterType('METHOD')}
            className={`p-4 rounded-[18px] border text-left transition-all cursor-pointer ${
              filterType === 'METHOD'
                ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-200/50 text-blue-950 shadow-xs'
                : 'bg-white border-[#EAE7F2] hover:border-[#DDD8E8] text-[#20233A] shadow-2xs'
            }`}
          >
            <div className="flex items-center space-x-2 text-xs font-semibold text-blue-700">
              <Wrench className="w-4 h-4 text-blue-600" />
              <span>Methods</span>
            </div>
            <span className="text-2xl font-bold text-[#20233A] block mt-2">{methodCount}</span>
            <span className="text-[11px] text-[#777B91] block">Existing approaches</span>
          </button>

          <button
            onClick={() => setFilterType('FINDING')}
            className={`p-4 rounded-[18px] border text-left transition-all cursor-pointer ${
              filterType === 'FINDING'
                ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-200/50 text-emerald-950 shadow-xs'
                : 'bg-white border-[#EAE7F2] hover:border-[#DDD8E8] text-[#20233A] shadow-2xs'
            }`}
          >
            <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Findings</span>
            </div>
            <span className="text-2xl font-bold text-[#20233A] block mt-2">{findingCount}</span>
            <span className="text-[11px] text-[#777B91] block">Empirical results</span>
          </button>

          <button
            onClick={() => setFilterType('LIMITATION')}
            className={`p-4 rounded-[18px] border text-left transition-all cursor-pointer ${
              filterType === 'LIMITATION'
                ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-200/50 text-amber-950 shadow-xs'
                : 'bg-white border-[#EAE7F2] hover:border-[#DDD8E8] text-[#20233A] shadow-2xs'
            }`}
          >
            <div className="flex items-center space-x-2 text-xs font-semibold text-amber-700">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Limitations</span>
            </div>
            <span className="text-2xl font-bold text-[#20233A] block mt-2">{limitationCount}</span>
            <span className="text-[11px] text-[#777B91] block">Reported boundaries</span>
          </button>

          <button
            onClick={() => setFilterType('FUTURE_WORK')}
            className={`p-4 rounded-[18px] border text-left transition-all cursor-pointer ${
              filterType === 'FUTURE_WORK'
                ? 'bg-[#EEE8FF] border-[#6C4CE3] ring-2 ring-[#6C4CE3]/20 text-[#6C4CE3] shadow-xs'
                : 'bg-white border-[#EAE7F2] hover:border-[#DDD8E8] text-[#20233A] shadow-2xs'
            }`}
          >
            <div className="flex items-center space-x-2 text-xs font-semibold text-[#6C4CE3]">
              <Sparkles className="w-4 h-4 text-[#6C4CE3]" />
              <span>Future Work</span>
            </div>
            <span className="text-2xl font-bold text-[#20233A] block mt-2">{futureWorkCount}</span>
            <span className="text-[11px] text-[#777B91] block">Proposed directions</span>
          </button>

        </div>
      )}

      {/* Filter Selector Bar */}
      {!loading && (
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-[#777B91] font-medium">Active filter:</span>
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-[#6C4CE3] text-white font-semibold'
                  : 'bg-white border border-[#EAE7F2] text-[#585D76] hover:bg-[#F8F6FD]'
              }`}
            >
              SHOW ALL ({statements.length})
            </button>
          </div>
          <span className="text-xs text-[#777B91] font-mono">
            Showing {filteredStatements.length} statements
          </span>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredStatements.length === 0 && (
        <div className="p-16 text-center rounded-2xl bg-white border border-[#EAE7F2] text-[#777B91] space-y-3 shadow-2xs">
          <Bookmark className="w-8 h-8 text-[#C9C4DC] mx-auto" />
          <h3 className="text-sm font-semibold text-[#20233A]">No Research Statements in Category</h3>
          <p className="text-xs max-w-sm mx-auto text-[#777B91]">
            No statements match the selected filter criteria in the extracted literature database.
          </p>
        </div>
      )}

      {/* Statements List */}
      <div className="space-y-3">
        {filteredStatements.map((stmt) => (
          <div
            key={stmt.id}
            className="p-5 rounded-[18px] bg-white border border-[#EAE7F2] hover:border-[#DDD8E8] shadow-2xs transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 group"
          >
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-[#F8F6FD] text-[#6C4CE3] border border-[#EAE7F2]">
                  {stmt.statement_type}
                </span>

                {stmt.paper_title && (
                  <span className="text-xs text-[#585D76] font-medium truncate max-w-md">
                    {stmt.paper_title}
                  </span>
                )}

                {stmt.section && (
                  <span className="text-[11px] text-[#777B91] font-mono">
                    § {stmt.section}
                  </span>
                )}
                
                {stmt.page_start !== null && stmt.page_start !== undefined && (
                  <span className="text-[11px] text-[#777B91] font-mono">
                    p.{stmt.page_start}
                  </span>
                )}
              </div>

              <p className="text-sm text-[#20233A] leading-relaxed font-normal">
                "{stmt.statement_text}"
              </p>
            </div>

            <button
              onClick={() => onInspectEvidence(stmt.id)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#EEE8FF] text-[#6C4CE3] hover:bg-[#D6C8FF] border border-[#D6C8FF] text-xs font-mono font-medium transition shrink-0 self-start cursor-pointer shadow-2xs"
            >
              <span>Inspect Evidence</span>
              <FileText className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

    </div>
  );
};
