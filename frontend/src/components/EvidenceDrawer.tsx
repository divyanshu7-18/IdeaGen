import React, { useEffect, useState } from 'react';
import { X, FileText, Bookmark, Layers, AlertCircle, Loader2 } from 'lucide-react';
import type { EvidenceDetail } from '../types';
import { api } from '../api/client';

interface EvidenceDrawerProps {
  statementId: string | null;
  onClose: () => void;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({ statementId, onClose }) => {
  const [evidence, setEvidence] = useState<EvidenceDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!statementId) {
      setEvidence(null);
      return;
    }
    setLoading(true);
    setError(null);
    api.getEvidenceDetail(statementId)
      .then((data) => setEvidence(data))
      .catch((err) => setError(err.message || 'Failed to load evidence detail'))
      .finally(() => setLoading(false));
  }, [statementId]);

  if (!statementId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-xl bg-white border-l border-[#EAE7F2] text-[#20233A] flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#EAE7F2] bg-[#F4F1FC]">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-[#EEE8FF] text-[#6C4CE3]">
              <Bookmark className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-base text-[#20233A] leading-tight">Evidence Provenance</h3>
              <p className="text-[11px] text-[#777B91]">Traceable grounding from scientific source</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#777B91] hover:text-[#20233A] hover:bg-white transition"
            aria-label="Close evidence panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-[#777B91]">
              <Loader2 className="w-8 h-8 animate-spin text-[#6C4CE3] mb-3" />
              <p className="text-sm font-semibold">Fetching ground evidence provenance...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-900">Unable to fetch evidence detail</p>
                <p className="text-xs text-rose-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {evidence && !loading && (
            <>
              {/* Paper Source */}
              <div className="p-5 rounded-2xl bg-[#F4F1FC] border border-[#EAE7F2] space-y-2">
                <div className="flex items-center space-x-1.5 text-xs text-[#6C4CE3] uppercase tracking-wider font-bold">
                  <FileText className="w-4 h-4" />
                  <span>Source Paper</span>
                </div>
                <h4 className="font-bold text-[#20233A] text-sm leading-snug">
                  {evidence.paper_title || `Paper ID: ${evidence.paper_id}`}
                </h4>
                <div className="flex flex-wrap gap-2 pt-1 text-xs text-[#777B91] font-mono">
                  <span className="px-2 py-0.5 rounded bg-white border border-[#EAE7F2]">
                    ID: {evidence.paper_id.slice(0, 10)}...
                  </span>
                </div>
              </div>

              {/* Location Provenance */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-white border border-[#EAE7F2] shadow-sm">
                  <span className="text-[11px] uppercase text-[#777B91] font-bold block mb-1">Section</span>
                  <span className="font-semibold text-[#20233A] text-xs">
                    {evidence.section || 'Unspecified section'}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#EAE7F2] shadow-sm">
                  <span className="text-[11px] uppercase text-[#777B91] font-bold block mb-1">Page Range</span>
                  <span className="font-semibold text-[#20233A] text-xs">
                    {evidence.page_start !== null && evidence.page_start !== undefined
                      ? `Page ${evidence.page_start}${evidence.page_end && evidence.page_end !== evidence.page_start ? `–${evidence.page_end}` : ''}`
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Extracted Research Statement */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="uppercase text-[#777B91] font-bold text-[11px]">Extracted Statement</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EEE8FF] text-[#6C4CE3] border border-[#6C4CE3]/20 font-mono">
                    {evidence.statement_type}
                  </span>
                </div>
                <div className="p-5 rounded-2xl bg-[#EEE8FF]/40 border border-[#6C4CE3]/20 text-[#20233A] text-sm italic leading-relaxed">
                  "{evidence.statement_text}"
                </div>
              </div>

              {/* Passage Text */}
              {evidence.passage_text && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs text-[#20233A] font-bold">
                    <Layers className="w-4 h-4 text-[#6C4CE3]" />
                    <span>Exact Source Passage</span>
                    {evidence.passage_index !== null && (
                      <span className="text-[#777B91] font-normal">(Passage #{evidence.passage_index})</span>
                    )}
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-[#EAE7F2] text-[#20233A] text-xs font-mono leading-relaxed max-h-60 overflow-y-auto">
                    {evidence.passage_text}
                  </div>
                </div>
              )}

              {/* Confidence Indicator */}
              {evidence.confidence !== null && evidence.confidence !== undefined && (
                <div className="pt-3 border-t border-[#EAE7F2] flex items-center justify-between text-xs text-[#777B91]">
                  <span className="font-semibold">Extraction Confidence</span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {(evidence.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#EAE7F2] bg-[#F4F1FC] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#6C4CE3] hover:bg-[#5134BD] text-white shadow-sm transition"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
