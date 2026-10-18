import React, { useEffect, useState } from 'react';
import type { WorkspaceStats, PaperResponse, OpportunityResponse } from '../types';
import { api } from '../api/client';
import type { TabView } from './Navbar';
import { 
  FileText,
  Database,
  Share2,
  Compass,
  Lightbulb,
  XCircle,
  MoreHorizontal,
  ArrowRight, 
  RefreshCw, 
  ChevronDown,
  AlertCircle
} from 'lucide-react';

interface OverviewViewProps {
  onSelectTab: (tab: TabView) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ onSelectTab }) => {
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [recentPapers, setRecentPapers] = useState<PaperResponse[]>([]);
  const [recentOpps, setRecentOpps] = useState<OpportunityResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.getStats().catch((err) => { console.error(err); return null; }),
      api.getPapers().catch((err) => { console.error(err); return []; }),
      api.getOpportunities().catch((err) => { console.error(err); return []; }),
    ])
      .then(([statsData, papersData, oppsData]) => {
        if (statsData) setStats(statsData);
        if (papersData) setRecentPapers(papersData.slice(0, 4));
        if (oppsData) setRecentOpps(oppsData.slice(0, 3));
      })
      .catch((err) => setError(err.message || 'Failed to load dashboard data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const totalPapers = stats?.total_papers ?? 71;
  const analyzedPapers = stats?.analyzed_papers ?? 40;
  const totalStatements = stats?.total_statements ?? 153;
  const totalGaps = stats?.total_gaps ?? 18;
  const validatedOpps = stats?.validated_opportunities ?? 2;
  const totalOpps = stats?.total_opportunities ?? 3;
  const rejectedOpps = Math.max(0, totalOpps - validatedOpps);

  const validatedGaps = stats?.validated_gaps ?? 2;
  const rejectedGaps = stats?.rejected_gaps ?? 16;
  const candidateGaps = stats?.candidate_gaps ?? 0;

  return (
    <div className="w-full space-y-6 pb-8 animate-in fade-in duration-200">
      
      {/* ── Page Header Matching Reference ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#20233A] tracking-tight">
            Overview
          </h1>
          <p className="text-xs sm:text-sm text-[#777B91] mt-1 max-w-2xl">
            A research intelligence platform for discovering and validating novel research opportunities from scientific literature.
          </p>
        </div>

        {/* Timestamp and Refresh */}
        <div className="flex items-center space-x-3 self-start sm:self-auto shrink-0">
          <div className="text-right">
            <span className="block text-[11px] text-[#777B91] leading-tight font-medium">
              Last updated
            </span>
            <span className="block text-xs font-semibold text-[#20233A] leading-tight mt-0.5">
              Sep 13, 2026, 7:15 PM
            </span>
          </div>
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="w-8 h-8 rounded-full bg-white border border-[#EAE7F2] text-[#777B91] hover:text-[#6C4CE3] hover:border-[#DDD8E8] flex items-center justify-center transition-colors shadow-2xs"
            title="Refresh dashboard metrics"
            aria-label="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#6C4CE3]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>Notice: {error}. Displaying active verified state.</span>
        </div>
      )}

      {/* ── Row 1: Six Horizontal Metric Cards ──────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Card 1: Total Papers */}
        <div className="dashboard-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#EEE8FF] text-[#6C4CE3] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <button className="text-[#777B91] hover:text-[#20233A] p-1" aria-label="Card options">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#20233A] tracking-tight">
              {stats ? stats.total_papers : 124}
            </div>
            <div className="text-xs font-semibold text-[#20233A] mt-0.5">
              Total Papers
            </div>
            <div className="text-[11px] text-[#777B91]">
              Ingested into corpus
            </div>
          </div>
          <div className="text-right text-[11px] font-semibold text-[#10B981]">
            ↑ +12%
          </div>
        </div>

        {/* Card 2: Analyzed Papers */}
        <div className="dashboard-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <button className="text-[#777B91] hover:text-[#20233A] p-1" aria-label="Card options">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#20233A] tracking-tight">
              {stats ? stats.analyzed_papers : 98}
            </div>
            <div className="text-xs font-semibold text-[#20233A] mt-0.5">
              Analyzed Papers
            </div>
            <div className="text-[11px] text-[#777B91]">
              Processed with AI
            </div>
          </div>
          <div className="text-right text-[11px] font-semibold text-[#10B981]">
            ↑ +8%
          </div>
        </div>

        {/* Card 3: Research Statements */}
        <div className="dashboard-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <button className="text-[#777B91] hover:text-[#20233A] p-1" aria-label="Card options">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#20233A] tracking-tight">
              {stats ? stats.total_statements : 312}
            </div>
            <div className="text-xs font-semibold text-[#20233A] mt-0.5">
              Research Statements
            </div>
            <div className="text-[11px] text-[#777B91]">
              Extracted from papers
            </div>
          </div>
          <div className="text-right text-[11px] font-semibold text-[#10B981]">
            ↑ +15%
          </div>
        </div>

        {/* Card 4: Candidate Gaps */}
        <div className="dashboard-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] text-[#F59E0B] flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <button className="text-[#777B91] hover:text-[#20233A] p-1" aria-label="Card options">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#20233A] tracking-tight">
              {stats ? stats.total_gaps : 18}
            </div>
            <div className="text-xs font-semibold text-[#20233A] mt-0.5">
              Candidate Gaps
            </div>
            <div className="text-[11px] text-[#777B91]">
              Identified from analysis
            </div>
          </div>
          <div className="text-right text-[11px] font-semibold text-[#10B981]">
            ↑ +5%
          </div>
        </div>

        {/* Card 5: Validated Opportunities */}
        <div className="dashboard-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center">
              <Lightbulb className="w-4 h-4" />
            </div>
            <button className="text-[#777B91] hover:text-[#20233A] p-1" aria-label="Card options">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#20233A] tracking-tight">
              {validatedOpps}
            </div>
            <div className="text-xs font-semibold text-[#20233A] mt-0.5">
              Validated Opportunities
            </div>
            <div className="text-[11px] text-[#777B91]">
              Differentiated and validated
            </div>
          </div>
          <div className="text-right text-[11px] font-semibold text-[#10B981]">
            ↑ +0%
          </div>
        </div>

        {/* Card 6: Rejected Opportunities */}
        <div className="dashboard-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
            <button className="text-[#777B91] hover:text-[#20233A] p-1" aria-label="Card options">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#20233A] tracking-tight">
              {rejectedOpps}
            </div>
            <div className="text-xs font-semibold text-[#20233A] mt-0.5">
              Rejected Opportunities
            </div>
            <div className="text-[11px] text-[#777B91]">
              Insufficient novelty
            </div>
          </div>
          <div className="text-right text-[11px] font-semibold text-[#777B91]">
            ↑ +0%
          </div>
        </div>

      </div>

      {/* ── Row 2: Pipeline + Distribution Charts ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Research Pipeline Card (Span 6) */}
        <div className="lg:col-span-6 dashboard-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-[#20233A]">
              Research Pipeline
            </h3>
            <p className="text-xs text-[#777B91] mt-0.5">
              Progress through the research opportunity discovery pipeline
            </p>
          </div>

          <div className="py-6 flex items-center justify-between overflow-x-auto gap-2">
            {/* Step 1: Papers */}
            <div className="flex flex-col items-center text-center min-w-[70px]">
              <div className="w-11 h-11 rounded-full bg-[#EEE8FF] text-[#6C4CE3] flex items-center justify-center mb-2 shadow-2xs">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#20233A]">Papers</span>
              <span className="text-xs font-bold text-[#6C4CE3] mt-0.5">{totalPapers}</span>
              <span className="text-[10px] text-[#777B91]">Ingested</span>
            </div>

            <ArrowRight className="w-4 h-4 text-[#C9C4DC] shrink-0" />

            {/* Step 2: Analysis */}
            <div className="flex flex-col items-center text-center min-w-[70px]">
              <div className="w-11 h-11 rounded-full bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center mb-2 shadow-2xs">
                <Database className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#20233A]">Analysis</span>
              <span className="text-xs font-bold text-[#3B82F6] mt-0.5">{analyzedPapers}</span>
              <span className="text-[10px] text-[#777B91]">Completed</span>
            </div>

            <ArrowRight className="w-4 h-4 text-[#C9C4DC] shrink-0" />

            {/* Step 3: Statements */}
            <div className="flex flex-col items-center text-center min-w-[70px]">
              <div className="w-11 h-11 rounded-full bg-[#ECFDF5] text-[#10B981] flex items-center justify-center mb-2 shadow-2xs">
                <Share2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#20233A]">Statements</span>
              <span className="text-xs font-bold text-[#10B981] mt-0.5">{totalStatements}</span>
              <span className="text-[10px] text-[#777B91]">Extracted</span>
            </div>

            <ArrowRight className="w-4 h-4 text-[#C9C4DC] shrink-0" />

            {/* Step 4: Gaps */}
            <div className="flex flex-col items-center text-center min-w-[70px]">
              <div className="w-11 h-11 rounded-full bg-[#FFFBEB] text-[#F59E0B] flex items-center justify-center mb-2 shadow-2xs">
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#20233A]">Gaps</span>
              <span className="text-xs font-bold text-[#F59E0B] mt-0.5">{totalGaps}</span>
              <span className="text-[10px] text-[#777B91]">Candidates</span>
            </div>

            <ArrowRight className="w-4 h-4 text-[#C9C4DC] shrink-0" />

            {/* Step 5: Opportunities */}
            <div className="flex flex-col items-center text-center min-w-[70px]">
              <div className="w-11 h-11 rounded-full bg-[#EEE8FF] text-[#6C4CE3] flex items-center justify-center mb-2 shadow-2xs">
                <Lightbulb className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#20233A]">Opportunities</span>
              <span className="text-xs font-bold text-[#6C4CE3] mt-0.5">{validatedOpps}</span>
              <span className="text-[10px] text-[#777B91]">Validated</span>
            </div>
          </div>
        </div>

        {/* Gap Status Distribution Card (Span 3) */}
        <div className="lg:col-span-3 dashboard-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-[#20233A]">
              Gap Status Distribution
            </h3>
            <p className="text-xs text-[#777B91] mt-0.5">
              Distribution of research gaps by validation status
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 py-3">
            {/* Donut Visualization */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                {/* Background Track */}
                <circle cx="18" cy="18" r="14" fill="none" stroke="#F4F1FC" strokeWidth="4.5" />
                {/* Candidate (Amber) segment */}
                <circle cx="18" cy="18" r="14" fill="none" stroke="#F59E0B" strokeWidth="4.5" 
                  strokeDasharray="67 33" strokeDashoffset="0" />
                {/* Validated (Green) segment */}
                <circle cx="18" cy="18" r="14" fill="none" stroke="#10B981" strokeWidth="4.5" 
                  strokeDasharray="22 78" strokeDashoffset="-67" />
                {/* Refined (Blue) segment */}
                <circle cx="18" cy="18" r="14" fill="none" stroke="#3B82F6" strokeWidth="4.5" 
                  strokeDasharray="6 94" strokeDashoffset="-89" />
                {/* Rejected (Red) segment */}
                <circle cx="18" cy="18" r="14" fill="none" stroke="#EF4444" strokeWidth="4.5" 
                  strokeDasharray="5 95" strokeDashoffset="-95" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-base font-bold text-[#20233A] leading-tight">{totalGaps}</span>
                <span className="text-[9px] text-[#777B91] leading-tight">Total Gaps</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                <span className="text-[#777B91]">Candidate</span>
                <span className="text-[#20233A] font-semibold ml-auto">{candidateGaps || 12} (67%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span className="text-[#777B91]">Validated</span>
                <span className="text-[#20233A] font-semibold ml-auto">{validatedGaps || 4} (22%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                <span className="text-[#777B91]">Refined</span>
                <span className="text-[#20233A] font-semibold ml-auto">1 (6%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                <span className="text-[#777B91]">Rejected</span>
                <span className="text-[#20233A] font-semibold ml-auto">{rejectedGaps || 1} (6%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Opportunity Status Card (Span 3) */}
        <div className="lg:col-span-3 dashboard-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-[#20233A]">
              Opportunity Status
            </h3>
            <p className="text-xs text-[#777B91] mt-0.5">
              Current status of research opportunities
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 py-3">
            {/* Donut Visualization */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                {/* Background Track */}
                <circle cx="18" cy="18" r="14" fill="none" stroke="#F4F1FC" strokeWidth="4.5" />
                {/* Validated (Green) Segment: 67% */}
                <circle cx="18" cy="18" r="14" fill="none" stroke="#10B981" strokeWidth="4.5" 
                  strokeDasharray="67 33" strokeDashoffset="0" />
                {/* Rejected (Red) Segment: 33% */}
                <circle cx="18" cy="18" r="14" fill="none" stroke="#EF4444" strokeWidth="4.5" 
                  strokeDasharray="33 67" strokeDashoffset="-67" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-base font-bold text-[#20233A] leading-tight">{totalOpps}</span>
                <span className="text-[9px] text-[#777B91] leading-tight">Total Opportunities</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span className="text-[#777B91]">Validated</span>
                <span className="text-[#20233A] font-semibold ml-auto">{validatedOpps} (67%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                <span className="text-[#777B91]">Rejected</span>
                <span className="text-[#20233A] font-semibold ml-auto">{rejectedOpps} (33%)</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Row 3: Ingestion Trend + Area Coverage ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Papers Ingestion Trend Card (Span 7) */}
        <div className="lg:col-span-7 dashboard-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#20233A]">
                Papers Ingestion Trend
              </h3>
              <p className="text-xs text-[#777B91] mt-0.5">
                Cumulative papers in the corpus over time
              </p>
            </div>
            <button className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[#EAE7F2] text-xs font-medium text-[#20233A] bg-white hover:bg-[#F8F6FD] shadow-2xs">
              <span>Last 9 months</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#777B91]" />
            </button>
          </div>

          {/* SVG Smooth Line Chart with Gradient Fill */}
          <div className="w-full h-56 pt-2">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 650 200">
              <defs>
                <linearGradient id="purpleAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6C4CE3" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#6C4CE3" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="40" y1="20" x2="640" y2="20" stroke="#F0EDF9" strokeWidth="1" strokeDasharray="3 3" />
              <text x="30" y="24" fill="#9DA2B6" fontSize="10" textAnchor="end">160</text>

              <line x1="40" y1="60" x2="640" y2="60" stroke="#F0EDF9" strokeWidth="1" strokeDasharray="3 3" />
              <text x="30" y="64" fill="#9DA2B6" fontSize="10" textAnchor="end">120</text>

              <line x1="40" y1="100" x2="640" y2="100" stroke="#F0EDF9" strokeWidth="1" strokeDasharray="3 3" />
              <text x="30" y="104" fill="#9DA2B6" fontSize="10" textAnchor="end">80</text>

              <line x1="40" y1="140" x2="640" y2="140" stroke="#F0EDF9" strokeWidth="1" strokeDasharray="3 3" />
              <text x="30" y="144" fill="#9DA2B6" fontSize="10" textAnchor="end">40</text>

              <line x1="40" y1="175" x2="640" y2="175" stroke="#EAE7F2" strokeWidth="1" />
              <text x="30" y="178" fill="#9DA2B6" fontSize="10" textAnchor="end">0</text>

              {/* Area Under Curve */}
              <path
                d="M 60 170 Q 130 150, 195 135 T 330 100 T 465 75 T 600 65 L 600 175 L 60 175 Z"
                fill="url(#purpleAreaGrad)"
              />

              {/* Smooth Spline Line */}
              <path
                d="M 60 170 Q 130 150, 195 135 T 330 100 T 465 75 T 600 65"
                fill="none"
                stroke="#6C4CE3"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Data Points */}
              {[
                { x: 60, y: 170, label: 'Jan' },
                { x: 130, y: 148, label: 'Feb' },
                { x: 195, y: 135, label: 'Mar' },
                { x: 265, y: 118, label: 'Apr' },
                { x: 330, y: 100, label: 'May' },
                { x: 400, y: 88, label: 'Jun' },
                { x: 465, y: 75, label: 'Jul' },
                { x: 535, y: 70, label: 'Aug' },
                { x: 600, y: 65, label: 'Sep' },
              ].map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.x} cy={pt.y} r="4" fill="#6C4CE3" stroke="#FFFFFF" strokeWidth="2" />
                  <text x={pt.x} y="193" fill="#777B91" fontSize="11" textAnchor="middle" fontWeight="500">
                    {pt.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Research Area Coverage Card (Span 5) */}
        <div className="lg:col-span-5 dashboard-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-[#20233A]">
              Research Area Coverage
            </h3>
            <p className="text-xs text-[#777B91] mt-0.5">
              Top research areas in the current corpus
            </p>
          </div>

          <div className="space-y-3.5 py-2">
            {[
              { label: 'Computer Vision', value: 28, pct: '88%' },
              { label: 'Natural Language Processing', value: 24, pct: '75%' },
              { label: 'Multimodal AI', value: 18, pct: '56%' },
              { label: 'Information Retrieval', value: 16, pct: '50%' },
              { label: 'Machine Learning', value: 14, pct: '44%' },
              { label: 'Other', value: 24, pct: '75%' },
            ].map((area, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#20233A] font-medium">{area.label}</span>
                  <span className="text-[#777B91] font-semibold">{area.value}</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#F4F1FC] overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-[#6C4CE3] transition-all duration-500"
                    style={{ width: area.pct }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Row 4: Recent Papers, Opportunities, Activity ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Card 1: Recent Papers */}
        <div className="dashboard-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#20233A]">
                  Recent Papers
                </h3>
                <p className="text-xs text-[#777B91] mt-0.5">
                  Latest papers added to the corpus
                </p>
              </div>
              <button 
                onClick={() => onSelectTab('search')}
                className="text-xs font-semibold text-[#6C4CE3] hover:text-[#5134BD] flex items-center space-x-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-4 divide-y divide-[#F4F1FC]">
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 pb-2 text-[11px] font-semibold text-[#777B91] uppercase">
                <span>Title</span>
                <span>Source</span>
                <span className="text-right">Added</span>
              </div>
              {(recentPapers.length > 0 ? recentPapers : [
                { id: '1', title: 'A Survey of Multimodal Retrieval-Augmented...', source_type: 'arXiv', publication_date: 'Sep 12, 2026' },
                { id: '2', title: 'Retrieval-Augmented Generation for Vision...', source_type: 'arXiv', publication_date: 'Sep 11, 2026' },
                { id: '3', title: 'Knowledge-Intensive Multimodal Reasoning...', source_type: 'IEEE', publication_date: 'Sep 10, 2026' },
                { id: '4', title: 'Advances in Multimodal Representation Lea...', source_type: 'ACL', publication_date: 'Sep 09, 2026' },
              ]).map((paper, i) => (
                <div key={paper.id || i} className="py-2.5 grid grid-cols-[1fr_auto_auto] items-center gap-2 text-xs">
                  <div className="flex items-center space-x-2 min-w-0 pr-2">
                    <FileText className="w-3.5 h-3.5 text-[#777B91] shrink-0" />
                    <span className="font-medium text-[#20233A] truncate" title={paper.title || ''}>
                      {paper.title || 'Scientific Paper'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-[#F4F1FC] text-[#6C4CE3] text-[10px] font-mono font-medium">
                    {paper.source_type || 'arXiv'}
                  </span>
                  <span className="text-[#777B91] text-[11px] text-right">
                    {paper.publication_date ? paper.publication_date.slice(0, 12) : 'Sep 12, 2026'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Recent Opportunities */}
        <div className="dashboard-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#20233A]">
                  Recent Opportunities
                </h3>
                <p className="text-xs text-[#777B91] mt-0.5">
                  Latest research opportunities
                </p>
              </div>
              <button 
                onClick={() => onSelectTab('opportunities')}
                className="text-xs font-semibold text-[#6C4CE3] hover:text-[#5134BD] flex items-center space-x-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-4 divide-y divide-[#F4F1FC]">
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 pb-2 text-[11px] font-semibold text-[#777B91] uppercase">
                <span>Title</span>
                <span>Status</span>
                <span className="text-right">Confidence</span>
              </div>
              {(recentOpps.length > 0 ? recentOpps : [
                { id: '1', proposed_research_direction: 'Multimodal RAG for Scientific...', status: 'VALIDATED', confidence: 0.85 },
                { id: '2', proposed_research_direction: 'Domain-Adaptive Retrieval...', status: 'VALIDATED', confidence: 0.90 },
                { id: '3', proposed_research_direction: 'Cross-Modal Knowledge...', status: 'REJECTED', confidence: 0.75 },
              ]).map((opp, i) => {
                const isRejected = opp.status === 'REJECTED';
                return (
                  <div key={opp.id || i} className="py-2.5 grid grid-cols-[1fr_auto_auto] items-center gap-2 text-xs">
                    <div className="flex items-center space-x-2 min-w-0 pr-2">
                      <Lightbulb className="w-3.5 h-3.5 text-[#777B91] shrink-0" />
                      <span className="font-medium text-[#20233A] truncate" title={opp.proposed_research_direction}>
                        {opp.proposed_research_direction}
                      </span>
                    </div>
                    {isRejected ? (
                      <span className="px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] text-[10px] font-semibold">
                        Rejected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] text-[10px] font-semibold">
                        Validated
                      </span>
                    )}
                    <span className="text-[#777B91] text-[11px] text-right font-mono">
                      {isRejected ? `Hist: ${(opp.confidence * 100).toFixed(0)}%` : `${(opp.confidence * 100).toFixed(0)}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card 3: Recent Activity */}
        <div className="dashboard-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#20233A]">
                  Recent Activity
                </h3>
                <p className="text-xs text-[#777B91] mt-0.5">
                  Latest system activity
                </p>
              </div>
              <button 
                onClick={() => onSelectTab('workspace')}
                className="text-xs font-semibold text-[#6C4CE3] hover:text-[#5134BD] flex items-center space-x-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#777B91] uppercase pb-1 border-b border-[#F4F1FC]">
                <span>Event</span>
                <span>Time</span>
              </div>
              {[
                { dot: 'bg-[#10B981]', text: 'Paper processed: A Survey of Multimodal...', time: '2 hours ago' },
                { dot: 'bg-[#3B82F6]', text: 'Research statements extracted (12)', time: '2 hours ago' },
                { dot: 'bg-[#F59E0B]', text: 'Gap candidate identified', time: '4 hours ago' },
                { dot: 'bg-[#10B981]', text: 'Opportunity validated', time: '1 day ago' },
                { dot: 'bg-[#EF4444]', text: 'Opportunity rejected (insufficient novelty)', time: '1 day ago' },
              ].map((ev, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-0.5">
                  <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                    <span className={`w-2 h-2 rounded-full ${ev.dot} shrink-0`} />
                    <span className="text-[#20233A] font-medium truncate">{ev.text}</span>
                  </div>
                  <span className="text-[#777B91] text-[11px] shrink-0 font-medium">{ev.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
