import { useState, useEffect } from 'react';
import { Navbar, type TabView } from './components/Navbar';
import { LiteratureSearchView } from './components/LiteratureSearchView';
import { WorkspaceView, type WorkspaceItem } from './components/WorkspaceView';
import { LandscapeView } from './components/LandscapeView';
import { GapExplorerView } from './components/GapExplorerView';
import { OpportunityStudioView } from './components/OpportunityStudioView';
import { EvaluationView } from './components/EvaluationView';
import { OverviewView } from './components/OverviewView';
import { EvidenceDrawer } from './components/EvidenceDrawer';
import type { SearchResultPaper } from './types';
import { api } from './api/client';
import { 
  Menu, 
  Search, 
  Bell, 
  ChevronDown 
} from 'lucide-react';
import './App.css';

export function App() {
  const [currentTab, setCurrentTab] = useState<TabView>('overview');
  const [workspaceItems, setWorkspaceItems] = useState<WorkspaceItem[]>([]);
  const [activeEvidenceStatementId, setActiveEvidenceStatementId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Initialize workspace with real papers already in PostgreSQL database
  useEffect(() => {
    api.getPapers()
      .then((papers) => {
        if (papers.length > 0) {
          const initialItems: WorkspaceItem[] = papers.slice(0, 5).map((p) => ({
            id: p.id,
            title: p.title || `Paper ${p.source_id}`,
            source: p.source_type,
            authors: p.authors || [],
            publication_date: p.publication_date || undefined,
            abstract: p.abstract,
            status: p.knowledge_status === 'ANALYZED' ? 'ANALYZED' : 'INGESTED',
            persistedPaperId: p.id,
          }));
          setWorkspaceItems(initialItems);
        }
      })
      .catch((err) => console.error('Failed to pre-load corpus papers:', err));
  }, []);

  const handleInspectEvidence = (statementId: string) => {
    setActiveEvidenceStatementId(statementId);
  };

  const handleCloseEvidence = () => {
    setActiveEvidenceStatementId(null);
  };

  const handleGenerateOpportunity = () => {
    setCurrentTab('opportunities');
  };

  const handleAddPapersToWorkspace = (papers: SearchResultPaper[]) => {
    setWorkspaceItems((prev) => {
      const existingIds = new Set(prev.map((i) => i.id));
      const newItems: WorkspaceItem[] = papers
        .filter((p) => !existingIds.has(p.id))
        .map((p) => ({
          id: p.id,
          title: p.title,
          source: p.source,
          authors: p.authors,
          publication_date: p.publication_date,
          abstract: p.abstract,
          status: 'NOT_INGESTED',
          rawSearchData: p,
        }));
      return [...newItems, ...prev];
    });
    setCurrentTab('workspace');
  };

  const handleRemoveWorkspaceItem = (id: string) => {
    setWorkspaceItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateWorkspaceItemStatus = (
    id: string,
    status: 'NOT_INGESTED' | 'INGESTED' | 'ANALYZED',
    persistedId?: string
  ) => {
    setWorkspaceItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status, persistedPaperId: persistedId ?? item.persistedPaperId } : item
      )
    );
  };

  const handleHeaderSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setCurrentTab('search');
    }
  };

  const workspacePaperIds = new Set(workspaceItems.map((i) => i.id));

  return (
    <div className="min-h-screen bg-[#F4F1FC] text-[#20233A] font-sans antialiased flex flex-col lg:flex-row">
      
      {/* Reference Matching Clean White Sidebar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        workspaceCount={workspaceItems.length}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Fluid Canvas Area on Lavender Background */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F4F1FC]">
        
        {/* Horizontal Top Header Matching Reference Screenshot */}
        <header className="h-[68px] px-6 sm:px-8 flex items-center justify-between border-b border-[#EAE7F2] bg-[#F4F1FC] sticky top-0 z-20">
          <div className="flex items-center space-x-3 lg:space-x-0 w-full max-w-xl">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-[#777B91] hover:text-[#20233A] rounded-xl hover:bg-white border border-transparent hover:border-[#EAE7F2]"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search Bar from reference */}
            <form onSubmit={handleHeaderSearch} className="relative w-full max-w-lg">
              <Search className="w-4 h-4 text-[#777B91] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search papers, topics, or research areas..."
                className="w-full bg-white border border-[#EAE7F2] rounded-xl text-xs sm:text-sm text-[#20233A] placeholder-[#777B91] focus:outline-none focus:ring-2 focus:ring-[#6C4CE3]/20 focus:border-[#6C4CE3] shadow-2xs transition-all"
                style={{ paddingLeft: '40px', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px' }}
              />
            </form>
          </div>

          {/* Right Header Controls: Notification + User Profile */}
          <div className="flex items-center space-x-4">
            {/* Notification Bell with Red Dot badge "1" */}
            <div className="relative">
              <button 
                onClick={() => alert("Notification: Database synchronized with 153 research statements.")}
                className="w-9 h-9 rounded-xl bg-white border border-[#EAE7F2] text-[#777B91] hover:text-[#20233A] hover:border-[#DDD8E8] flex items-center justify-center transition-colors shadow-2xs"
                title="System Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#EF4444] text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs">
                  1
                </span>
              </button>
            </div>

            {/* User Profile matching reference */}
            <div className="flex items-center space-x-3 pl-2 cursor-pointer group">
              <div className="w-9 h-9 rounded-full bg-[#6C4CE3] text-white flex items-center justify-center font-bold text-xs shadow-xs group-hover:bg-[#5A3BD1] transition-colors">
                DK
              </div>
              <div className="hidden sm:block text-left">
                <span className="block text-xs font-bold text-[#20233A] leading-tight group-hover:text-[#6C4CE3] transition-colors">
                  Divyanshu Kumar
                </span>
                <span className="block text-[10px] text-[#777B91] font-medium leading-tight mt-0.5">
                  Student • VIT
                </span>
              </div>
              <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-[#777B91] group-hover:text-[#20233A] transition-colors" />
            </div>
          </div>
        </header>

        {/* Dashboard Body on Soft Lavender Canvas */}
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 min-w-0">
          {currentTab === 'overview' && (
            <OverviewView onSelectTab={setCurrentTab} />
          )}

          {currentTab === 'search' && (
            <LiteratureSearchView
              onAddPapersToWorkspace={handleAddPapersToWorkspace}
              workspacePaperIds={workspacePaperIds}
            />
          )}

          {currentTab === 'workspace' && (
            <WorkspaceView
              items={workspaceItems}
              onRemoveItem={handleRemoveWorkspaceItem}
              onUpdateItemStatus={handleUpdateWorkspaceItemStatus}
              onSelectTab={setCurrentTab}
            />
          )}

          {currentTab === 'knowledge' && (
            <LandscapeView onInspectEvidence={handleInspectEvidence} />
          )}

          {currentTab === 'gaps' && (
            <GapExplorerView
              onInspectEvidence={handleInspectEvidence}
              onSelectTab={setCurrentTab}
              onGenerateOpportunity={handleGenerateOpportunity}
            />
          )}

          {currentTab === 'opportunities' && (
            <OpportunityStudioView
              onInspectEvidence={handleInspectEvidence}
            />
          )}

          {currentTab === 'reports' && (
            <OpportunityStudioView
              onInspectEvidence={handleInspectEvidence}
              mode="reports"
            />
          )}

          {currentTab === 'evaluation' && (
            <EvaluationView />
          )}
        </main>

        {/* Global Clean Sub-Footer */}
        <footer className="border-t border-[#EAE7F2] py-4 px-6 sm:px-8 text-xs text-[#777B91]">
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-[#20233A]">IdeaGen</span>
              <span>—</span>
              <span>Evidence-Grounded Research Discovery System</span>
            </div>
            <div className="flex items-center space-x-3 text-[11px] font-mono text-[#777B91]">
              <span className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                <span>PostgreSQL Corpus Active</span>
              </span>
              <span>•</span>
              <span>Ollama Offline Pipeline</span>
            </div>
          </div>
        </footer>

      </div>

      {/* Slide-out Ground Evidence Provenance Drawer */}
      <EvidenceDrawer
        statementId={activeEvidenceStatementId}
        onClose={handleCloseEvidence}
      />

    </div>
  );
}

export default App;
