import { useEffect, useState, type FormEvent } from "react";
import { BookMarked, Search } from "lucide-react";
import { api, ApiError } from "../api";
import { SkeletonTable } from "../components/Skeleton";
import ToastContainer from "../components/Toast";
import { useToast } from "../hooks/useToast";
import type { KnowledgeDocumentMeta, LegalResearchResult } from "../types";

const CATEGORY_LABEL: Record<string, string> = {
  case_law: "פסיקה לדוגמה",
  article: "מאמר",
  literature: "ספרות מקצועית",
  other: "אחר",
};

export default function ResearchPage() {
  const [documents, setDocuments] = useState<KnowledgeDocumentMeta[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [researching, setResearching] = useState(false);
  const [result, setResult] = useState<LegalResearchResult | null>(null);
  const { toasts, toast, dismiss } = useToast();

  function reload() {
    setDocsLoading(true);
    api
      .listKnowledgeDocuments()
      .then(setDocuments)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "שגיאה בטעינת ספריית הידע"))
      .finally(() => setDocsLoading(false));
  }

  useEffect(reload, []);

  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const fileInput = formEl.elements.namedItem("file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadKnowledgeDocument(
        String(form.get("title") || file.name),
        String(form.get("category") || "other"),
        file
      );
      formEl.reset();
      toast.success("המסמך הועלה בהצלחה לספריית הידע");
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "שגיאה בהעלאת המסמך");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteKnowledgeDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast.success("המסמך נמחק בהצלחה");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "שגיאה במחיקת מסמך");
    }
  }

  async function handleResearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setResearching(true);
    setResult(null);
    try {
      const useLibrary = form.get("use_library") === "on";
      const res = await api.runLegalResearch(String(form.get("query") || ""), useLibrary);
      setResult(res);
      toast.success("המחקר הושלם בהצלחה");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "שגיאה בביצוע המחקר");
    } finally {
      setResearching(false);
    }
  }

  return (
    <div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div className="page-header">
        <h1>
          <Search size={20} /> מחקר משפטי וספריית ידע
        </h1>
      </div>
      {loadError && <div className="error-text">{loadError}</div>}

      <section className="card">
        <h2>
          <Search size={16} /> מחקר משפטי
        </h2>
        <p className="muted small">
          המחקר מבוסס על חיפוש אינטרנט בפועל ועל מסמכים מספריית הידע שלמטה - לא על ידע
          קודם של המודל. כל אסמכתה טעונה אימות עצמאי במאגר מוסמך (נבו/תקדין/רשומות) לפני
          הסתמכות או ציטוט בכתב בי-דין.
        </p>
        <form onSubmit={handleResearch} className="form-card">
          <label>
            שאלת המחקר
            <textarea name="query" rows={3} required placeholder="נסחו שאלה משפטית..." />
          </label>
          <label style={{ flexDirection: "row", alignItems: "center", gap: "0.4rem" }}>
            <input name="use_library" type="checkbox" defaultChecked />
            שימוש בספריית הידע כרקע למחקר
          </label>
          <button type="submit" disabled={researching}>
            {researching ? "מבצע מחקר..." : "הפעלת מחקר"}
          </button>
        </form>

        {result && (
          <div className="audit-result">
            <h3>תוצאת המחקר</h3>
            <p style={{ whiteSpace: "pre-wrap" }}>{result.answer}</p>
            {result.web_sources.length > 0 && (
              <>
                <h4>מקורות רשת</h4>
                <ul>
                  {result.web_sources.map((s, i) => (
                    <li key={i}>
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noreferrer">
                          {s.title || s.url}
                        </a>
                      ) : (
                        s.title
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {result.knowledge_references.length > 0 && (
              <>
                <h4>מסמכים מספריית הידע ששימשו כרקע</h4>
                <ul>
                  {result.knowledge_references.map((d) => (
                    <li key={d.id}>{d.title}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </section>

      <section className="card">
        <h2>
          <BookMarked size={16} /> ספריית ידע
        </h2>
        <p className="muted small">
          העלאת מסמכי רקע (פסיקה לדוגמה, מאמרים, ספרות מקצועית) בפורמט Word / PDF / טקסט.
          מסמכים אלה משמשים רקע למחקר המשפטי בלבד ואינם מהווים אסמכתה מאומתת - לכך משמש
          בנק האסמכתאות בכל תיק.
        </p>
        <form onSubmit={handleUpload} className="form-card">
          <div className="form-grid">
            <label>
              כותרת
              <input name="title" placeholder="שם המסמך..." />
            </label>
            <label>
              קטגוריה
              <select name="category" defaultValue="article">
                <option value="case_law">פסיקה לדוגמה</option>
                <option value="article">מאמר</option>
                <option value="literature">ספרות מקצועית</option>
                <option value="other">אחר</option>
              </select>
            </label>
          </div>
          <label>
            קובץ (.docx / .pdf / .txt)
            <input name="file" type="file" accept=".docx,.pdf,.txt" required />
          </label>
          <button type="submit" disabled={uploading}>
            {uploading ? "מעלה..." : "העלאת מסמך"}
          </button>
        </form>

        {docsLoading ? (
          <SkeletonTable rows={3} cols={3} />
        ) : documents.length === 0 ? (
          <p className="muted small">אין עדיין מסמכים בספריית הידע.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">כותרת</th>
                  <th scope="col">קטגוריה</th>
                  <th scope="col">הועלה על ידי</th>
                  <th scope="col">
                    <span className="visually-hidden">פעולות</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id}>
                    <td>{d.title}</td>
                    <td>{CATEGORY_LABEL[d.category] ?? d.category}</td>
                    <td>{d.uploaded_by ?? "-"}</td>
                    <td>
                      <button className="link-button" onClick={() => handleDelete(d.id)}>
                        מחיקה
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
