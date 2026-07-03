import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FolderKanban,
  FolderOpen,
  Hourglass,
  Search,
  Users2,
} from "lucide-react";
import { api, ApiError } from "../api";
import EmptyState from "../components/EmptyState";
import StatCard from "../components/StatCard";
import type { Case, CaseStatus, Client, DeadlineWithCase, MeetingWithCase } from "../types";

const MEETING_TYPE_LABEL: Record<string, string> = {
  client_meeting: "פגישת לקוח",
  court_hearing: "דיון בבית משפט",
  deposition: "חקירה/גביית עדות",
  internal: "פגישה פנימית",
  other: "אחר",
};

const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  open: "פתוח",
  pending: "ממתין",
  closed: "סגור",
};

const STATUS_FILTERS: { value: CaseStatus | "all"; label: string }[] = [
  { value: "all", label: "הכל" },
  { value: "open", label: "פתוחים" },
  { value: "pending", label: "ממתינים" },
  { value: "closed", label: "סגורים" },
];

type SortKey = "case_number" | "title" | "client" | "status";
type SortDir = "asc" | "desc";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function urgencyOf(dueDate: string): { key: "overdue" | "urgent" | "soon" | "later"; label: string } {
  const diffDays = Math.ceil((new Date(dueDate).getTime() - Date.now()) / MS_PER_DAY);
  if (diffDays < 0) return { key: "overdue", label: "באיחור" };
  if (diffDays <= 1) return { key: "urgent", label: "דחוף" };
  if (diffDays <= 4) return { key: "soon", label: "בקרוב" };
  return { key: "later", label: "בהמשך" };
}

