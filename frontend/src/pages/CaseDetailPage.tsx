import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import type {
  Authority,
  BillingSummary,
  Case,
  CaseNote,
  CitationAuditResult,
  Client,
  Deadline,
  Invoice,
  LegalDocument,
  Template,
  TimeEntry,
} from "../types";

const DEADLINE_STATUS_LABEL: Record<string, string> = {
  pending: "פתוח",
  completed: "בוצע",
  missed: "הוחמץ",
};

const INVOICE_STATUS_LABEL: Record<string, string> = {
  draft: "טיוטה",
  sent: "נשלחה",
  paid: "שולמה",
};

export default function CaseDetailPage() {
  const { caseId } = useParams();
  const id = Number(caseId);

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [caseNotes, setCaseNotes] = useState<CaseNote[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<LegalDocument | null>(null);
  const [audit, setAudit] = useState<CitationAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [savingDoc, setSavingDoc] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  function reload() {
    api
      .getCase(id)
      .then(async (c) => {
        setCaseData(c);
        const [clients, docs, tpls, auths, dls, entries, summary, caseNoteList, invoiceList] =
          await Promise.all([
            api.listClients(),
            api.listCaseDocuments(id),
            api.listTemplates(),
            api.listAuthorities(id),
            api.listCaseDeadlines(id),
            api.listTimeEntries(id),
            api.getBillingSummary(id),
            api.listCaseNotes(id),
            api.listCaseInvoices(id),
          ]);
        setClient(clients.find((cl) => cl.id === c.client_id) ?? null);
        setDocuments(docs);
        setTemplates(tpls);
        setAuthorities(auths);
        setDeadlines(dls);
        setTimeEntries(entries);
        setBillingSummary(summary);
        setCaseNotes(caseNoteList);
        setInvoices(invoiceList);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "שגיאה בטעינת התיק"));
  }

  async function reloadBillingSummary() {
    try {
      setBillingSummary(await api.getBillingSummary(id));
    } catch {
      /* summary refresh failure is non-critical; entries list already updated */
    }
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
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
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
      formEl.reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "שגיאה בהוספת אסמכתא");
    }
  }

  async function handleAddDeadline(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setError(null);
    try {
      const deadline = await api.createDeadline(id, {
        title: form.get("title"),
        due_date: new Date(form.get("due_date") as string).toISOString(),
        description: form.get("description") || null,
      });
      setDeadlines((prev) =>
        [...prev, deadline].sort((a, b) => a.due_date.localeCompare(b.due_date))
      );
      formEl.reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "שגיאה בהוספת מועד");
    }
  }

  async function handleDeadlineStatusChange(deadlineId: number, status: string) {
    setError(null);
    try {
      const updated = await api.updateDeadline(deadlineId, { status });
      setDeadlines((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "שגיאה בעדכון מועד");
    }
  }

  async function handleAddTimeEntry(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setError(null);
    try {
      const rate = form.get("hourly_rate");
      const entry = await api.createTimeEntry(id, {
        description: form.get("description"),
        entry_date: new Date(form.get("entry_date") as string).toISOString(),
        hours: Number(form.get("hours")),
        hourly_rate: rate ? Number(rate) : null,
        billable: form.get("billable") === "on",
      });
      setTimeEntries((prev) => [entry, ...prev]);
      formEl.reset();
      await reloadBillingSummary();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "שגיאה בהוספת רישום שעות");
    }
  }

  async function handleDeleteTimeEntry(entryId: number) {
    setError(null);
    try {
      await api.deleteTimeEntry(entryId);
      setTimeEntries((prev) => prev.filter((e) => e.id !== entryId));
      await reloadBillingSummary();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "שגיאה במחיקת רישום שעות");
    }
  }

  async function handleGenerateInvoice() {
    setError(null);
    setGeneratingInvoice(true);
    try {
      const invoice = await api.createInvoice(id);
      setInvoices((prev) => [invoice, ...prev]);
      const entries = await api.listTimeEntries(id);
      setTimeEntries(entries);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "שגיאה בהפקת חשבונית");
    } finally {
      setGeneratingInvoice(false);
    }
  }

  async function handleInvoiceStatusChange(invoiceId: number, status: string) {
    setError(null);
    try {
      const updated = await api.updateInvoice(invoiceId, { status });
      setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "שגיאה בעדכון חשבונית");
    }
  }

  async function handleDeleteInvoice(invoiceId: number) {
    setError(null);
    try {
      await api.deleteInvoice(invoiceId);
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
      const entries = await api.listTimeEntries(id);
      setTimeEntries(entries);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "שגיאה במחיקת חשבונית");
    }
  }

  async function handleAddCaseNote(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setError(null);
    try {
      const note = await api.createCaseNote(id, { content: form.get("content") });
      setCaseNotes((prev) => [note, ...prev]);
      formEl.reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "שגיאה בהוספת רשומה");
    }
  }

  async function handleDeleteCaseNote(noteId: number) {
    setError(null);
    try {
      await api.deleteCaseNote(noteId);
      setCaseNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "שגיאה במחיקת רשומה");
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

      <section className="card">
        <h2>יומן תיק</h2>
        <p className="muted small">
          רשומות חופשיות לפי סדר כרונולוגי - התפתחויות, שיחות, החלטות אסטרטגיות.
        </p>
        <form onSubmit={handleAddCaseNote} className="form-card">
          <label>
            רשומה חדשה
            <textarea name="content" rows={2} required placeholder="מה קרה בתיק היום..." />
          </label>
          <button type="submit">הוספת רשומה</button>
        </form>
        {caseNotes.length === 0 ? (
          <p className="muted small">אין עדיין רשומות בתיק זה.</p>
        ) : (
          <ul className="doc-list">
            {caseNotes.map((note) => (
              <li key={note.id}>
                <div>{note.content}</div>
                <span className="muted small">
                  {new Date(note.created_at).toLocaleString("he-IL")}
                  {note.created_by ? ` · ${note.created_by}` : ""}
                </span>{" "}
                <button className="link-button" onClick={() => handleDeleteCaseNote(note.id)}>
                  מחיקה
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>מועדים ודדליינים</h2>
        <p className="muted small">
          המערכת אינה מחשבת אוטומטית מועדים סטטוטוריים - יש להזין תאריך יעד לאחר בדיקה מול
          התקנות/הדין הרלוונטי.
        </p>
        <form onSubmit={handleAddDeadline} className="form-card">
          <div className="form-grid">
            <label>
              כותרת המועד
              <input name="title" required placeholder="הגשת כתב הגנה..." />
            </label>
            <label>
              תאריך יעד
              <input name="due_date" type="date" required />
            </label>
          </div>
          <label>
            הערות
            <input name="description" />
          </label>
          <button type="submit">הוספת מועד</button>
        </form>
        {deadlines.length === 0 ? (
          <p className="muted small">אין מועדים רשומים בתיק זה.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>כותרת</th>
                <th>תאריך יעד</th>
                <th>סטטוס</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {deadlines.map((d) => (
                <tr key={d.id}>
                  <td>{d.title}</td>
                  <td>{new Date(d.due_date).toLocaleDateString("he-IL")}</td>
                  <td>
                    <span className={`status-pill deadline-${d.status}`}>
                      {DEADLINE_STATUS_LABEL[d.status]}
                    </span>
                  </td>
                  <td>
                    {d.status === "pending" && (
                      <>
                        <button
                          className="link-button"
                          onClick={() => handleDeadlineStatusChange(d.id, "completed")}
                        >
                          סמן כבוצע
                        </button>{" "}
                        <button
                          className="link-button"
                          onClick={() => handleDeadlineStatusChange(d.id, "missed")}
                        >
                          סמן כהוחמץ
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>חיוב שעות</h2>
        {billingSummary && (
          <p className="muted small">
            סה"כ {billingSummary.total_hours} שעות, מתוכן {billingSummary.billable_hours} שעות
            לחיוב. סכום לחיוב: {billingSummary.total_billable_amount.toLocaleString()} ₪
            {billingSummary.entries_missing_rate > 0 && (
              <>
                {" "}
                (<strong>{billingSummary.entries_missing_rate}</strong> רישומים לחיוב חסרי
                תעריף שעתי - אינם נכללים בסכום)
              </>
            )}
          </p>
        )}
        <form onSubmit={handleAddTimeEntry} className="form-card">
          <div className="form-grid">
            <label>
              תיאור הפעולה
              <input name="description" required placeholder="ניסוח כתב תביעה..." />
            </label>
            <label>
              תאריך
              <input name="entry_date" type="date" required />
            </label>
            <label>
              שעות
              <input name="hours" type="number" step="0.25" min="0" required />
            </label>
            <label>
              תעריף שעתי (₪, אופציונלי)
              <input name="hourly_rate" type="number" step="1" min="0" />
            </label>
          </div>
          <label style={{ flexDirection: "row", alignItems: "center", gap: "0.4rem" }}>
            <input name="billable" type="checkbox" defaultChecked style={{ width: "auto" }} />
            ניתן לחיוב
          </label>
          <button type="submit">הוספת רישום שעות</button>
        </form>
        {timeEntries.length === 0 ? (
          <p className="muted small">אין רישומי שעות בתיק זה.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>תיאור</th>
                <th>תאריך</th>
                <th>שעות</th>
                <th>תעריף</th>
                <th>לחיוב</th>
                <th>חשבונית</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {timeEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.description}</td>
                  <td>{new Date(entry.entry_date).toLocaleDateString("he-IL")}</td>
                  <td>{entry.hours}</td>
                  <td>{entry.hourly_rate != null ? `${entry.hourly_rate} ₪/ש'` : "-"}</td>
                  <td>{entry.billable ? "כן" : "לא"}</td>
                  <td>
                    {entry.invoice_id
                      ? invoices.find((inv) => inv.id === entry.invoice_id)?.invoice_number ??
                        "כלול בחשבונית"
                      : "-"}
                  </td>
                  <td>
                    <button
                      className="link-button"
                      onClick={() => handleDeleteTimeEntry(entry.id)}
                    >
                      מחיקה
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>חשבוניות</h2>
        <p className="muted small">
          הפקת חשבונית אוספת את כל רישומי השעות הניתנים לחיוב עם תעריף שעתי שטרם נכללו
          בחשבונית קודמת בתיק זה.
        </p>
        <button onClick={handleGenerateInvoice} disabled={generatingInvoice}>
          {generatingInvoice ? "מפיק חשבונית..." : "הפקת חשבונית מרישומי שעות שטרם חויבו"}
        </button>
        {invoices.length === 0 ? (
          <p className="muted small">אין עדיין חשבוניות בתיק זה.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>מספר חשבונית</th>
                <th>תאריך הפקה</th>
                <th>סכום</th>
                <th>סטטוס</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.invoice_number}</td>
                  <td>{new Date(invoice.issue_date).toLocaleDateString("he-IL")}</td>
                  <td>{invoice.total_amount.toLocaleString()} ₪</td>
                  <td>
                    <span className={`status-pill invoice-${invoice.status}`}>
                      {INVOICE_STATUS_LABEL[invoice.status]}
                    </span>
                  </td>
                  <td>
                    {invoice.status === "draft" && (
                      <button
                        className="link-button"
                        onClick={() => handleInvoiceStatusChange(invoice.id, "sent")}
                      >
                        סמן כנשלחה
                      </button>
                    )}{" "}
                    {invoice.status === "sent" && (
                      <button
                        className="link-button"
                        onClick={() => handleInvoiceStatusChange(invoice.id, "paid")}
                      >
                        סמן כשולמה
                      </button>
                    )}{" "}
                    <button className="link-button" onClick={() => handleDeleteInvoice(invoice.id)}>
                      מחיקה
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
