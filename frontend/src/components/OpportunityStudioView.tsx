import React, { useEffect, useState } from 'react';
import type { OpportunityResponse, OpportunityReport } from '../types';
import { api } from '../api/client';
import { 
  Lightbulb, 
  ShieldCheck, 
  Loader2, 
  AlertCircle, 
  Sparkles, 
  Wrench, 
  GitCompare, 
  Gauge,
  ArrowRight,
  FileText,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface OpportunityStudioViewProps {
  onInspectEvidence: (statementId: string) => void;
  selectedOpportunityId?: string | null;
  mode?: 'opportunities' | 'reports';
}

export const OpportunityStudioView: React.FC<OpportunityStudioViewProps> = ({
  onInspectEvidence,
  selectedOpportunityId,
  mode = 'opportunities',
}) => {
  const [opportunities, setOpportunities] = useState<OpportunityResponse[]>([]);
  const [activeOpportunityId, setActiveOpportunityId] = useState<string | null>(selectedOpportunityId || null);
  const [report, setReport] = useState<OpportunityReport | null>(null);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingList(true);
    setError(null);
    api.getOpportunities()
      .then((opps) => {
        setOpportunities(opps);
        if (opps.length > 0 && !activeOpportunityId) {
          setActiveOpportunityId(opps[0].id);
        }
      })
      .catch((err) => setError(err.message || 'Failed to load research opportunities'))
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => {
    if (!activeOpportunityId) {
      setReport(null);
      return;
    }
    setLoadingReport(true);
    setError(null);
    api.getOpportunityReport(activeOpportunityId)
      .then((rep) => setReport(rep))
      .catch((err) => setError(err.message || 'Failed to load opportunity report'))
      .finally(() => setLoadingReport(false));
  }, [activeOpportunityId]);

  const isReportsView = mode === 'reports';

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner */}
      <section className="dashboard-card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#6C4CE3] uppercase tracking-wider mb-1">
            {isReportsView ? <FileText className="w-3.5 h-3.5" /> : <Lightbulb className="w-3.5 h-3.5" />}
            <span>{isReportsView ? 'Literature-Grounded Synthesis' : 'Technical Proposal Generation'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#20233A] tracking-tight">
            {isReportsView ? 'Evidence-Grounded Reports' : 'Opportunity Studio'}
          </h1>
          <p className="text-sm text-[#777B91] mt-1 max-w-2xl leading-relaxed">
            {isReportsView
              ? 'Complete scientific research reports synthesized from validated literature gaps and prior art.'
              : 'Structured 16-section research proposals synthesized from validated literature gaps.'}
          </p>
        </div>
      </section>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-900">Opportunity Studio Notice</p>
            <p className="text-xs text-rose-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {loadingList && (
        <div className="flex flex-col items-center justify-center py-20 text-[#777B91] bg-white rounded-2xl border border-[#EAE7F2]">
          <Loader2 className="w-8 h-8 animate-spin text-[#6C4CE3] mb-3" />
          <p className="text-sm font-medium text-[#20233A]">Loading research opportunity index...</p>
        </div>
      )}

      {!loadingList && opportunities.length === 0 && !error && (
        <div className="p-12 text-center rounded-2xl bg-white border border-[#EAE7F2] text-[#777B91] space-y-3 shadow-2xs">
          <Lightbulb className="w-10 h-10 text-[#C9C4DC] mx-auto" />
          <h3 className="text-base font-semibold text-[#20233A]">No Generated Opportunities</h3>
          <p className="text-xs text-[#777B91] max-w-sm mx-auto">
            Navigate to the Research Gaps tab and click "Synthesize Opportunity Proposal" on a validated gap to generate a proposal report here.
          </p>
        </div>
      )}

      {/* Main Layout: Selector Bar + Report View */}
      {opportunities.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start">
          
          {/* Left Selector Sidebar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono uppercase text-[#777B91] font-semibold px-1">
              <span>Opportunities</span>
              <span>({opportunities.length})</span>
            </div>
            <div className="space-y-2">
              {opportunities.map((opp) => {
                const isActive = activeOpportunityId === opp.id;
                return (
                  <div
                    key={opp.id}
                    onClick={() => setActiveOpportunityId(opp.id)}
                    className={`p-4 rounded-[16px] border cursor-pointer transition text-left space-y-2 shadow-2xs ${
                      isActive
                        ? 'bg-[#EEE8FF]/70 border-[#6C4CE3] text-[#20233A] ring-1 ring-[#6C4CE3]/30'
                        : 'bg-white border-[#EAE7F2] text-[#585D76] hover:border-[#DDD8E8] hover:bg-[#F8F6FD]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      {opp.status === 'REJECTED' ? (
                        <span className="font-semibold text-rose-700 flex items-center space-x-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] uppercase font-bold tracking-wider flex items-center space-x-1">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>REJECTED</span>
                          </span>
                          <span className="text-[#777B91] font-normal">
                            Hist: {(opp.confidence * 100).toFixed(0)}%
                          </span>
                        </span>
                      ) : (
                        <span className={`font-semibold ${isActive ? 'text-[#6C4CE3]' : 'text-[#777B91]'}`}>
                          {(opp.confidence * 100).toFixed(0)}% CONFIDENCE
                        </span>
                      )}
                      <span className="text-[#777B91]">
                        {opp.id.slice(0, 8)}...
                      </span>
                    </div>
                    <h4 className="text-xs font-bold leading-snug line-clamp-2 text-[#20233A]">
                      {opp.proposed_research_direction}
                    </h4>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Main Report View (Full 16 Sections) */}
          <div className="space-y-6 min-w-0">
            {loadingReport && (
              <div className="flex flex-col items-center justify-center py-20 text-[#777B91] rounded-2xl bg-white border border-[#EAE7F2]">
                <Loader2 className="w-8 h-8 animate-spin text-[#6C4CE3] mb-3" />
                <p className="text-sm font-medium text-[#20233A]">Synthesizing 16-section opportunity report...</p>
              </div>
            )}

            {report && !loadingReport && (
              <div className="p-6 sm:p-8 rounded-[18px] bg-white border border-[#EAE7F2] space-y-8 shadow-2xs">
                
                {/* Novelty Assessment Status */}
                <div className={`p-4 rounded-xl flex items-start space-x-3 ${
                  report.status === 'REJECTED'
                    ? 'bg-rose-50 border border-rose-200 text-rose-900'
                    : 'bg-amber-50/70 border border-amber-200 text-amber-900'
                }`}>
                  <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 ${
                    report.status === 'REJECTED' ? 'text-rose-700' : 'text-amber-700'
                  }`} />
                  <div>
                    <span className={`text-[11px] font-mono uppercase font-bold tracking-wider block mb-0.5 ${
                      report.status === 'REJECTED' ? 'text-rose-800' : 'text-amber-800'
                    }`}>
                      Novelty Assessment Status
                    </span>
                    <p className={`text-xs leading-relaxed font-sans font-medium ${
                      report.status === 'REJECTED' ? 'text-rose-950' : 'text-amber-950'
                    }`}>
                      "{report.novelty_assessment?.assessment || (typeof report.prior_art_assessment === 'object' && report.prior_art_assessment?.assessment) || report.cautious_novelty_statement || 'Potentially novel within the analyzed corpus.'}"
                    </p>
                  </div>
                </div>

                {/* Proposal Title Header */}
                <div className="space-y-2 border-b border-[#EAE7F2] pb-6">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    {report.status === 'REJECTED' ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold flex items-center space-x-1.5">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>REJECTED OPPORTUNITY</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#EEE8FF] text-[#6C4CE3] border border-[#D6C8FF] font-semibold flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#6C4CE3]" />
                        <span>VALIDATED OPPORTUNITY</span>
                      </span>
                    )}
                    {report.status === 'REJECTED' ? (
                      <span className="text-[#777B91] font-medium bg-rose-50/50 px-2.5 py-0.5 rounded-lg border border-rose-100">
                        Historical Confidence: {(report.confidence * 100).toFixed(1)}% (Pre-Rejection)
                      </span>
                    ) : (
                      <span className="text-[#777B91] font-medium">
                        Confidence: {(report.confidence * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-[#20233A] leading-tight">
                    {report.proposed_research_direction}
                  </h2>
                </div>

                {/* Transformation Pipeline Diagram */}
                <div className="p-4 rounded-xl bg-[#F8F6FD] border border-[#EAE7F2] space-y-2.5">
                  <span className="text-[11px] font-mono uppercase text-[#777B91] font-bold block tracking-wider">
                    Scientific Synthesis Transformation
                  </span>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span className="px-2.5 py-1 rounded-lg bg-[#EEE8FF] text-[#6C4CE3] border border-[#D6C8FF] font-medium">
                      Validated Gap
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#C9C4DC]" />
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-medium">
                      Existing Approaches
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#C9C4DC]" />
                    <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-medium">
                      Known Limitations
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#C9C4DC]" />
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-50 text-cyan-800 border border-cyan-200 font-medium">
                      Prior Art
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#C9C4DC]" />
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold">
                      Proposed Research Direction
                    </span>
                  </div>
                </div>

                {/* Section 1 & 4: Research Problem & Identified Gap */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 rounded-xl bg-[#F8F6FD] border border-[#EAE7F2] space-y-2">
                    <span className="text-xs font-mono uppercase text-[#6C4CE3] block font-semibold">
                      1. Research Problem
                    </span>
                    <p className="text-sm text-[#20233A] leading-relaxed">
                      {report.research_problem}
                    </p>
                  </div>

                  <div className="p-5 rounded-xl bg-[#F8F6FD] border border-[#EAE7F2] space-y-2">
                    <span className="text-xs font-mono uppercase text-[#6C4CE3] block font-semibold">
                      4. Identified Gap
                    </span>
                    <p className="text-sm text-[#20233A] leading-relaxed">
                      {report.identified_gap}
                    </p>
                  </div>
                </div>

                {/* Section 5: Why Existing Work Is Insufficient */}
                <div className="p-5 rounded-xl bg-rose-50/30 border border-rose-200/60 space-y-2">
                  <span className="text-xs font-mono uppercase text-rose-700 block font-semibold">
                    5. Why Existing Work Is Insufficient
                  </span>
                  <p className="text-sm text-[#20233A] leading-relaxed">
                    {report.why_existing_work_is_insufficient}
                  </p>
                </div>

                {/* Section 6 & 7: Proposed Direction & Reasoning */}
                <div className="p-5 rounded-xl bg-[#F8F6FD] border border-[#EAE7F2] space-y-3">
                  <div>
                    <span className="text-xs font-mono uppercase text-[#6C4CE3] block font-semibold">
                      6. Proposed Research Direction
                    </span>
                    <h3 className="text-base font-bold text-[#20233A] mt-1">
                      {report.proposed_research_direction}
                    </h3>
                  </div>

                  <div className="pt-2 border-t border-[#EAE7F2]">
                    <span className="text-xs font-mono uppercase text-[#777B91] block font-semibold mb-1">
                      7. Reasoning & Justification
                    </span>
                    <p className="text-sm text-[#585D76] leading-relaxed">
                      {report.reasoning}
                    </p>
                  </div>
                </div>

                {/* Section 8 & 9: Technical Approach & Expected Contribution */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 rounded-xl bg-[#F8F6FD] border border-[#EAE7F2] space-y-2">
                    <span className="text-xs font-mono uppercase text-[#6C4CE3] font-semibold flex items-center space-x-1.5">
                      <Wrench className="w-3.5 h-3.5" />
                      <span>8. Technical Approach</span>
                    </span>
                    <p className="text-sm text-[#20233A] leading-relaxed">
                      {report.technical_approach}
                    </p>
                  </div>

                  <div className="p-5 rounded-xl bg-[#F8F6FD] border border-[#EAE7F2] space-y-2">
                    <span className="text-xs font-mono uppercase text-emerald-700 font-semibold flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>9. Expected Contribution</span>
                    </span>
                    <p className="text-sm text-[#20233A] leading-relaxed">
                      {report.expected_contribution}
                    </p>
                  </div>
                </div>

                {/* Section 10: Feasibility Assessment */}
                {report.feasibility && (
                  <div className="p-5 rounded-xl bg-[#F8F6FD] border border-[#EAE7F2] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase text-[#20233A] font-semibold flex items-center space-x-1.5">
                        <Gauge className="w-3.5 h-3.5 text-amber-600" />
                        <span>10. Feasibility Assessment</span>
                      </span>
                      <span className="text-xs font-mono text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                        Score: {(report.feasibility.feasibility_score * 100).toFixed(0)}%
                      </span>
                    </div>

                    {report.feasibility.summary && (
                      <p className="text-xs text-[#585D76] italic border-l-2 border-amber-500 pl-3 py-0.5">
                        {report.feasibility.summary}
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="p-3 rounded-lg bg-white border border-[#EAE7F2] text-xs space-y-1">
                        <span className="text-[#777B91] block font-mono font-medium">Required Data</span>
                        <p className="text-[#20233A] font-medium">{report.feasibility.required_data || 'Standard benchmark datasets from corpus'}</p>
                      </div>
                      
                      <div className="p-3 rounded-lg bg-white border border-[#EAE7F2] text-xs space-y-1">
                        <span className="text-[#777B91] block font-mono font-medium">Required Compute</span>
                        <p className="text-[#20233A] font-medium">{report.feasibility.required_compute || 'Standard GPU compute workstation'}</p>
                      </div>

                      <div className="p-3 rounded-lg bg-white border border-[#EAE7F2] text-xs space-y-1">
                        <span className="text-[#777B91] block font-mono font-medium">Implementation Complexity</span>
                        <p className="text-[#20233A] font-medium">{report.feasibility.implementation_complexity || 'Moderate algorithmic complexity'}</p>
                      </div>

                      <div className="p-3 rounded-lg bg-white border border-[#EAE7F2] text-xs space-y-1">
                        <span className="text-[#777B91] block font-mono font-medium">Experimental Setup</span>
                        <p className="text-[#20233A] font-medium">{report.feasibility.experimental_setup || 'Comparative benchmarking against corpus baselines'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 11 & 12: Prior-Art Assessment & Differentiation Panel */}
                <div className="p-6 rounded-xl bg-[#F8F6FD] border border-[#EAE7F2] space-y-4">
                  <div className="flex items-center space-x-2 text-xs font-mono uppercase text-[#20233A] font-semibold">
                    <GitCompare className="w-4 h-4 text-[#6C4CE3]" />
                    <span>11 & 12. Prior-Art Assessment & Differentiation</span>
                  </div>

                  {(report.prior_art_assessment || report.novelty_assessment) && (
                    <div className="space-y-3">
                      <p className="text-sm text-[#585D76] leading-relaxed">
                        {report.prior_art_assessment?.reasoning || report.novelty_assessment?.reasoning}
                      </p>

                      {report.differentiation && (
                        <div className="p-4 rounded-xl bg-white border border-[#EAE7F2] space-y-2">
                          <span className="text-xs font-mono uppercase text-[#6C4CE3] block font-semibold">
                            Key Differentiation & Technical Distinctiveness
                          </span>
                          {Array.isArray(report.differentiation) ? (
                            <ul className="list-disc list-inside text-xs text-[#20233A] space-y-1">
                              {report.differentiation.map((d, i) => (
                                <li key={i}>{d}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-[#20233A] leading-relaxed">
                              {report.differentiation}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Section 13 & 14: Evidence Items & Grounded Traceability */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase text-[#20233A] font-semibold">
                      13 & 14. Ground Evidence & Supporting Papers ({report.supporting_evidence ? report.supporting_evidence.length : 0} items)
                    </span>
                    <span className="text-[11px] font-mono text-[#777B91]">
                      Sentence-level verification
                    </span>
                  </div>

                  <div className="divide-y divide-[#EAE7F2] border border-[#EAE7F2] rounded-xl overflow-hidden bg-white">
                    {report.supporting_evidence && report.supporting_evidence.map((ev, i) => (
                      <div key={ev.statement_id || i} className="p-4 space-y-2 hover:bg-[#F8F6FD] transition-colors">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-[#F8F6FD] text-[#6C4CE3] border border-[#EAE7F2]">
                              {ev.statement_type || 'STATEMENT'}
                            </span>
                            <span className="text-xs font-semibold text-[#20233A]">
                              {ev.paper_title || `Paper ${ev.paper_id.slice(0, 8)}`}
                            </span>
                            {ev.page_start && (
                              <span className="text-[11px] font-mono text-[#777B91]">
                                p.{ev.page_start}
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => onInspectEvidence(ev.statement_id)}
                            className="text-xs font-mono text-[#6C4CE3] hover:text-[#5134BD] hover:underline"
                          >
                            Trace Evidence →
                          </button>
                        </div>

                        <p className="text-xs text-[#585D76] italic font-serif leading-relaxed">
                          "{ev.statement_text}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
