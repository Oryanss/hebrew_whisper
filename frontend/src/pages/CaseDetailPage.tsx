import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import type {
  Authority,
  Case,
  CitationAuditResult,
  Client,
  LegalDocument,
  Template,
} from "../types";

export default function CaseDetailPage() {
  const { caseId } = useParams();
  const id = Number(caseId);

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<LegalDocument | null>(null);
  const [audit, setAudit] = useState<CitationAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [savingDoc, setSavingDoc] = useState(false);

  function reload() {
    api
      .getCase(id)
      .then(async (c) => {
        setCaseData(c);
        const [clients, docs, tpls, auths] = await Promise.all([
          api.listClients(),
          api.listCaseDocuments(id),
          api.listTemplates(),
          api.listAuthorities(id),
        ]);
        setClient(clients.find((cl) => cl.id === c.client_id) ?? null);
        setDocuments(docs);
        setTemplates(tpls);
        setAuthorities(auths);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "שגיאה בטעינת התיק"));
  }

  useEffect(reload, [id]);

  async function handleDraft(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    setDrafting(true);
    setAudit(null);
    try {
      const templateId = form.get("template_id");
      const doc = await api.draftDocument(id, {
        template_id: templateId ? Number(templateId) : null,
        doc_type: form.get("doc_type"),
        title: form.get("title"),
        instructions: form.get("instructions"),
      });
      setDocuments((prev) => [doc, ...prev]);
      setSelectedDoc(doc);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "שגיאה ביצירת טיוטה");
    } finally {
      setDrafting(false);
    }
  }

  async function handleSaveDoc() {
    if (!selectedDoc) return;
    setSavingDoc(true);
    setError(null);
    try {
      const updated = await api.updateDocument(selectedDoc.id, {
        content: selectedDoc.content,
        status: selectedDoc.status,
      });
      setSelectedDoc(updated);
      setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "שגיאה בשמירת המסמך");
    } finally {
      setSavingDoc(false);
    }
  }

  async function handleAudit() {
    if (!selectedDoc) return;
    setError(null);
    try {
      const result = await api.auditCitations(selectedDoc.id);
      setAudit(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "שגיאה בבדיקת אסמכתאות");
    }
  }

  async function handleAddAuthority(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    try {
      const authority = await api.createAuthority({
        citation_text: form.get("citation_text"),
        source_type: form.get("source_type"),
        source_database: form.get("source_database"),
        summary: form.get("summary") || null,
        reference_url: form.get("reference_url") || null,
        case_id: id,
      });
      setAuthorities((prev) => [authority, ...prev]);
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "שגיאה בהוספת אסמכתא");
    }
  }

  if (!caseData) {
    return <p>{error ?? "טוען..."}</p>;
  }

  return (
    <div className="case-detail">
      <div className="page-header">
        <h1>
          {caseData.title} <span className="muted">({caseData.case_number})</span>
        </h1>
        <span className={`status-pill status-${caseData.status}`}>{caseData.status}</span>
      </div>
      {error && <div className="error-text">{error}</div>}

      <section className="card">
        <h2>פרטי התיק</h2>
        <p>
          <strong>לקוח:</strong> {client?.full_name ?? "-"}
        </p>
        <p>
          <strong>סוג תיק:</strong> {caseData.case_type ?? "-"} &nbsp;|&nbsp;
          <strong> תחום עיסוק:</strong> {caseData.practice_area ?? "-"} &nbsp;|&nbsp;
          <strong> ערכאה:</strong> {caseData.court ?? "-"}
        </p>
        {caseData.description && <p>{caseData.description}</p>}
      </section>

      <div className="two-col">
        <section className="card">
          <h2>עוזר ניסוח מסמכים</h2>
          <form onSubmit={handleDraft} className="form-card">
            <label>
              תבנית (אופציונלי)
              <select name="template_id" defaultValue="">
                <option value="">ללא תבנית</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              סוג מסמך
              <input name="doc_type" required placeholder="כתב תביעה / מכתב התראה..." />
            </label>
            <label>
              כותרת המסמך
              <input name="title" required />
            </label>
            <label>
              הנחיות לטיוטה
              <textarea name="instructions" rows={4} required />
            </label>
            <button type="submit" disabled={drafting}>
              {drafting ? "מייצר טיוטה..." : "צור טיוטה"}
            </button>
          </form>

          <h3>מסמכים בתיק</h3>
          <ul className="doc-list">
            {documents.map((d) => (
              <li key={d.id}>
                <button className="link-button" onClick={() => setSelectedDoc(d)}>
                  {d.title} - {d.doc_type} ({d.status})
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>בנק אסמכתאות מאומתות</h2>
          <p className="muted small">
            רק אסמכתאות שנוספו כאן ואומתו ידנית מול מקור מהימן ישמשו את עוזר הניסוח.
          </p>
          <form onSubmit={handleAddAuthority} className="form-card">
            <label>
              ציטוט/אסמכתא
              <input name="citation_text" required placeholder='ע"א 1234/20 ...' />
            </label>
            <div className="form-grid">
              <label>
                סוג
                <select name="source_type" defaultValue="case_law">
                  <option value="case_law">פסיקה</option>
                  <option value="statute">חקיקה</option>
                  <option value="regulation">תקנות</option>
                </select>
              </label>
              <label>
                מקור אימות
                <select name="source_database" defaultValue="נבו">
                  <option value="נבו">נבו</option>
                  <option value="תקדין">תקדין</option>
                  <option value="רשומות">רשומות</option>
                  <option value="לשכת עורכי הדין">לשכת עורכי הדין</option>
                  <option value="אתר בתי המשפט">אתר בתי המשפט</option>
                  <option value="אחר">אחר</option>
                </select>
              </label>
            </div>
            <label>
              תקציר
              <input name="summary" />
            </label>
            <label>
              קישור למקור
              <input name="reference_url" type="url" />
            </label>
            <button type="submit">הוספת אסמכתא</button>
          </form>
          <ul className="authority-list">
            {authorities.map((a) => (
              <li key={a.id}>
                <strong>{a.citation_text}</strong>
                <span className="muted small">
                  {" "}
                  - {a.source_database} {a.verified_by ? `· אומת ע"י ${a.verified_by}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {selectedDoc && (
        <section className="card">
          <div className="page-header">
            <h2>{selectedDoc.title}</h2>
            <div>
              <button onClick={handleAudit}>בדיקת אסמכתאות במסמך</button>{" "}
              <button onClick={handleSaveDoc} disabled={savingDoc}>
                {savingDoc ? "שומר..." : "שמירת עריכות"}
              </button>
            </div>
          </div>
          <textarea
            className="doc-editor"
            rows={20}
            value={selectedDoc.content}
            onChange={(e) => setSelectedDoc({ ...selectedDoc, content: e.target.value })}
          />
          {audit && (
            <div className="audit-result">
              <h3>
                תוצאות בדיקת אסמכתאות ({audit.unverified_count} לא מאומתות מתוך{" "}
                {audit.findings.length})
              </h3>
              <ul>
                {audit.findings.map((f, i) => (
                  <li key={i} className={f.verified ? "verified" : "unverified"}>
                    {f.citation_text} - {f.verified ? "מאומת" : "דורש בדיקה"}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