export default function DashboardPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<DeadlineWithCase[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<MeetingWithCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<CaseStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("case_number");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function reload() {
    setLoading(true);
    Promise.all([
      api.listCases(),
      api.listClients(),
      api.listUpcomingDeadlines(14),
      api.listUpcomingMeetings(14),
    ])
      .then(([c, cl, dl, ml]) => {
        setCases(c);
        setClients(cl);
        setUpcomingDeadlines(dl);
        setUpcomingMeetings(ml);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "שגיאה בטעינת נתונים"))
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setFormError(null);
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
      formEl.reset();
      setShowForm(false);
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "שגיאה ביצירת תיק");
    }
  }

  const clientName = (id: number) => clients.find((c) => c.id === id)?.full_name ?? "-";
  const openCount = cases.filter((c) => c.status === "open").length;
  const pendingCount = cases.filter((c) => c.status === "pending").length;
  const closedCount = cases.filter((c) => c.status === "closed").length;

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const visibleCases = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = cases.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!term) return true;
      const haystack = `${c.case_number} ${c.title} ${clientName(c.client_id)}`.toLowerCase();
      return haystack.includes(term);
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let av: string;
      let bv: string;
      switch (sortKey) {
        case "title":
          av = a.title;
          bv = b.title;
          break;
        case "client":
          av = clientName(a.client_id);
          bv = clientName(b.client_id);
          break;
        case "status":
          av = a.status;
          bv = b.status;
          break;
        default:
          av = a.case_number;
          bv = b.case_number;
      }
      return av.localeCompare(bv, "he") * dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cases, statusFilter, search, sortKey, sortDir, clients]);

  const groupedDeadlines = useMemo(() => {
    const sorted = [...upcomingDeadlines].sort(
      (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );
    const groups: Record<string, DeadlineWithCase[]> = {
      overdue: [],
      urgent: [],
      soon: [],
      later: [],
    };
    for (const d of sorted) {
      groups[urgencyOf(d.due_date).key].push(d);
    }
    return groups;
  }, [upcomingDeadlines]);

  const groupedMeetings = useMemo(() => {
    const sorted = [...upcomingMeetings].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    const groups: Record<string, MeetingWithCase[]> = {
      overdue: [],
      urgent: [],
      soon: [],
      later: [],
    };
    for (const m of sorted) {
      groups[urgencyOf(m.start_time).key].push(m);
    }
    return groups;
  }, [upcomingMeetings]);

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return <ArrowUpDown size={13} className="muted" />;
    return sortDir === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />;
  }

  function ariaSort(key: SortKey): "ascending" | "descending" | undefined {
    if (sortKey !== key) return undefined;
    return sortDir === "asc" ? "ascending" : "descending";
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>
            <FolderKanban size={20} /> לוח תיקים
          </h1>
          <p className="page-subtitle">
            סקירה כללית של {cases.length} תיקים ו-{clients.length} לקוחות במערכת
          </p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}>{showForm ? "ביטול" : "תיק חדש"}</button>
      </div>

      {error && <div className="error-text">{error}</div>}

      {!loading && (
        <div className="stat-grid">
          <StatCard icon={FolderOpen} value={openCount} label="תיקים פתוחים" tone="indigo" />
          <StatCard icon={Hourglass} value={pendingCount} label="תיקים בהמתנה" tone="amber" />
          <StatCard icon={CheckCircle2} value={closedCount} label="תיקים סגורים" tone="slate" />
          <StatCard
            icon={Clock3}
            value={upcomingDeadlines.length}
            label="מועדים ב-14 הימים הקרובים"
            tone="rose"
          />
          <StatCard
            icon={CalendarClock}
            value={upcomingMeetings.length}
            label="פגישות ב-14 הימים הקרובים"
            tone="indigo"
          />
          <StatCard icon={Users2} value={clients.length} label="לקוחות במערכת" tone="emerald" />
        </div>
      )}

      {showForm && (
        <form className="card form-card" onSubmit={handleCreate}>
          {formError && <div className="error-text">{formError}</div>}
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

      <div className="dashboard-layout">
        <section>
          {!loading && cases.length > 0 && (
            <div className="table-toolbar">
              <div className="search-box">
                <Search size={15} />
                <input
                  type="search"
                  aria-label="חיפוש לפי מספר תיק, כותרת או לקוח"
                  placeholder="חיפוש לפי מספר תיק, כותרת או לקוח..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="status-filter-group">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    className={`status-filter-chip ${statusFilter === f.value ? "active" : ""}`}
                    aria-pressed={statusFilter === f.value}
                    onClick={() => setStatusFilter(f.value)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <p>טוען...</p>
          ) : cases.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="אין עדיין תיקים במערכת"
              subtitle="לחצו על 'תיק חדש' כדי להתחיל"
            />
          ) : visibleCases.length === 0 ? (
            <EmptyState icon={Search} title="לא נמצאו תיקים תואמים" subtitle="נסו לשנות את החיפוש או הסינון" />
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col" aria-sort={ariaSort("case_number")}>
                      <button type="button" className="sort-header" onClick={() => toggleSort("case_number")}>
                        מספר תיק {sortIcon("case_number")}
                      </button>
                    </th>
                    <th scope="col" aria-sort={ariaSort("title")}>
                      <button type="button" className="sort-header" onClick={() => toggleSort("title")}>
                        כותרת {sortIcon("title")}
                      </button>
                    </th>
                    <th scope="col" aria-sort={ariaSort("client")}>
                      <button type="button" className="sort-header" onClick={() => toggleSort("client")}>
                        לקוח {sortIcon("client")}
                      </button>
                    </th>
                    <th scope="col" aria-sort={ariaSort("status")}>
                      <button type="button" className="sort-header" onClick={() => toggleSort("status")}>
                        סטטוס {sortIcon("status")}
                      </button>
                    </th>
                    <th scope="col">
                      <span className="visually-hidden">פעולות</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCases.map((c) => (
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
            </div>
          )}
        </section>

        <aside>
          <section className="card deadlines-widget">
            <h2>
              <Clock3 size={16} /> מועדים קרובים (14 יום)
            </h2>
            {!loading && upcomingDeadlines.length === 0 ? (
              <p className="muted small">אין מועדים קרובים בטווח הזמן הזה.</p>
            ) : (
              <ul className="deadline-groups">
                {(["overdue", "urgent", "soon", "later"] as const).map((key) =>
                  groupedDeadlines[key].length === 0 ? null : (
                    <li key={key} className={`deadline-group deadline-group-${key}`}>
                      <div className="deadline-group-label">
                        {urgencyIcon(key)} {urgencyLabel(key)}
                      </div>
                      <ul className="doc-list">
                        {groupedDeadlines[key].map((d) => (
                          <li key={d.id}>
                            <Link to={`/cases/${d.case_id}`}>
                              {d.title} - {d.case_title} ({d.case_number})
                            </Link>
                            <span className="muted small deadline-date">
                              {new Date(d.due_date).toLocaleDateString("he-IL")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  )
                )}
              </ul>
            )}
          </section>

          <section className="card meetings-widget">
            <h2>
              <CalendarClock size={16} /> פגישות קרובות (14 יום)
            </h2>
            {!loading && upcomingMeetings.length === 0 ? (
              <p className="muted small">אין פגישות קרובות בטווח הזמן הזה.</p>
            ) : (
              <ul className="deadline-groups">
                {(["overdue", "urgent", "soon", "later"] as const).map((key) =>
                  groupedMeetings[key].length === 0 ? null : (
                    <li key={key} className={`deadline-group deadline-group-${key}`}>
                      <div className="deadline-group-label">
                        {urgencyIcon(key)} {urgencyLabel(key)}
                      </div>
                      <ul className="doc-list">
                        {groupedMeetings[key].map((m) => (
                          <li key={m.id}>
                            <Link to={`/cases/${m.case_id}`}>
                              {m.title} ({MEETING_TYPE_LABEL[m.meeting_type]}) - {m.case_title} (
                              {m.case_number})
                            </Link>
                            <span className="muted small deadline-date">
                              {new Date(m.start_time).toLocaleString("he-IL", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  )
                )}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function urgencyLabel(key: "overdue" | "urgent" | "soon" | "later"): string {
  switch (key) {
    case "overdue":
      return "באיחור";
    case "urgent":
      return "דחוף (היום/מחר)";
    case "soon":
      return "בקרוב (עד 4 ימים)";
    default:
      return "בהמשך";
  }
}

function urgencyIcon(key: "overdue" | "urgent" | "soon" | "later") {
  switch (key) {
    case "overdue":
    case "urgent":
      return <AlertTriangle size={13} />;
    case "soon":
      return <Clock3 size={13} />;
    default:
      return <CalendarClock size={13} />;
  }
}
