import type {
  WorkspaceStats,
  PaperResponse,
  ResearchKnowledgeResponse,
  StatementResponse,
  GapResponse,
  OpportunityResponse,
  OpportunityReport,
  EvidenceDetail,
  FullEvaluationReport,
  SearchResultPaper,
  SearchResponse,
} from '../types';

const API_BASE = '/api/v1';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson.detail) {
        errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // no json body
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  async searchPapers(query: string, limit = 10): Promise<SearchResponse> {
    const res = await fetch(`/api/search/papers?q=${encodeURIComponent(query)}&limit=${limit}`);
    return handleResponse<SearchResponse>(res);
  },

  async ingestSearchPaper(paper: SearchResultPaper): Promise<PaperResponse> {
    const res = await fetch('/api/papers/ingest_search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paper),
    });
    return handleResponse<PaperResponse>(res);
  },

  async understandPaper(paperId: string): Promise<ResearchKnowledgeResponse> {
    const res = await fetch(`/api/papers/${paperId}/understand`, { method: 'POST' });
    return handleResponse<ResearchKnowledgeResponse>(res);
  },

  async getStats(): Promise<WorkspaceStats> {
    const res = await fetch(`${API_BASE}/stats`);
    return handleResponse<WorkspaceStats>(res);
  },

  async getPapers(): Promise<PaperResponse[]> {
    const res = await fetch(`${API_BASE}/papers`);
    return handleResponse<PaperResponse[]>(res);
  },

  async getPaperDetail(paperId: string): Promise<PaperResponse> {
    const res = await fetch(`${API_BASE}/papers/${paperId}`);
    return handleResponse<PaperResponse>(res);
  },


  async getPaperKnowledge(paperId: string): Promise<ResearchKnowledgeResponse> {
    const res = await fetch(`/api/papers/${paperId}/knowledge`);
    return handleResponse<ResearchKnowledgeResponse>(res);
  },

  async getStatements(paperId?: string, type?: string): Promise<StatementResponse[]> {
    const params = new URLSearchParams();
    if (paperId) params.append('paper_id', paperId);
    if (type) params.append('type', type);
    const res = await fetch(`${API_BASE}/statements?${params.toString()}`);
    return handleResponse<StatementResponse[]>(res);
  },

  async getEvidenceDetail(statementId: string): Promise<EvidenceDetail> {
    const res = await fetch(`${API_BASE}/evidence/${statementId}`);
    return handleResponse<EvidenceDetail>(res);
  },

  async getGaps(status?: string): Promise<GapResponse[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    const res = await fetch(`${API_BASE}/gaps?${params.toString()}`);
    return handleResponse<GapResponse[]>(res);
  },

  async getGapDetail(gapId: string): Promise<GapResponse> {
    const res = await fetch(`${API_BASE}/gaps/${gapId}`);
    return handleResponse<GapResponse>(res);
  },

  async discoverGaps(): Promise<{ status: string; gaps_discovered: number }> {
    const res = await fetch('/api/gaps/discover', { method: 'POST' });
    return handleResponse(res);
  },

  async getOpportunities(): Promise<OpportunityResponse[]> {
    const res = await fetch(`${API_BASE}/opportunities`);
    return handleResponse<OpportunityResponse[]>(res);
  },

  async getOpportunityDetail(opportunityId: string): Promise<OpportunityResponse> {
    const res = await fetch(`${API_BASE}/opportunities/${opportunityId}`);
    return handleResponse<OpportunityResponse>(res);
  },

  async getOpportunityReport(opportunityId: string): Promise<OpportunityReport> {
    const res = await fetch(`${API_BASE}/opportunities/${opportunityId}/report`);
    return handleResponse<OpportunityReport>(res);
  },

  async generateOpportunity(gapId: string): Promise<OpportunityResponse> {
    const res = await fetch(`${API_BASE}/gaps/${gapId}/opportunity`, { method: 'POST' });
    return handleResponse<OpportunityResponse>(res);
  },

  async getEvaluationResults(): Promise<FullEvaluationReport> {
    const res = await fetch(`${API_BASE}/evaluation/results`);
    return handleResponse<FullEvaluationReport>(res);
  },
};
