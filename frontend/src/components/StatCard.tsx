import type { LucideIcon } from "lucide-react";

export type StatTone = "indigo" | "emerald" | "amber" | "rose" | "slate";

export default function StatCard({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: LucideIcon;
  value: number | string;
  label: string;
  tone: StatTone;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon tone-${tone}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}
