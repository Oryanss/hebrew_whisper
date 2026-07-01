const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const TOKEN_KEY = "legal_platform_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  form?: Record<string, string>;
  formData?: FormData;
}

async function rawRequest(path: string, options: RequestOptions = {}): Promise<Response> {
  const headers: Record<string, string> = { ...options.headers };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData; // browser sets multipart Content-Type + boundary
  } else if (options.form) {
    body = new URLSearchParams(options.form);
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const res = await fetch(`${API_BASE}${path}`, { method: options.method, headers, body });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    } catch {
      /* ignore parse failure */
    }
    throw new ApiError(res.status, detail);
  }
  return res;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await rawRequest(path, options);
  if (res.status === 204) return undefined as T;
  return res.json();
}

function filenameFromContentDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) return decodeURIComponent(utf8Match[1]);
  const plainMatch = header.match(/filename="?([^";]+)"?/i);
  return plainMatch ? plainMatch[1] : fallback;
}

async function downloadFile(path: string, fallbackFilename: string): Promise<void> {
  const res = await rawRequest(path);
  const blob = await res.blob();
  const filename = filenameFromContentDisposition(
    res.headers.get("Content-Disposition"),
    fallbackFilename
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

import type {
  Case,
  Client,
  Template,
  LegalDocument,
  Authority,
  CitationAuditResult,
  User,
  Deadline,
  DeadlineWithCase,
  TimeEntry,
  BillingSummary,
  CaseNote,
  KnowledgeDocumentMeta,
  KnowledgeDocumentDetail,
  KnowledgeSearchResult,
  LegalResearchResult,
  RiskAssessment,
} from "./types";

export const api = {
  login: (email: string, password: string) =>
    request<{ access_token: string }>("/api/auth/login", {
      method: "POST",
      form: { username: email, password },
    }),
  register: (full_name: string, email: string, password: string) =>
    request<User>("/api/auth/register", { method: "POST", body: { full_name, email, password } }),
  me: () => request<User>("/api/auth/me"),

  listClients: () => request<Client[]>("/api/clients"),
  createClient: (data: object) => request<Client>("/api/clients", { method: "POST", body: data }),

  listCases: () => request<Case[]>("/api/cases"),
  createCase: (data: object) => request<Case>("/api/cases", { method: "POST", body: data }),
  getCase: (id: number) => request<Case>(`/api/cases/${id}`),
  listCaseDocuments: (id: number) => request<LegalDocument[]>(`/api/cases/${id}/documents`),

  listTemplates: () => request<Template[]>("/api/templates"),

  draftDocument: (caseId: number, data: object) =>
    request<LegalDocument>(`/api/cases/${caseId}/draft`, { method: "POST", body: data }),
  updateDocument: (id: number, data: object) =>
    request<LegalDocument>(`/api/documents/${id}`, { method: "PATCH", body: data }),
  auditCitations: (documentId: number) =>
    request<CitationAuditResult>(`/api/documents/${documentId}/audit-citations`, {
      method: "POST",
    }),

  listAuthorities: (caseId?: number) =>
    request<Authority[]>(`/api/authorities${caseId ? `?case_id=${caseId}` : ""}`),
  createAuthority: (data: object) =>
    request<Authority>("/api/authorities", { method: "POST", body: data }),

  listCaseDeadlines: (caseId: number) =>
    request<Deadline[]>(`/api/cases/${caseId}/deadlines`),
  createDeadline: (caseId: number, data: object) =>
    request<Deadline>(`/api/cases/${caseId}/deadlines`, { method: "POST", body: data }),
  updateDeadline: (id: number, data: object) =>
    request<Deadline>(`/api/deadlines/${id}`, { method: "PATCH", body: data }),
  listUpcomingDeadlines: (days = 14) =>
    request<DeadlineWithCase[]>(`/api/deadlines/upcoming?days=${days}`),

  listTimeEntries: (caseId: number) =>
    request<TimeEntry[]>(`/api/cases/${caseId}/time-entries`),
  createTimeEntry: (caseId: number, data: object) =>
    request<TimeEntry>(`/api/cases/${caseId}/time-entries`, { method: "POST", body: data }),
  updateTimeEntry: (id: number, data: object) =>
    request<TimeEntry>(`/api/time-entries/${id}`, { method: "PATCH", body: data }),
  deleteTimeEntry: (id: number) =>
    request<void>(`/api/time-entries/${id}`, { method: "DELETE" }),
  getBillingSummary: (caseId: number) =>
    request<BillingSummary>(`/api/cases/${caseId}/billing-summary`),
  downloadInvoice: (caseId: number, caseTitle: string) =>
    downloadFile(`/api/cases/${caseId}/invoice.docx`, `invoice-${caseTitle}.docx`),

  listCaseNotes: (caseId: number) => request<CaseNote[]>(`/api/cases/${caseId}/notes`),
  createCaseNote: (caseId: number, data: object) =>
    request<CaseNote>(`/api/cases/${caseId}/notes`, { method: "POST", body: data }),
  deleteCaseNote: (id: number) => request<void>(`/api/notes/${id}`, { method: "DELETE" }),

  uploadDocument: (caseId: number, title: string, docType: string, file: File) => {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("doc_type", docType);
    formData.append("file", file);
    return request<LegalDocument>(`/api/cases/${caseId}/documents/upload`, {
      method: "POST",
      formData,
    });
  },
  downloadDocumentDocx: (documentId: number, title: string) =>
    downloadFile(`/api/documents/${documentId}/export.docx`, `${title}.docx`),

  listKnowledgeDocuments: (category?: string) =>
    request<KnowledgeDocumentMeta[]>(`/api/knowledge${category ? `?category=${category}` : ""}`),
  searchKnowledgeDocuments: (q: string) =>
    request<KnowledgeSearchResult[]>(`/api/knowledge/search?q=${encodeURIComponent(q)}`),
  getKnowledgeDocument: (id: number) =>
    request<KnowledgeDocumentDetail>(`/api/knowledge/${id}`),
  uploadKnowledgeDocument: (title: string, category: string, file: File) => {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("category", category);
    formData.append("file", file);
    return request<KnowledgeDocumentMeta>("/api/knowledge/upload", { method: "POST", formData });
  },
  deleteKnowledgeDocument: (id: number) =>
    request<void>(`/api/knowledge/${id}`, { method: "DELETE" }),

  runLegalResearch: (query: string, useKnowledgeLibrary = true) =>
    request<LegalResearchResult>("/api/legal-research", {
      method: "POST",
      body: { query, use_knowledge_library: useKnowledgeLibrary },
    }),

  listRiskAssessments: (caseId: number) =>
    request<RiskAssessment[]>(`/api/cases/${caseId}/risk-assessments`),
  createRiskAssessment: (caseId: number, data: object) =>
    request<RiskAssessment>(`/api/cases/${caseId}/risk-assessments`, {
      method: "POST",
      body: data,
    }),
  deleteRiskAssessment: (id: number) =>
    request<void>(`/api/risk-assessments/${id}`, { method: "DELETE" }),
};

export { request };
