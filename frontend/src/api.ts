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
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { ...options.headers };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (options.form) {
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
  if (res.status === 204) return undefined as T;
  return res.json();
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
  Invoice,
  InvoiceDetail,
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

  listCaseNotes: (caseId: number) => request<CaseNote[]>(`/api/cases/${caseId}/notes`),
  createCaseNote: (caseId: number, data: object) =>
    request<CaseNote>(`/api/cases/${caseId}/notes`, { method: "POST", body: data }),
  deleteCaseNote: (id: number) => request<void>(`/api/notes/${id}`, { method: "DELETE" }),

  listCaseInvoices: (caseId: number) => request<Invoice[]>(`/api/cases/${caseId}/invoices`),
  createInvoice: (caseId: number, data: object = {}) =>
    request<Invoice>(`/api/cases/${caseId}/invoices`, { method: "POST", body: data }),
  getInvoice: (id: number) => request<InvoiceDetail>(`/api/invoices/${id}`),
  updateInvoice: (id: number, data: object) =>
    request<Invoice>(`/api/invoices/${id}`, { method: "PATCH", body: data }),
  deleteInvoice: (id: number) => request<void>(`/api/invoices/${id}`, { method: "DELETE" }),
};

export { request };
