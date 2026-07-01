import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import type { Case, Client, DeadlineWithCase } from "../types";

const CASE_STATUS_LABEL: Record<string, string> = {
  open: "פתוח",
  pending: "ממתין",
  closed: "סגור",
};

export default function DashboardPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<DeadlineWithCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function reload() {
    setLoading(true);
    Promise.all([api.listCases(), api.listClients(), api.listUpcomingDeadlines(14)])
      .then(([c, cl, dl]) => {
        setCases(c);
        setClients(cl);
        setUpcomingDeadlines(dl);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "שגיאה בטעינת נתונים"))
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    try {
      await api.createCase({
        case_number: form.get("case_number"),
        title: form.get("title"),
        case_type: form.get("case_type") || null,
        practice_area: form.get("practice_area") || null,
        court: form.get("court") || null,
        description: form.get("description") || null,
        client_id: Number(form.get("client_id")),
      });
      setShowForm(false);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "שגיאה ביצירת תיק");
    }
  }

  const clientName = (id: number) => clients.find((c) => c.id === id)?.full_name ?? "-";

  return (
    <div>
      <div className="page-header">
        <h1>לוח תיקים</h1>
        <button onClick={() => setShowForm((v) => !v)}>{showForm ? "ביטול" : "תיק חדש"}</button>
      </div>

      {error && <div className="error-text">{error}</div>}

      {!loading && upcomingDeadlines.length > 0 && (
        <section className="card">
          <h2>מועדים קרובים (14 יום)</h2>
          <ul className="doc-list">
            {upcomingDeadlines.map((d) => (
              <li key={d.id}>
                <Link to={`/cases/${d.case_id}`}>
                  {d.title} - {d.case_title} ({d.case_number})
                </Link>{" "}
                <span className="muted small">
                  {new Date(d.due_date).toLocaleDateString("he-IL")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showForm && (
        <form className="card form-card" onSubmit={handleCreate}>
          <div className="form-grid">
            <label>
              מספר תיק
              <input name="case_number" required />
            </label>
            <label>
              כותרת התיק
              <input name="title" required />
            </label>
            <label>
              לקוח
              <select name="client_id" required defaultValue="">
                <option value="" disabled>
                  בחר לקוח
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              סוג תיק
              <input name="case_type" placeholder="אזרחי / פלילי / משפחה..." />
            </label>
            <label>
              תחום עיסוק
              <select name="practice_area" defaultValue="">
                <option value="">ללא</option>
                <option value="חוזים">חוזים</option>
                <option value="נזיקין">נזיקין</option>
                <option value="מקרקעין">מקרקעין</option>
                <option value="דיני עבודה">דיני עבודה</option>
                <option value="משפחה">משפחה</option>
                <option value="חברות">חברות</option>
                <option value="פרטיות">פרטיות</option>
                <option value="סדר דין אזרחי">סדר דין אזרחי</option>
              </select>
            </label>
            <label>
              ערכאה
              <input name="court" placeholder="שלום תל אביב..." />
            </label>
          </div>
          <label>
            תיאור/רקע עובדתי
            <textarea name="description" rows={3} />
          </label>
          <button type="submit">שמירת תיק</button>
        </form>
      )}

      {loading ? (
        <p>טוען...</p>
      ) : cases.length === 0 ? (
        <p>אין עדיין תיקים במערכת.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>מספר תיק</th>
              <th>כותרת</th>
              <th>לקוח</th>
              <th>סטטוס</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id}>
                <td>{c.case_number}</td>
                <td>{c.title}</td>
                <td>{clientName(c.client_id)}</td>
                <td>
                  <span className={`status-pill status-${c.status}`}>
                    {CASE_STATUS_LABEL[c.status]}
                  </span>
                </td>
                <td>
                  <Link to={`/cases/${c.id}`}>פתיחת תיק</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
