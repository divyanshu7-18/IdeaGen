import { useState, useRef } from 'react';
import { ShieldAlert, BookOpen, Clock, Activity, ArrowRight, CheckCircle, Database, ChevronRight, ArrowLeft, Search, Upload, FileText, Loader2, Trash2 } from 'lucide-react';
import './App.css';

// Interfaces...
interface DemoPaper {
  id: string;
  title: string;
  date: string | null;
}

interface DemoDiscovery {
  cluster_size: number;
  papers: DemoPaper[];
}

interface DemoGroundedClaim {
  text: string;
  refs: string[];
}

interface DemoEvidence {
  source_id: string;
  title: string;
  text: string;
}

interface DemoGrounding {
  claims: DemoGroundedClaim[];
  evidence: DemoEvidence[];
}

interface DemoTimelineEvent {
  relationship: string;
  paper_title: string;
  paper_date: string | null;
  status_change: string;
  excerpt: string;
}

interface DemoTimelineBatch {
  batch_id: string;
  name: string;
  events: DemoTimelineEvent[];
}

interface DemoLeakageProtection {
  future_paper: string;
  future_date: string | null;
  result: string;
}

interface DemoScenarioResponse {
  opportunity_id: string;
  title: string;
  problem_statement: string;
  initial_status: string;
  final_status: string;
  discovery: DemoDiscovery;
  grounding: DemoGrounding;
  timeline: DemoTimelineBatch[];
  leakage_protection: DemoLeakageProtection;
}

interface DemoOpportunityOverview {
  opportunity_id: string;
  title: string;
  problem_statement: string;
  status: string;
  confidence: number;
  supporting_papers_count: number;
  evidence_count: number;
}

interface SearchResultPaper {
  id: string;
  source: string;
  title: string;
  authors: string[];
  publication_year: number;
  publication_date: string;
  abstract: string;
  url: string | null;
  doi: string | null;
  raw_metadata: any;
  selected?: boolean;
}

