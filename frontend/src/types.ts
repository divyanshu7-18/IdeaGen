export interface WorkspaceStats {
  total_papers: number;
  analyzed_papers: number;
  total_statements: number;
  total_gaps: number;
  candidate_gaps: number;
  validated_gaps: number;
  rejected_gaps: number;
  total_opportunities: number;
  validated_opportunities?: number;
  analysis_status: 'IDLE' | 'PROCESSING' | 'COMPLETED' | 'ERROR' | 'COMPLETE';
}

export interface SearchResultPaper {
  id: string;
  source: string;
  title: string;
  authors: string[];
  publication_year: number;
  publication_date: string;
  abstract: string;
  url?: string | null;
  doi?: string | null;
  raw_metadata?: Record<string, any>;
}

export interface SearchResponse {
  query: string;
  source: string;
  count: number;
  papers: SearchResultPaper[];
}

export interface PaperResponse {
  id: string;
  source_type: string;
  source_id: string;
  doi?: string | null;
  title?: string | null;
  publication_date?: string | null;
  batch_id: string;
  abstract: string;
  authors: string[];
  passages_count?: number;
  statements_count?: number;
  has_knowledge?: boolean;
  knowledge_status?: string;
  sections?: string[];
  created_at?: string;
}

export interface StatementResponse {
  id: string;
  knowledge_id: string;
  paper_id: string;
  passage_id?: string | null;
  statement_text: string;
  statement_type: string;
  page_start?: number | null;
  page_end?: number | null;
  section?: string | null;
  confidence?: number | null;
  paper_title?: string | null;
}

export interface EvidenceDetail {
  statement_id: string;
  statement_text: string;
  statement_type: string;
  confidence?: number | null;
  paper_id: string;
  paper_title?: string | null;
  passage_id?: string | null;
  passage_text?: string | null;
  passage_index?: number | null;
  page_start?: number | null;
  page_end?: number | null;
  section?: string | null;
}

export interface ResearchKnowledgeResponse {
  id: string;
  paper_id: string;
  research_problem?: string | null;
  research_questions: string[];
  methodology?: string | null;
  datasets: string[];
  findings: string[];
  limitations: string[];
  future_work: string[];
  extraction_status: string;
  extracted_at: string;
  statements: StatementResponse[];
}

export interface GapEvidenceItem {
  id: string;
  statement_id: string;
  paper_id: string;
  evidence_role: string;
  statement?: StatementResponse | null;
}

export interface GapResponse {
  id: string;
  gap_statement: string;
  research_problem: string;
  status: 'CANDIDATE' | 'VALIDATED' | 'REJECTED';
  evidence_count: number;
  limitations: string[];
  future_work: string[];
  validation_reasoning?: string | null;
  validation_confidence?: number | null;
  supporting_papers: string[];
  created_at?: string;
}

export interface NoveltyAssessment {
  assessment?: string;
  reasoning: string;
  differentiation?: string;
  confidence?: number;
  overlapping_statement_ids?: string[];
  overlapping_paper_ids?: string[];
  novelty_level?: string;
  novelty_statement?: string;
  prior_art_overlap?: string[];
  differentiating_factors?: string[];
}

export interface FeasibilityAssessment {
  feasibility_score: number;
  required_data?: string;
  required_compute?: string;
  implementation_complexity?: string;
  experimental_setup?: string;
  summary?: string;
  technical_barriers?: string[];
  required_resources?: string[];
  estimated_timeline?: string;
}

export interface OpportunityResponse {
  id: string;
  gap_id: string;
  research_problem: string;
  identified_gap: string;
  proposed_research_direction: string;
  reasoning?: string;
  technical_approach?: string;
  expected_contribution?: string;
  feasibility?: FeasibilityAssessment;
  novelty_assessment?: NoveltyAssessment;
  confidence: number;
  supporting_statement_ids?: string[];
  supporting_paper_ids?: string[];
  supporting_statement_count?: number;
  supporting_paper_count?: number;
  prior_art_statement_ids?: string[];
  status: string;
  created_at?: string;
}

export interface PaperProvenance {
  paper_id: string;
  title: string;
  doi?: string | null;
  publication_date?: string | null;
  authors: string[];
}

export interface OpportunityReport {
  opportunity_id: string;
  gap_id: string;
  research_problem: string;
  evidence_of_problem: EvidenceDetail[];
  existing_approaches: string[] | EvidenceDetail[];
  identified_gap: string;
  why_existing_work_is_insufficient: string;
  proposed_research_direction: string;
  reasoning: string;
  technical_approach: string;
  expected_contribution: string;
  feasibility: FeasibilityAssessment;
  prior_art_assessment?: NoveltyAssessment | Record<string, any>;
  differentiation: string | string[];
  supporting_papers: PaperResponse[] | PaperProvenance[];
  supporting_evidence: EvidenceDetail[];
  confidence: number;
  novelty_assessment?: NoveltyAssessment;
  status: string;
  created_at?: string;
  generation_model?: string;
  validation_model?: string;
  embedding_model?: string;
  refinement_iteration_count?: number;
  pipeline_version?: string;
  validation_status?: string;
  cautious_novelty_statement?: string;
  generated_at?: string;
}

export interface SystemEvaluationSummary {
  system_name: string;
  anonymized_label: string;
  opportunities_eval_count: number;
  mean_evidence_coverage: number;
  mean_citation_correctness: number;
  mean_prior_art_overlap: number;
}

export interface HumanEvaluationPackage {
  status: string;
  instruction_text: string;
  total_evaluators: number;
  ratings: any[];
  metadata: Record<string, any>;
}

export interface FullEvaluationReport {
  evaluation_title: string;
  dataset_version: string;
  domain: string;
  timestamp: string;
  leakage_check_passed: boolean;
  blinding_seed: number;
  system_summaries: SystemEvaluationSummary[];
  human_evaluation: HumanEvaluationPackage;
  statistical_analysis: Record<string, any>;
  limitations: string[];
}

