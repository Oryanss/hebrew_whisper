import { useEffect, useState, type FormEvent } from "react";
import { Users } from "lucide-react";
import { api, ApiError } from "../api";
import EmptyState from "../components/EmptyState";
import { SkeletonTable } from "../components/Skeleton";
import ToastContainer from "../components/Toast";
import { useToast } from "../hooks/useToast";
import type { Client } from "../types";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toasts, toast, dismiss } = useToast();

  function reload() {
    setLoading(true);
    api
      .listClients()
      .then(setClients)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "שגיאה בטעינת לקוחות"))
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    try {
      await api.createClient({
        full_name: form.get("full_name"),
        id_number: form.get("id_number") || null,
        phone: form.get("phone") || null,
        email: form.get("email") || null,
        address: form.get("address") || null,
      });
      formEl.reset();
      setShowForm(false);
      toast.success("הלקוח נוסף בהצלחה");
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "שגיאה ביצירת לקוח");
    }
  }

  return (
    <div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div className="page-header">
        <h1><Users size={20} /> לקוחות</h1>
        <button onClick={() => setShowForm((v) => !v)}>{showForm ? "ביטול" : "לקוח חדש"}</button>
      </div>

      {loadError && <div className="error-text">{loadError}</div>}

      {showForm && (
        <form className="card form-card" onSubmit={handleCreate}>
          <div className="form-grid">
            <label>
              שם מלא
              <input name="full_name" required />
            </label>
            <label>
              ת"ז / ח"פ
              <input name="id_number" />
            </label>
            <label>
              טלפון
              <input name="phone" />
            </label>
            <label>
              דוא"ל
              <input name="email" type="email" />
            </label>
          </div>
          <label>
            כתובת
            <input name="address" />
          </label>
          <button type="submit">שמירת לקוח</button>
        </form>
      )}

      {loading ? (
        <SkeletonTable rows={4} cols={4} />
      ) : clients.length === 0 ? (
        <EmptyState icon={Users} title="אין עדיין לקוחות במערכת" subtitle="לחצו על 'לקוח חדש' כדי להתחיל" />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>שם</th>
              <th>ת"ז / ח"פ</th>
              <th>טלפון</th>
              <th>דוא"ל</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <td>{c.full_name}</td>
                <td>{c.id_number ?? "-"}</td>
                <td>{c.phone ?? "-"}</td>
                <td>{c.email ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
