import { useEffect, useState, type FormEvent } from "react";
import { BookMarked, Search } from "lucide-react";
import { api, ApiError } from "../api";
import type { KnowledgeDocumentMeta, LegalResearchResult } from "../types";

const CATEGORY_LABEL: Record<string, string> = {
  case_law: "פסיקה לדוגמה",
  article: "מאמר",
  literature: "ספרות מקצועית",
  other: "אחר",
};

export default function ResearchPage() {
  const [documents, setDocuments] = useState<KnowledgeDocumentMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [researching, setResearching] = useState(false);
  const [result, setResult] = useState<LegalResearchResult | null>(null);

  function reload() {
    api
      .listKnowledgeDocuments()
      .then(setDocuments)
      .catch((err) => setError(err instanceof ApiError ? err.message : "שגיאה בטעינת ספריית הידע"));
  }

  useEffect(reload, []);

  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const fileInput = formEl.elements.namedItem("file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      await api.uploadKnowledgeDocument(
        String(form.get("title") || file.name),
        String(form.get("category") || "other"),
        file
      );
      formEl.reset();
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "שגיאה בהעלאת המסמך");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: number) {
    setError(null);
    try {
      await api.deleteKnowledgeDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "שגיאה במחיקת מסמך");
    }
  }

  async function handleResearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    setResearching(true);
    setResult(null);
    try {
      const useLibrary = form.get("use_library") === "on";
      const res = await api.runLegalResearch(String(form.get("query") || ""), useLibrary);
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "שגיאה בביצוע המחקר");
    } finally {
      setResearching(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>
          <Search size={20} /> מחקר משפטי וספריית ידע
        </h1>
      </div>
      {error && <div className="error-text">{error}</div>}

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
            <input name="use_library" type="checkbox" defaultChecked style={{ width: "auto" }} />
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

        {documents.length === 0 ? (
          <p className="muted small">אין עדיין מסמכים בספריית הידע.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>כותרת</th>
                <th>קטגוריה</th>
                <th>הועלה על ידי</th>
                <th></th>
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
        )}
      </section>
    </div>
  );
}