// Main App
function App() {
  const [view, setView] = useState<'home' | 'search' | 'upload' | 'review' | 'progress' | 'results' | 'detail'>('home');
  
  // Data states
  const [searchQuery, setSearchQuery] = useState("");
  const [papers, setPapers] = useState<SearchResultPaper[]>([]);
  const [opportunities, setOpportunities] = useState<DemoOpportunityOverview[]>([]);
  const [detailData, setDetailData] = useState<DemoScenarioResponse | null>(null);
  
  // UI states
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fallback demo corpus
  const loadDemoCorpus = () => {
    setError(null);
    setIsProcessing(true);
    fetch('http://localhost:8000/api/demo/opportunities')
      .then(res => {
        if (!res.ok) throw new Error('Demo corpus unavailable.');
        return res.json();
      })
      .then(data => {
        setOpportunities(data);
        setView('results');
      })
      .catch(err => setError(err.message))
      .finally(() => setIsProcessing(false));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsProcessing(true);
    setError(null);

    fetch('http://localhost:8000/api/search/papers?q=' + encodeURIComponent(searchQuery) + '&limit=15')
      .then(res => {
        if (!res.ok) throw new Error('Live paper search is temporarily unavailable.');
        return res.json();
      })
      .then(data => {
        if (data.papers.length === 0) {
          throw new Error('No papers found. Try another topic or use the demo corpus.');
        }
        setPapers(data.papers.map((p: any) => ({ ...p, selected: true })));
        setView('review');
      })
      .catch(err => {
        if (err.message === "Failed to fetch") {
          setError("Could not connect to the IdeaGen backend. Make sure the backend is running on port 8000.");
        } else {
          setError(err.message);
        }
      })
      .finally(() => setIsProcessing(false));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validPdfs = newFiles.filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
      if (uploadFiles.length + validPdfs.length > 20) {
        setError("Maximum 20 PDFs allowed.");
        return;
      }
      setUploadFiles(prev => [...prev, ...validPdfs]);
    }
  };

  const removeUploadFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processUploads = () => {
    if (uploadFiles.length === 0) return;
    setIsProcessing(true);
    setError(null);
    
    const formData = new FormData();
    uploadFiles.forEach(file => {
      formData.append('files', file);
    });

    fetch('http://localhost:8000/api/papers/upload', {
      method: 'POST',
      body: formData,
    })
      .then(res => {
        if (!res.ok) throw new Error("Upload failed. Please ensure files are valid PDFs.");
        return res.json();
      })
      .then(data => {
        setPapers(data.papers.map((p: any) => ({ ...p, selected: true })));
        setView('review');
      })
      .catch(err => {
        if (err.message === "Failed to fetch") {
          setError("Could not connect to the IdeaGen backend. Make sure the backend is running on port 8000.");
        } else {
          setError(err.message);
        }
      })
      .finally(() => setIsProcessing(false));
  };

  const togglePaperSelection = (index: number) => {
    const updated = [...papers];
    updated[index].selected = !updated[index].selected;
    setPapers(updated);
  };

  const handleAnalyze = () => {
    const selectedPapers = papers.filter(p => p.selected);
    if (selectedPapers.length === 0) return;
    
    setView('progress');
    setProgressStep(0);
    setError(null);

    // Simulated progress steps
    const steps = setInterval(() => {
      setProgressStep(prev => {
        if (prev >= 4) {
          clearInterval(steps);
          return 4;
        }
        return prev + 1;
      });
    }, 1000);

    fetch('http://localhost:8000/api/search/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ papers: selectedPapers })
    })
      .then(res => {
        if (!res.ok) throw new Error('Analysis failed.');
        return res.json();
      })
      .then(data => {
        clearInterval(steps);
        setProgressStep(5); // Complete
        setDetailData(data);
        
        // Wrap the single scenario in an overview
        const opp: DemoOpportunityOverview = {
          opportunity_id: data.opportunity_id,
          title: data.title,
          problem_statement: data.problem_statement,
          status: data.final_status,
          confidence: 0.9,
          supporting_papers_count: data.discovery.cluster_size,
          evidence_count: data.grounding.evidence.length
        };
        setOpportunities([opp]);
      })
      .catch(err => {
        clearInterval(steps);
        if (err.message === "Failed to fetch") {
          setError("Could not connect to the IdeaGen backend. Make sure the backend is running on port 8000.");
        } else {
          setError(err.message);
        }
        setView('review');
      });
  };

  // Views
  const renderHeader = () => (
    <header className="header" style={{ display: 'flex', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Activity size={32} color="var(--accent-color)" />
        <div>
          <h1>IDEAGEN</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Evidence-Grounded Research Opportunity Discovery</p>
        </div>
      </div>
      {view !== 'home' && (
        <button className="back-button" onClick={() => {
          setView('home');
          setError(null);
          setUploadFiles([]);
        }}>
          <ArrowLeft size={16} /> Home
        </button>
      )}
    </header>
  );

  const renderHome = () => (
    <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      <h2 style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 500 }}>How would you like to start?</h2>
      <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center' }}>
        <div className="card" style={{ flex: 1, textAlign: 'left', cursor: 'pointer', transition: 'transform 0.2s', border: '2px solid transparent' }} onClick={() => setView('search')} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-color)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
          <Search size={32} color="var(--accent-color)" style={{ marginBottom: '1rem' }} />
          <h3>SEARCH PAPERS</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', height: '3rem' }}>Search scientific literature by topic.</p>
          <button style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}>
            Search Papers
          </button>
        </div>
        
        <div className="card" style={{ flex: 1, textAlign: 'left', cursor: 'pointer', transition: 'transform 0.2s', border: '2px solid transparent' }} onClick={() => setView('upload')} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-color)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
          <Upload size={32} color="var(--accent-color)" style={{ marginBottom: '1rem' }} />
          <h3>UPLOAD PAPERS</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', height: '3rem' }}>Upload your own research PDFs.</p>
          <button style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}>
            Upload PDFs
          </button>
        </div>
      </div>
      
      {error && (
        <div className="card" style={{ marginTop: '2rem', borderLeft: '4px solid #ef4444', textAlign: 'left' }}>
          <h3 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>Error</h3>
          <p>{error}</p>
        </div>
      )}
    </div>
  );

  const renderSearch = () => (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div className="card">
        <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Find Research Papers</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Search arXiv to dynamically assemble a research corpus.</p>
        
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem' }}>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. hallucination in retrieval augmented generation" 
            style={{ flex: 1, padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', fontSize: '1rem' }}
            disabled={isProcessing}
          />
          <button type="submit" disabled={isProcessing} style={{ padding: '0 1.5rem', background: 'var(--accent-color)', color: 'white', borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            {isProcessing ? <Loader2 size={20} className="spinner" /> : <Search size={20} />}
            Search Papers
          </button>
        </form>
      </div>

      {error && (
        <div className="card" style={{ marginTop: '2rem', borderLeft: '4px solid #ef4444' }}>
          <h3 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>{error}</h3>
          <button onClick={loadDemoCorpus} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
            Use Demo Corpus
          </button>
        </div>
      )}
    </div>
  );

  const renderUpload = () => (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div className="card">
        <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Upload Research Papers</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Upload up to 20 research-paper PDFs to discover research opportunities.</p>
        
        <div 
          style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius)', padding: '3rem', textAlign: 'center', background: 'var(--bg-secondary)' }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input type="file" multiple accept=".pdf" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
          <FileText size={48} color="var(--text-secondary)" style={{ margin: '0 auto 1rem auto' }} />
          <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>📄 Drop PDF files here</p>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>or</p>
          <button style={{ padding: '0.5rem 1.5rem', background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
            Browse Files
          </button>
        </div>

        {uploadFiles.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h4 style={{ marginBottom: '1rem' }}>Selected Files ({uploadFiles.length}/20)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {uploadFiles.map((f, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={16} color="#10b981" />
                    {f.name}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); removeUploadFile(i); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button 
              onClick={processUploads}
              disabled={isProcessing}
              style={{ marginTop: '1.5rem', width: '100%', padding: '1rem', background: 'var(--accent-color)', color: 'white', borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
            >
              {isProcessing ? <><Loader2 size={20} className="spinner" /> Processing...</> : 'Analyze Papers →'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="card" style={{ marginTop: '2rem', borderLeft: '4px solid #ef4444' }}>
          <p>{error}</p>
        </div>
      )}
    </div>
  );

  const renderReview = () => {
    const selectedCount = papers.filter(p => p.selected).length;
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Review Your Papers</h2>
            <p style={{ color: 'var(--text-secondary)' }}>{selectedCount} papers ready for analysis.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setView('search')} style={{ padding: '0.75rem 1.5rem', background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
              ← Back
            </button>
            <button 
              onClick={handleAnalyze} 
              disabled={selectedCount === 0}
              style={{ padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: 'var(--radius)', cursor: selectedCount > 0 ? 'pointer' : 'not-allowed', fontWeight: 600 }}
            >
              Analyze Papers →
            </button>
          </div>
        </div>

        {error && (
          <div className="card" style={{ borderLeft: '4px solid #ef4444', marginBottom: '1.5rem' }}>
            <p>{error}</p>
            <button onClick={loadDemoCorpus} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
              Use Demo Corpus
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {papers.map((paper, i) => (
            <div key={paper.id} className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', cursor: 'pointer', border: paper.selected ? '2px solid #10b981' : '2px solid transparent' }} onClick={() => togglePaperSelection(i)}>
              <div style={{ marginTop: '0.25rem' }}>
                <input type="checkbox" checked={paper.selected} onChange={() => togglePaperSelection(i)} onClick={e => e.stopPropagation()} style={{ transform: 'scale(1.2)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-color)', marginBottom: '0.5rem' }}>{paper.title}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  {paper.authors.length > 0 ? paper.authors.join(', ') + ' • ' : ''}{paper.publication_date}
                </div>
                {paper.abstract && (
                  <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--text-primary)' }}>
                    {paper.abstract.substring(0, 250)}...
                  </p>
                )}
                <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem' }}>
                  <span className="badge badge-OPEN">Source: {paper.source}</span>
                  {paper.doi && <span>DOI: {paper.doi}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderProgress = () => {
    const steps = [
      "Papers processed",
      "Research gaps identified",
      "Related gaps grouped",
      "Evidence collected",
      "Research opportunities generated"
    ];

    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', paddingTop: '2rem' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>Analyzing Your Research Papers</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
          {steps.map((step, i) => {
            const isCompleted = progressStep > i;
            const isCurrent = progressStep === i;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '1.1rem', color: isCompleted || isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)', opacity: isCompleted || isCurrent ? 1 : 0.5 }}>
                {isCompleted ? (
                  <CheckCircle size={24} color="#10b981" />
                ) : isCurrent ? (
                  <Loader2 size={24} className="spinner" color="var(--accent-color)" />
                ) : (
                  <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--text-secondary)' }} />
                )}
                <span style={{ fontWeight: isCurrent ? 600 : 400 }}>{step}</span>
              </div>
            );
          })}
        </div>

        {progressStep >= 5 && (
          <div style={{ marginTop: '3rem', animation: 'fadeIn 0.5s ease-in' }}>
            <h3 style={{ color: '#10b981', fontSize: '1.4rem', marginBottom: '0.5rem' }}>Analysis complete</h3>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>{opportunities.length} research opportunities found.</p>
            <button 
              onClick={() => setView('results')}
              style={{ padding: '1rem 2rem', background: 'var(--accent-color)', color: 'white', borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 600 }}
            >
              View Opportunities
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderResults = () => (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 className="section-header" style={{ marginBottom: 0 }}>Research Opportunities</h2>
      </div>

      {opportunities.map(opp => (
        <div key={opp.opportunity_id} className="card opportunity-overview-card" onClick={() => {
          if (!detailData) {
            // Need to load detail if using fallback
            setIsProcessing(true);
            fetch('http://localhost:8000/api/demo/scenario')
              .then(res => res.json())
              .then(data => { setDetailData(data); setView('detail'); })
              .catch(err => setError(err.message))
              .finally(() => setIsProcessing(false));
          } else {
            setView('detail');
          }
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Research Opportunity</span>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>{opp.problem_statement}</h3>
            </div>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Confidence</div>
            <div style={{ fontWeight: 600, color: '#10b981' }}>High</div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Why was this identified?</div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{opp.supporting_papers_count} papers contain related research limitations.</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><BookOpen size={14} /> Supporting Papers: {opp.supporting_papers_count}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>Status: <span className={`badge badge-${opp.status}`}>{opp.status.replace('_', ' ')}</span></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-color)', fontWeight: 500 }}>
              View Details <ChevronRight size={16} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderDetail = () => {
    if (!detailData) return null;
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <button onClick={() => setView('results')} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600 }}>
            <ArrowLeft size={16} /> Back to Results
          </button>
        </div>

        <div className="layout-grid">
          {/* Main Column */}
          <div>
            <div className="card">
              <h2 className="card-title">
                <BookOpen size={20} />
                Research Opportunity
                <span className={`badge badge-${detailData.final_status}`} style={{ marginLeft: 'auto' }}>
                  {detailData.final_status.replace('_', ' ')}
                </span>
              </h2>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>{detailData.title}</h3>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>1. Problem</h4>
                <p style={{ color: 'var(--text-secondary)' }}>{detailData.problem_statement}</p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>2. Why this opportunity matters</h4>
                <p style={{ color: 'var(--text-secondary)' }}>Derived from {detailData.discovery.cluster_size} supporting papers highlighting shared limitations.</p>
              </div>
            </div>

            <h3 className="section-header">3. Evidence</h3>
            <div className="card">
              {detailData.grounding.claims.map((claim, i) => (
                <div key={i} style={{ padding: '1rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius)', borderLeft: '3px solid #10b981', marginBottom: '1.5rem' }}>
                  <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{claim.text}</p>
                </div>
              ))}

              <h4 style={{ marginBottom: '1rem' }}>Extracted from:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {detailData.grounding.evidence.map((ev, i) => (
                  <div key={i} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Evidence from:<br/>
                      <strong>{ev.title}</strong> • {ev.source_id}
                    </div>
                    <div style={{ fontStyle: 'italic', color: 'var(--text-primary)' }}>
                      "{ev.text}"
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Column */}
          <div>
            <h3 className="section-header">6. Evolution</h3>
            <div className="card">
              <div className="timeline">
                {detailData.timeline.map((batch, i) => (
                  <div key={i} className="timeline-event">
                    <div className="timeline-batch-name">
                      <Clock size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }} />
                      {batch.name}
                    </div>
                    {batch.events.map((ev, j) => (
                      <div key={j} className="timeline-content">
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{ev.relationship}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0' }}>
                          {ev.paper_title} {ev.paper_date && `(${ev.paper_date})`}
                        </div>
                        <div className="transition-arrow">
                          {ev.status_change.split(' -> ')[0]} 
                          <ArrowRight size={14} /> 
                          <strong style={{ color: 'var(--text-primary)' }}>{ev.status_change.split(' -> ')[1]}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="leakage-warning">
              <ShieldAlert size={24} style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Temporal Integrity Enforced</strong>
                <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  Future paper <strong>{detailData.leakage_protection.future_paper}</strong> was present but safely excluded from historical batches.
                </p>
                <div style={{ fontSize: '0.8rem', background: '#fff', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #fecaca', display: 'inline-block' }}>
                  <Database size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                  Status: {detailData.leakage_protection.result}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      {renderHeader()}
      <div style={{ padding: '2rem 1rem' }}>
        {view === 'home' && renderHome()}
        {view === 'search' && renderSearch()}
        {view === 'upload' && renderUpload()}
        {view === 'review' && renderReview()}
        {view === 'progress' && renderProgress()}
        {view === 'results' && renderResults()}
        {view === 'detail' && renderDetail()}
      </div>
    </div>
  );
}

export default App;
