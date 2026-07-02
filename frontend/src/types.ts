export type UserRole = "admin" | "lawyer" | "paralegal";

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
}

export type CaseStatus = "open" | "pending" | "closed";
export type DocumentStatus = "draft" | "in_review" | "final";
export type AuthoritySourceDb =
  | "נבו"
  | "תקדין"
  | "רשומות"
  | "לשכת עורכי הדין"
  | "אתר בתי המשפט"
  | "אחר";

export interface Client {
  id: number;
  full_name: string;
  id_number?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface Case {
  id: number;
  case_number: string;
  title: string;
  case_type?: string | null;
  practice_area?: string | null;
  court?: string | null;
  status: CaseStatus;
  description?: string | null;
  opened_date: string;
  client_id: number;
}

export interface Template {
  id: number;
  name: string;
  doc_type: string;
  description?: string | null;
  prompt_instructions: string;
  structure_outline?: string | null;
}

export interface LegalDocument {
  id: number;
  title: string;
  doc_type: string;
  content: string;
  status: DocumentStatus;
  generation_notes?: string | null;
  created_at: string;
  updated_at: string;
  case_id: number;
  template_id?: number | null;
}

export interface Authority {
  id: number;
  citation_text: string;
  source_type: string;
  source_database: AuthoritySourceDb;
  summary?: string | null;
  reference_url?: string | null;
  verified_by?: string | null;
  verified_at: string;
  notes?: string | null;
  case_id?: number | null;
}

export interface CitationFinding {
  citation_text: string;
  verified: boolean;
  matched_authority_id?: number | null;
}

export interface CitationAuditResult {
  findings: CitationFinding[];
  unverified_count: number;
}

export type DeadlineStatus = "pending" | "completed" | "missed";

export interface Deadline {
  id: number;
  title: string;
  due_date: string;
  description?: string | null;
  status: DeadlineStatus;
  created_at: string;
  case_id: number;
}

export interface DeadlineWithCase extends Deadline {
  case_title: string;
  case_number: string;
}

export interface TimeEntry {
  id: number;
  description: string;
  entry_date: string;
  hours: number;
  hourly_rate?: number | null;
  billable: boolean;
  created_at: string;
  case_id: number;
  invoice_id?: number | null;
}

export interface BillingSummary {
  total_hours: number;
  billable_hours: number;
  total_billable_amount: number;
  entries_missing_rate: number;
}

export type InvoiceStatus = "draft" | "sent" | "paid";

export interface Invoice {
  id: number;
  invoice_number: string;
  issue_date: string;
  total_amount: number;
  status: InvoiceStatus;
  notes?: string | null;
  created_at: string;
  case_id: number;
}

export interface InvoiceDetail extends Invoice {
  time_entries: TimeEntry[];
}

export interface CaseNote {
  id: number;
  content: string;
  created_by?: string | null;
  created_at: string;
  case_id: number;
}

export type KnowledgeCategory = "case_law" | "article" | "literature" | "other";

export interface KnowledgeDocumentMeta {
  id: number;
  title: string;
  category: string;
  source_filename?: string | null;
  uploaded_by?: string | null;
  created_at: string;
}

export interface KnowledgeDocumentDetail extends KnowledgeDocumentMeta {
  content: string;
}

export interface KnowledgeSearchResult {
  id: number;
  title: string;
  category: string;
  snippet: string;
}

export interface ResearchSource {
  title?: string | null;
  url?: string | null;
}

export interface LegalResearchResult {
  answer: string;
  web_sources: ResearchSource[];
  knowledge_references: KnowledgeDocumentMeta[];
}

export type RiskCategory =
  | "contract"
  | "regulatory"
  | "litigation"
  | "ip"
  | "data_privacy"
  | "employment"
  | "corporate"
  | "other";

export type RiskLevel = "green" | "yellow" | "orange" | "red";

export interface RiskAssessment {
  id: number;
  category: RiskCategory;
  description: string;
  severity: number;
  likelihood: number;
  risk_score: number;
  risk_level: RiskLevel;
  recommended_action: string;
  mitigating_factors?: string | null;
  assessed_by?: string | null;
  created_at: string;
  case_id: number;
}

export interface Task {
  id: number;
  title: string;
  notes?: string | null;
  done: boolean;
  due_date?: string | null;
  created_at: string;
  case_id: number;
}
