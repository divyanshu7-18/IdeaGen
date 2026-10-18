import React, { useState } from 'react';
import { 
  Search, 
  ExternalLink, 
  CheckSquare, 
  Square, 
  Loader2, 
  AlertCircle, 
  BookOpen, 
  Layers, 
  Calendar, 
  Users 
} from 'lucide-react';
import type { SearchResultPaper } from '../types';
import { api } from '../api/client';

interface LiteratureSearchViewProps {
  onAddPapersToWorkspace: (papers: SearchResultPaper[]) => void;
  workspacePaperIds: Set<string>;
}

export const LiteratureSearchView: React.FC<LiteratureSearchViewProps> = ({
  onAddPapersToWorkspace,
  workspacePaperIds,
}) => {
  const [query, setQuery] = useState<string>('retrieval augmented generation hallucination');
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<SearchResultPaper[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const sampleQueries = [
    'retrieval augmented generation hallucination',
    'grounded reasoning selective evidence',
    'large language model evaluation benchmark',
    'scientific discovery knowledge extraction',
  ];

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.searchPapers(searchQuery, 10);
      setResults(res.papers);
      setHasSearched(true);
      // Pre-select first 3 results by default for convenience
      const newSelected = new Set<string>();
      res.papers.slice(0, 3).forEach((p) => newSelected.add(p.id));
      setSelectedIds(newSelected);
    } catch (err: any) {
      setError(err.message || 'Failed to search arXiv scientific literature.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map((r) => r.id)));
    }
  };

  const handleAddToWorkspace = () => {
    const selectedPapers = results.filter((r) => selectedIds.has(r.id));
    if (selectedPapers.length === 0) return;
    onAddPapersToWorkspace(selectedPapers);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      
      {/* Search Header Banner */}
      <section className="dashboard-card p-6 sm:p-8 space-y-6">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#6C4CE3] uppercase tracking-wider mb-1">
            <Search className="w-3.5 h-3.5" />
            <span>Literature Discovery Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#20233A] tracking-tight">
            Search Scientific Literature
          </h1>
          <p className="text-sm text-[#777B91] mt-1 max-w-3xl leading-relaxed">
            Query arXiv for real scientific papers to stage into your research workspace, extract structured claims, and discover unaddressed research gaps.
          </p>
        </div>

        {/* Search Input Bar (Full Width) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row items-stretch gap-3 w-full"
        >
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#777B91]">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by keywords, scientific problem, or research domain..."
              className="w-full pl-11 pr-4 py-3 bg-[#F8F6FD] border border-[#EAE7F2] rounded-xl text-[#20233A] placeholder-[#777B91] focus:outline-none focus:bg-white focus:border-[#6C4CE3] focus:ring-2 focus:ring-[#6C4CE3]/20 text-sm transition shadow-2xs"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-[#6C4CE3] hover:bg-[#5A3BD1] disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-xs transition flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching arXiv...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Search Literature</span>
              </>
            )}
          </button>
        </form>

        {/* Query Suggestion Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#EAE7F2]">
          <span className="text-xs text-[#777B91] font-medium">Suggested queries:</span>
          {sampleQueries.map((q) => (
            <button
              key={q}
              onClick={() => {
                setQuery(q);
                handleSearch(q);
              }}
              className="text-xs text-[#585D76] hover:text-[#6C4CE3] hover:bg-[#EEE8FF] px-2.5 py-1 rounded-lg border border-[#EAE7F2] transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Search Request Failure</p>
            <p className="text-xs text-rose-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Search Results Section */}
      {hasSearched && (
        <section className="space-y-4">
          
          {/* Action Bar */}
          <div className="dashboard-card px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSelectAll}
                className="flex items-center space-x-2 text-xs font-medium text-[#20233A] hover:text-[#6C4CE3] transition cursor-pointer"
              >
                {selectedIds.size === results.length && results.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-[#6C4CE3]" />
                ) : (
                  <Square className="w-4 h-4 text-[#777B91]" />
                )}
                <span>Select all ({results.length} papers)</span>
              </button>

              <span className="text-xs text-[#777B91] font-mono">
                {selectedIds.size} of {results.length} selected
              </span>
            </div>

            <button
              onClick={handleAddToWorkspace}
              disabled={selectedIds.size === 0}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#6C4CE3] hover:bg-[#5A3BD1] disabled:opacity-40 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Add Selected to Workspace ({selectedIds.size})</span>
            </button>
          </div>

          {/* Results List */}
          {results.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-[#EAE7F2] text-[#777B91] space-y-2">
              <BookOpen className="w-8 h-8 text-[#C9C4DC] mx-auto" />
              <p className="font-medium text-[#20233A]">No scientific papers found</p>
              <p className="text-xs text-[#777B91]">Try refining your search terms or selecting one of the suggested scientific queries above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((paper) => {
                const isSelected = selectedIds.has(paper.id);
                const isAlreadyInWorkspace = workspacePaperIds.has(paper.id);

                return (
                  <div
                    key={paper.id}
                    onClick={() => toggleSelect(paper.id)}
                    className={`p-5 rounded-[18px] border transition-all cursor-pointer bg-white ${
                      isSelected
                        ? 'border-[#6C4CE3] ring-1 ring-[#6C4CE3]/20 shadow-xs'
                        : 'border-[#EAE7F2] hover:border-[#DDD8E8] shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(paper.id);
                        }}
                        className="mt-1 text-[#777B91] hover:text-[#6C4CE3] shrink-0"
                        aria-label={`Select paper ${paper.title}`}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-[#6C4CE3]" />
                        ) : (
                          <Square className="w-5 h-5 text-[#C9C4DC]" />
                        )}
                      </button>

                      {/* Paper details */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F8F6FD] text-[#6C4CE3] font-semibold uppercase border border-[#EAE7F2]">
                            {paper.source || 'ARXIV'}
                          </span>
                          {isAlreadyInWorkspace && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                              In Workspace
                            </span>
                          )}
                        </div>

                        <h2 className="text-base font-bold text-[#20233A] leading-snug">
                          {paper.title}
                        </h2>

                        {/* Metadata row */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#777B91]">
                          <div className="flex items-center space-x-1.5">
                            <Users className="w-3.5 h-3.5 text-[#777B91]" />
                            <span>
                              {paper.authors.length > 0
                                ? paper.authors.slice(0, 3).join(', ') + (paper.authors.length > 3 ? ' et al.' : '')
                                : 'Authors unspecified'}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#777B91]" />
                            <span>{paper.publication_year || 'Recent'}</span>
                          </div>

                          {paper.doi && (
                            <span className="font-mono text-[#777B91]">
                              DOI: {paper.doi}
                            </span>
                          )}
                        </div>

                        {/* Abstract */}
                        <p className="text-xs text-[#585D76] leading-relaxed line-clamp-3">
                          {paper.abstract}
                        </p>

                        {/* Link */}
                        {paper.url && (
                          <div className="pt-1">
                            <a
                              href={paper.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center space-x-1 text-xs text-[#6C4CE3] hover:text-[#5134BD] font-medium transition"
                            >
                              <span>View on arXiv</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Add-To-Workspace Bar */}
          {results.length > 0 && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleAddToWorkspace}
                disabled={selectedIds.size === 0}
                className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-[#6C4CE3] hover:bg-[#5A3BD1] disabled:opacity-40 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>Add Selected Papers to Workspace ({selectedIds.size})</span>
              </button>
            </div>
          )}

        </section>
      )}

    </div>
  );
};
