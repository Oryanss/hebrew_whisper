import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Scale, FolderOpen, BookMarked, FileText, Network, Settings as SettingsIcon, LayoutDashboard, Plus, Trash2, Search, Calendar, AlertTriangle, CheckCircle2, XCircle, Clock, Download, Copy, Save, ChevronLeft, Building2, Gavel, ShieldCheck, ShieldAlert, ListChecks, Hash, FileSignature, Info, X, Edit3, Calculator, Star, Lock } from 'lucide-react';

/* ============================ קבועים ============================ */
const KEY = 'sahar-legal-os-v9';

const FONT = 'David, "Frank Ruhl Libre", "Times New Roman", serif';

const TABS = [
  { id: 'dash', label: 'לוח בקרה', icon: LayoutDashboard },
  { id: 'matters', label: 'תיקים', icon: FolderOpen },
  { id: 'auth', label: 'אסמכתאות', icon: BookMarked },
  { id: 'docs', label: 'עריכת מסמכים', icon: FileText },
  { id: 'strat', label: 'מחקר ואסטרטגיה', icon: Network },
  { id: 'settings', label: 'הגדרות ומשרד', icon: SettingsIcon },
];

const DOC_TYPES = ['כתב תביעה', 'כתב הגנה', 'כתב תשובה', 'בקשת ביניים', 'תשובה לבקשה', 'עתירה', 'מכתב התראה', 'חוות דעת'];
const MATTER_TYPES = ['אזרחי-מסחרי', 'חוזים', 'מקרקעין', 'דיני משפחה', 'בוררות/גישור', 'עבודה', 'פרטיות/טכנולוגיה', 'קניין רוחני', 'אחר'];
const MATTER_STATUS = ['פעיל', 'בהמתנה', 'מושהה', 'סגור'];
const COURT_LEVELS = ['שלום', 'מחוזי', 'עליון', 'משפחה', 'רבני', 'עבודה', 'בוררות'];

const CITE_PREFIXES = ['ע"א', 'ע"פ', 'רע"א', 'רע"פ', 'בג"ץ', 'בג"צ', 'דנ"א', 'דנ"פ', 'בש"א', 'בשג"ץ', 'ת"א', 'תא"מ', 'תמ"ש', 'תה"ס', 'ה"פ', 'עע"מ', 'בר"מ', 'רע"מ', 'ע"ע', 'בר"ע', 'עב"ל', 'ע"ב', 'בע"מ'];
const CITE_ALT = CITE_PREFIXES.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

/* בנק תניות — נגזר מפרופיל הניסוח */
const CLAUSES = {
  'מקדמים': [
    'נקדים ונאמר;',
    'מפאת חשיבות הדברים נקדים ונאמר כבר עתה כי',
    'אקדמת מילין —',
  ],
  'מחברים קלאסיים': ['הנה כי כן,', 'ולא בכדי,', 'יתירה מזאת,', 'למותר לציין כי', 'לאמתו של דבר,', 'אם כן,', 'סיכומם של דברים —'],
  'לשון הסתייגות': ['כביכול', 'לכאורה', 'נחזות להיות', '"⟦מונח שנוי במחלוקת⟧"'],
  'נעילות אסרטיביות': [
    'הנה כי כן, דין תביעתו של התובע להידחות.',
    'אשר על כן, יש לדחות את תביעת התובע — ולחייבו בהוצאות.',
    'דין התביעה להידחות בשתי ידיים, תוך חיוב התובע בהוצאות לדוגמה.',
    'התביעה מופרכת, חסרת בסיס, ויסודה בניסיון להתעשר ולא במשפט.',
  ],
  'הכחשות ושמירת זכויות': [
    'הנתבעים מכחישים כל טענה שלא הודו בה במפורש בכתב הגנה זה, ורואים בתובע כמי שנדרש להוכיח כל טענה וטענה כדין.',
    'הנתבעים שומרים על זכותם לבקש להוסיף על כתב הגנה זה ו/או לתקנו, בהתאם להתפתחות ההליך וכפי שיורה בית המשפט הנכבד.',
  ],
  'סימון אסמכתה': ['⟦דרושה אסמכתה⟧'],
};

const PLEAS = [
  'חוסר סמכות עניינית', 'חוסר סמכות מקומית', 'התיישנות', 'מעשה בית דין / השתק פלוגתא',
  'העדר עילת תביעה', 'אי-מיצוי הליכים מקדמיים', 'שיהוי', 'חוסר יריבות',
  'פגם בייצוג / העדר ייפוי כוח', 'אי-צירוף צד דרוש', 'חוסר ניקיון כפיים (בסעד מן היושר)',
  'קיזוז / תביעה שכנגד (לשקול)', 'ערובה להוצאות (תובע זר/חדל פירעון)', 'אכיפת תניית בוררות',
];

/* מועדים — נקודת מוצא בלבד; בסיס התקנה וספירת פגרות טעונים אימות במקור */
const DEADLINE_PRESETS = [
  { label: 'כתב הגנה (מהמצאת כתב תביעה)', days: 60, conf: 'גבוהה', note: '60 ימים לפי תקנות סדא 2018' },
  { label: 'כתב תשובה של התובע', days: 14, conf: 'טעון אימות', note: 'בכפוף להוראת ביהמ"ש' },
  { label: 'תשובה לבקשה בכתב', days: 20, conf: 'טעון אימות', note: 'לרוב נקבע בהחלטה' },
  { label: 'ערעור בזכות על פסק דין (מחוזי)', days: 45, conf: 'טעון אימות', note: 'דגל אימות — בדקי מקור' },
  { label: 'בקשת רשות ערעור (רע"א)', days: 30, conf: 'טעון אימות', note: 'דגל אימות — בדקי מקור' },
  { label: 'מותאם אישית', days: 0, conf: 'מותאם', note: 'הזיני מספר ימים ובסיס' },
];

/* ============================ נתוני זרע ============================ */
const SEED = () => ({
  firm: {
    name: `סהר ושות', עורכי דין`,
    partners: `עומרי עיני, עו"ד · ⟦שם השותפה — לאימות⟧`,
    signer: `⟦שם מלא⟧, עו"ד (מ.ר. 72678)`,
    address: `⟦מען המשרד⟧`,
    phone: `⟦טלפון⟧`,
    fax: `⟦פקס⟧`,
    email: `⟦דוא"ל⟧`,
  },
  matters: [{
    id: 'm-seed',
    title: `התחשבנות שותפות — הפצת לחם`,
    caseNumber: `ת"א 62694-06-21`,
    courtLevel: 'שלום',
    court: `שלום ראשון לציון`,
    judge: `כב' השופט שלומי שניידר`,
    clientName: `⟦שם הלקוח⟧`,
    opposing: `⟦הצד שכנגד⟧`,
    matterType: 'אזרחי-מסחרי',
    status: 'פעיל',
    openedDate: '',
    notes: `תיק קיים. פרטי הצדדים מולאו כ-placeholder לשמירה על משמעת אנונימיזציה — להשלמה מקומית.`,
    deadlines: [],
    pleas: {},
    issues: [],
    createdAt: Date.now(), updatedAt: Date.now(),
  }],
  authorities: [
    { id: 'a1', type: 'case', citation: `ע"א 548/78`, caseName: `שרון נ' לוי`, court: '', year: '1978', principle: `⟦תמצית ההלכה — לאימות⟧`, status: 'unverified' },
    { id: 'a2', type: 'case', citation: `ע"א 55/89`, caseName: `קופל (נהיגה עצמית) נ' טלקאר`, court: '', year: '1989', principle: `⟦תמצית ההלכה — לאימות⟧`, status: 'unverified' },
    { id: 'a3', type: 'case', citation: `ע"א 2602/21`, caseName: `בן חמו נ' ליימן שליסל`, court: '', year: '2021', principle: `⟦תמצית ההלכה — לאימות⟧`, status: 'unverified' },
    { id: 'a4', type: 'case', citation: `ע"א 558/96`, caseName: `שיכון עובדים נ' רוזנטל`, court: '', year: '1996', principle: `⟦תמצית ההלכה — לאימות⟧`, status: 'unverified' },
  ],
  documents: [],
});

/* ============================ עזרי תאריך/קובץ ============================ */
const uid = () => Math.random().toString(36).slice(2, 9);
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = new Date((iso || todayISO()) + 'T00:00:00'); d.setDate(d.getDate() + Number(n || 0)); return d.toISOString().slice(0, 10); };
const fmt = (iso) => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const daysUntil = (iso) => { if (!iso) return null; const d = new Date(iso + 'T00:00:00'); const t = new Date(todayISO() + 'T00:00:00'); return Math.round((d - t) / 86400000); };
const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const download = (content, name, mime) => {
  const blob = new Blob([content], { type: mime });
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = u; a.download = name; a.click();
  URL.revokeObjectURL(u);
};

const scanCitations = (text, authorities) => {
  const norm = (s) => (s || '').replace(/״/g, '"').replace(/׳/g, "'");
  const t = norm(text || '');
  const placeholders = (text || '').match(/⟦[^⟧]*⟧/g) || [];
  const re = new RegExp('(?:' + CITE_ALT + ')\\s*\\d{1,6}\\s*\\/\\s*\\d{2,4}', 'g');
  const found = []; let m;
  while ((m = re.exec(t))) found.push(m[0].replace(/\s+/g, ' ').trim());
  const uniq = [...new Set(found)];
  const cites = uniq.map((tok) => {
    const docket = (tok.match(/\d{1,6}\s*\/\s*\d{2,4}/) || [''])[0].replace(/\s+/g, '');
    const a = authorities.find((x) => norm(x.citation).replace(/\s+/g, '').includes(docket));
    let status = 'absent';
    if (a) status = a.status === 'verified' ? 'verified' : 'unverified';
    return { token: tok, docket, status, authorityId: a ? a.id : null };
  });
  return { placeholders, cites };
};

/* ============================ Store (שמירה מתמשכת ב-localStorage) ============================ */
function useStore() {
  const [state, setState] = useState(null);
  const [persistOk, setPersistOk] = useState(true);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { setState(JSON.parse(raw)); return; }
    } catch (e) { /* מפתח לא קיים/לא תקין — זרע */ }
    setState(SEED());
  }, []);
  const update = useCallback((fn) => {
    setState((prev) => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch (e) { setPersistOk(false); }
      return next;
    });
  }, []);
  return { state, update, persistOk };
}

/* ============================ רכיבי UI ============================ */
const Badge = ({ tone = 'slate', children, icon: Icon }) => {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${tones[tone]}`}>{Icon && <Icon size={11} />}{children}</span>;
};

const Card = ({ children, className = '' }) => <div className={`bg-white border border-slate-200 rounded-xl ${className}`}>{children}</div>;

const Modal = ({ open, onClose, title, children, wide }) => !open ? null : (
  <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 overflow-auto" onClick={onClose}>
    <div className={`bg-white rounded-xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} my-8`} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <h3 className="font-bold text-slate-800">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const Field = ({ label, children, hint }) => (
  <label className="block mb-3">
    <span className="block text-xs font-semibold text-slate-600 mb-1">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
  </label>
);
const inp = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white';

const Empty = ({ icon: Icon, title, sub }) => (
  <div className="text-center py-16 text-slate-400">
    <Icon size={40} className="mx-auto mb-3 opacity-50" />
    <p className="font-semibold text-slate-500">{title}</p>
    {sub && <p className="text-sm mt-1">{sub}</p>}
  </div>
);

/* ============================ לוח בקרה ============================ */
function Dashboard({ s, go }) {
  const open = s.matters.filter((m) => m.status !== 'סגור');
  const allDeadlines = s.matters.flatMap((m) => (m.deadlines || []).filter((d) => !d.done).map((d) => ({ ...d, matter: m })));
  const upcoming = allDeadlines.filter((d) => daysUntil(d.dueDate) !== null && daysUntil(d.dueDate) <= 60).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const verified = s.authorities.filter((a) => a.status === 'verified').length;
  const unver = s.authorities.length - verified;

  const Stat = ({ icon: Icon, n, label, tone }) => (
    <Card className="p-4 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${tone}`}><Icon size={20} /></div>
      <div><div className="text-2xl font-bold text-slate-800 leading-none">{n}</div><div className="text-xs text-slate-500 mt-1">{label}</div></div>
    </Card>
  );
  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat icon={FolderOpen} n={open.length} label="תיקים פעילים" tone="bg-indigo-50 text-indigo-600" />
        <Stat icon={Clock} n={upcoming.length} label="מועדים ב-60 הימים הקרובים" tone="bg-amber-50 text-amber-600" />
        <Stat icon={ShieldCheck} n={verified} label="אסמכתאות מאומתות" tone="bg-emerald-50 text-emerald-600" />
        <Stat icon={FileText} n={s.documents.length} label="מסמכים שנערכו" tone="bg-slate-100 text-slate-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-4">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Calendar size={16} /> מועדים קרבים</h3>
          {upcoming.length === 0 ? <Empty icon={Calendar} title="אין מועדים קרבים" sub="הוסיפי מועדים בכרטיס התיק" /> : (
            <div className="space-y-2">
              {upcoming.slice(0, 8).map((d) => {
                const du = daysUntil(d.dueDate);
                const tone = du < 0 ? 'rose' : du <= 7 ? 'amber' : 'slate';
                return (
                  <div key={d.id} className="flex items-center justify-between border border-slate-100 rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-700 truncate">{d.title}</div>
                      <button onClick={() => go('matters', d.matter.id)} className="text-[11px] text-indigo-600 hover:underline">{d.matter.title} · {d.matter.caseNumber}</button>
                    </div>
                    <div className="text-left shrink-0">
                      <div className="text-sm font-bold text-slate-800">{fmt(d.dueDate)}</div>
                      <Badge tone={tone}>{du < 0 ? `חלף ב-${-du} ימים` : du === 0 ? 'היום' : `בעוד ${du} ימים`}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><ShieldAlert size={16} /> מצב בנק האסמכתאות</h3>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-emerald-400" style={{ width: `${s.authorities.length ? (verified / s.authorities.length) * 100 : 0}%` }} />
            </div>
            <span className="text-xs text-slate-500">{verified}/{s.authorities.length}</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-emerald-700"><CheckCircle2 size={14} /> מאומת</span><b>{verified}</b></div>
            <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-amber-700"><AlertTriangle size={14} /> טעון אימות</span><b>{unver}</b></div>
          </div>
          <button onClick={() => go('auth')} className="mt-4 w-full text-sm bg-indigo-600 text-white rounded-lg py-2 hover:bg-indigo-700">לבנק האסמכתאות</button>
        </Card>
      </div>

      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex gap-3">
        <Info size={18} className="shrink-0 mt-0.5" />
        <div>
          <b>מגבלות שקופות (לפי עקרון מניעת הבדיות):</b> אין חיבור חי ל-נבו/תקדין/נט-המשפט — אימות סופי נעשה אצלך במאגרים. מחשבון המועדים אינו מנכה ימי פגרה (תקנה 179(ב)) וברירות־המחדל לערעורים מסומנות כטעונות אימות. ספירת העמודים במסמך היא הערכה לפי תווים בלבד.
        </div>
      </div>
    </div>
  );
}

/* ============================ תיקים ============================ */
function Matters({ s, update, sel, setSel }) {
  const [edit, setEdit] = useState(null);
  const [q, setQ] = useState('');
  const matter = s.matters.find((m) => m.id === sel);
  const list = s.matters.filter((m) => (m.title + m.caseNumber + m.clientName).includes(q));

  const save = (d) => {
    update((p) => {
      const ex = p.matters.find((m) => m.id === d.id);
      const matters = ex ? p.matters.map((m) => m.id === d.id ? { ...d, updatedAt: Date.now() } : m)
        : [...p.matters, { ...d, id: uid(), deadlines: [], pleas: {}, issues: [], createdAt: Date.now(), updatedAt: Date.now() }];
      return { ...p, matters };
    });
    setEdit(null);
  };
  const del = (id) => { update((p) => ({ ...p, matters: p.matters.filter((m) => m.id !== id) })); if (sel === id) setSel(null); };

  if (matter) return <MatterDetail matter={matter} s={s} update={update} back={() => setSel(null)} onEdit={() => setEdit(matter)} onDel={() => del(matter.id)} editModal={edit} setEdit={setEdit} save={save} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute right-3 top-2.5 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש תיק…" className={inp + ' pr-9'} />
        </div>
        <button onClick={() => setEdit({ id: '', title: '', caseNumber: '', courtLevel: 'שלום', court: '', judge: '', clientName: '', opposing: '', matterType: 'אזרחי-מסחרי', status: 'פעיל', openedDate: '', notes: '' })} className="flex items-center gap-1 bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-indigo-700"><Plus size={16} /> תיק חדש</button>
      </div>
      {list.length === 0 ? <Empty icon={FolderOpen} title="אין תיקים" sub="לחצי על 'תיק חדש'" /> : (
        <div className="grid md:grid-cols-2 gap-3">
          {list.map((m) => {
            const nd = (m.deadlines || []).filter((d) => !d.done).length;
            return (
              <Card key={m.id} className="p-4 hover:border-indigo-300 cursor-pointer transition" >
                <div onClick={() => setSel(m.id)}>
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-slate-800">{m.title}</h3>
                    <Badge tone={m.status === 'פעיל' ? 'emerald' : m.status === 'סגור' ? 'slate' : 'amber'}>{m.status}</Badge>
                  </div>
                  <div className="text-sm text-slate-500 mt-1">{m.caseNumber} · {m.court}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{m.judge}</div>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge tone="indigo">{m.matterType}</Badge>
                    {nd > 0 && <Badge tone="amber" icon={Clock}>{nd} מועדים פתוחים</Badge>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <MatterForm edit={edit} setEdit={setEdit} save={save} />
    </div>
  );
}

function MatterForm({ edit, setEdit, save }) {
  const [d, setD] = useState(edit);
  useEffect(() => setD(edit), [edit]);
  if (!d) return null;
  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));
  return (
    <Modal open={!!edit} onClose={() => setEdit(null)} title={d.id ? 'עריכת תיק' : 'תיק חדש'} wide>
      <div className="grid md:grid-cols-2 gap-x-4">
        <Field label="כותרת התיק"><input className={inp} value={d.title} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field label="מספר הליך"><input className={inp} value={d.caseNumber} onChange={(e) => set('caseNumber', e.target.value)} placeholder='ת"א 00000-00-00' /></Field>
        <Field label="ערכאה"><select className={inp} value={d.courtLevel} onChange={(e) => set('courtLevel', e.target.value)}>{COURT_LEVELS.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="בית משפט"><input className={inp} value={d.court} onChange={(e) => set('court', e.target.value)} placeholder="שלום ראשון לציון" /></Field>
        <Field label="מותב"><input className={inp} value={d.judge} onChange={(e) => set('judge', e.target.value)} placeholder="כב' השופט/ת…" /></Field>
        <Field label="סוג עניין"><select className={inp} value={d.matterType} onChange={(e) => set('matterType', e.target.value)}>{MATTER_TYPES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="לקוח" hint="מומלץ placeholder; השלימי מקומית"><input className={inp} value={d.clientName} onChange={(e) => set('clientName', e.target.value)} /></Field>
        <Field label="צד שכנגד"><input className={inp} value={d.opposing} onChange={(e) => set('opposing', e.target.value)} /></Field>
        <Field label="סטטוס"><select className={inp} value={d.status} onChange={(e) => set('status', e.target.value)}>{MATTER_STATUS.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="תאריך פתיחה"><input type="date" className={inp} value={d.openedDate} onChange={(e) => set('openedDate', e.target.value)} /></Field>
      </div>
      <Field label="הערות"><textarea className={inp + ' h-20'} value={d.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={() => setEdit(null)} className="px-4 py-2 text-sm text-slate-600">ביטול</button>
        <button onClick={() => d.title && save(d)} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">שמירה</button>
      </div>
    </Modal>
  );
}

function MatterDetail({ matter, update, back, onEdit, onDel, editModal, setEdit, save }) {
  const patch = (fn) => update((p) => ({ ...p, matters: p.matters.map((m) => m.id === matter.id ? { ...fn(m), updatedAt: Date.now() } : m) }));
  const [calc, setCalc] = useState(false);

  const togglePlea = (pl) => patch((m) => ({ ...m, pleas: { ...m.pleas, [pl]: !m.pleas[pl] } }));
  const addDeadline = (dl) => patch((m) => ({ ...m, deadlines: [...(m.deadlines || []), { ...dl, id: uid(), done: false }] }));
  const toggleDl = (id) => patch((m) => ({ ...m, deadlines: m.deadlines.map((d) => d.id === id ? { ...d, done: !d.done } : d) }));
  const delDl = (id) => patch((m) => ({ ...m, deadlines: m.deadlines.filter((d) => d.id !== id) }));

  return (
    <div>
      <button onClick={back} className="flex items-center gap-1 text-sm text-indigo-600 mb-3 hover:underline"><ChevronLeft size={16} /> חזרה לרשימה</button>
      <Card className="p-5 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{matter.title}</h2>
            <div className="text-slate-500 mt-1">{matter.caseNumber} · {matter.court} · {matter.judge}</div>
            <div className="flex gap-2 mt-3">
              <Badge tone="indigo">{matter.matterType}</Badge>
              <Badge tone={matter.status === 'פעיל' ? 'emerald' : 'slate'}>{matter.status}</Badge>
              {matter.openedDate && <Badge tone="slate" icon={Calendar}>נפתח {fmt(matter.openedDate)}</Badge>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onEdit} className="p-2 text-slate-500 hover:text-indigo-600"><Edit3 size={16} /></button>
            <button onClick={() => { if (confirm('למחוק תיק זה?')) onDel(); }} className="p-2 text-slate-500 hover:text-rose-600"><Trash2 size={16} /></button>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-1 mt-4 text-sm">
          <div><span className="text-slate-400">לקוח:</span> {matter.clientName || '—'}</div>
          <div><span className="text-slate-400">צד שכנגד:</span> {matter.opposing || '—'}</div>
        </div>
        {matter.notes && <p className="text-sm text-slate-600 mt-3 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">{matter.notes}</p>}
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Clock size={16} /> מועדים</h3>
            <button onClick={() => setCalc(true)} className="flex items-center gap-1 text-sm bg-indigo-50 text-indigo-700 rounded-lg px-3 py-1.5 hover:bg-indigo-100"><Calculator size={14} /> מחשבון מועד</button>
          </div>
          {(matter.deadlines || []).length === 0 ? <p className="text-sm text-slate-400 py-6 text-center">אין מועדים</p> : (
            <div className="space-y-2">
              {matter.deadlines.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')).map((d) => {
                const du = daysUntil(d.dueDate);
                return (
                  <div key={d.id} className={`flex items-center gap-2 border rounded-lg px-3 py-2 ${d.done ? 'bg-slate-50 border-slate-100 opacity-60' : 'border-slate-200'}`}>
                    <input type="checkbox" checked={d.done} onChange={() => toggleDl(d.id)} className="accent-indigo-600" />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold ${d.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{d.title}</div>
                      {d.basis && <div className="text-[11px] text-slate-400">{d.basis}</div>}
                    </div>
                    <div className="text-left shrink-0">
                      <div className="text-sm font-bold text-slate-700">{fmt(d.dueDate)}</div>
                      {!d.done && du !== null && <Badge tone={du < 0 ? 'rose' : du <= 7 ? 'amber' : 'slate'}>{du < 0 ? `חלף` : du === 0 ? 'היום' : `${du} ימים`}</Badge>}
                    </div>
                    <button onClick={() => delDl(d.id)} className="text-slate-300 hover:text-rose-500"><X size={14} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3"><ListChecks size={16} /> טענות מקדמיות לבחינה</h3>
          <div className="grid grid-cols-1 gap-1">
            {PLEAS.map((pl) => (
              <label key={pl} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer text-sm ${matter.pleas?.[pl] ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-slate-50 text-slate-600'}`}>
                <input type="checkbox" checked={!!matter.pleas?.[pl]} onChange={() => togglePlea(pl)} className="accent-emerald-600" />
                {pl}
              </label>
            ))}
          </div>
        </Card>
      </div>

      <DeadlineCalc open={calc} onClose={() => setCalc(false)} onAdd={(dl) => { addDeadline(dl); setCalc(false); }} />
      <MatterForm edit={editModal} setEdit={setEdit} save={save} />
    </div>
  );
}

function DeadlineCalc({ open, onClose, onAdd }) {
  const [preset, setPreset] = useState(0);
  const [trigger, setTrigger] = useState(todayISO());
  const [days, setDays] = useState(DEADLINE_PRESETS[0].days);
  const [label, setLabel] = useState(DEADLINE_PRESETS[0].label);
  useEffect(() => { const p = DEADLINE_PRESETS[preset]; setDays(p.days); if (p.label !== 'מותאם אישית') setLabel(p.label); }, [preset]);
  const due = addDays(trigger, days);
  const p = DEADLINE_PRESETS[preset];
  return (
    <Modal open={open} onClose={onClose} title="מחשבון מועדים — לאימות">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[12px] text-amber-800 mb-4">
        ברירות־המחדל הן נקודת מוצא בלבד. <b>בסיס התקנה</b> ו<b>ספירת ימי הפגרה</b> (תקנה 179(ב)) טעונים אימות במקור. מועדי ערעור מסומנים כדגלי אימות.
      </div>
      <Field label="סוג מועד"><select className={inp} value={preset} onChange={(e) => setPreset(Number(e.target.value))}>{DEADLINE_PRESETS.map((x, i) => <option key={i} value={i}>{x.label}</option>)}</select></Field>
      <div className="flex items-center gap-2 mb-2"><Badge tone={p.conf === 'גבוהה' ? 'emerald' : p.conf === 'מותאם' ? 'slate' : 'amber'}>{p.conf}</Badge><span className="text-xs text-slate-500">{p.note}</span></div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="כותרת המועד"><input className={inp} value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
        <Field label="מספר ימים"><input type="number" className={inp} value={days} onChange={(e) => setDays(Number(e.target.value))} /></Field>
      </div>
      <Field label="אירוע מפעיל (תאריך)"><input type="date" className={inp} value={trigger} onChange={(e) => setTrigger(e.target.value)} /></Field>
      <div className="bg-indigo-50 rounded-lg p-4 text-center my-2">
        <div className="text-xs text-indigo-500">מועד מחושב (ללא ניכוי פגרות)</div>
        <div className="text-2xl font-bold text-indigo-800">{fmt(due)}</div>
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">סגירה</button>
        <button onClick={() => onAdd({ title: label, dueDate: due, basis: `${days} ימים מ-${fmt(trigger)} · ${p.conf === 'גבוהה' ? p.note : 'טעון אימות'}` })} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">הוספה לתיק</button>
      </div>
    </Modal>
  );
}

/* ============================ אסמכתאות ============================ */
function Authorities({ s, update }) {
  const [edit, setEdit] = useState(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const list = s.authorities.filter((a) => (a.citation + a.caseName + a.principle).includes(q)).filter((a) => filter === 'all' ? true : filter === 'verified' ? a.status === 'verified' : a.status !== 'verified');

  const save = (d) => {
    update((p) => {
      const ex = p.authorities.find((a) => a.id === d.id);
      return { ...p, authorities: ex ? p.authorities.map((a) => a.id === d.id ? d : a) : [...p.authorities, { ...d, id: uid() }] };
    });
    setEdit(null);
  };
  const del = (id) => update((p) => ({ ...p, authorities: p.authorities.filter((a) => a.id !== id) }));
  const verify = (id) => update((p) => ({ ...p, authorities: p.authorities.map((a) => a.id === id ? { ...a, status: a.status === 'verified' ? 'unverified' : 'verified', verifiedAt: Date.now() } : a) }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-sm"><Search size={16} className="absolute right-3 top-2.5 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש אסמכתה…" className={inp + ' pr-9'} /></div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {[['all', 'הכל'], ['verified', 'מאומת'], ['unverified', 'טעון אימות']].map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1 rounded-md text-xs ${filter === k ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}>{l}</button>)}
        </div>
        <button onClick={() => setEdit({ id: '', type: 'case', citation: '', caseName: '', court: '', year: '', principle: '', status: 'unverified' })} className="flex items-center gap-1 bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-indigo-700"><Plus size={16} /> אסמכתה</button>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[12px] text-slate-600 mb-4 flex gap-2">
        <ShieldAlert size={16} className="shrink-0 text-amber-500" />
        אסמכתה נחשבת <b className="text-emerald-700">מאומתת</b> רק לאחר שאישרת אותה ידנית מול נבו/תקדין. אסמכתאות הזרע סומנו <b className="text-amber-700">טעונות אימות</b> בכוונה — סורק האסמכתאות במסמכים יצביע עליהן עד לאישורך.
      </div>

      {list.length === 0 ? <Empty icon={BookMarked} title="אין אסמכתאות" /> : (
        <div className="space-y-2">
          {list.map((a) => (
            <Card key={a.id} className="p-4 flex items-start gap-3">
              <div className="shrink-0 mt-0.5">{a.status === 'verified' ? <ShieldCheck size={18} className="text-emerald-500" /> : <ShieldAlert size={18} className="text-amber-500" />}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-800">{a.citation}</span>
                  <span className="text-slate-600">{a.caseName}</span>
                  <Badge tone="slate">{a.type === 'case' ? 'פסיקה' : a.type === 'statute' ? 'חקיקה' : 'ספרות'}</Badge>
                  {a.year && <Badge tone="slate">{a.year}</Badge>}
                </div>
                <p className="text-sm text-slate-500 mt-1">{a.principle}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => verify(a.id)} className={`text-xs px-3 py-1 rounded-lg ${a.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{a.status === 'verified' ? 'מאומת ✓' : 'סמני כמאומת'}</button>
                <div className="flex gap-1 justify-end">
                  <button onClick={() => setEdit(a)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit3 size={14} /></button>
                  <button onClick={() => del(a.id)} className="p-1.5 text-slate-400 hover:text-rose-500"><Trash2 size={14} /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <AuthForm edit={edit} setEdit={setEdit} save={save} />
    </div>
  );
}

function AuthForm({ edit, setEdit, save }) {
  const [d, setD] = useState(edit);
  useEffect(() => setD(edit), [edit]);
  if (!d) return null;
  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));
  return (
    <Modal open={!!edit} onClose={() => setEdit(null)} title={d.id ? 'עריכת אסמכתה' : 'אסמכתה חדשה'}>
      <Field label="סוג"><select className={inp} value={d.type} onChange={(e) => set('type', e.target.value)}><option value="case">פסיקה</option><option value="statute">חקיקה</option><option value="literature">ספרות</option></select></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="ציטוט" hint='ע"א 548/78'><input className={inp} value={d.citation} onChange={(e) => set('citation', e.target.value)} /></Field>
        <Field label="שם/כותרת"><input className={inp} value={d.caseName} onChange={(e) => set('caseName', e.target.value)} /></Field>
        <Field label="ערכאה/מקור"><input className={inp} value={d.court} onChange={(e) => set('court', e.target.value)} /></Field>
        <Field label="שנה"><input className={inp} value={d.year} onChange={(e) => set('year', e.target.value)} /></Field>
      </div>
      <Field label="תמצית ההלכה / רלוונטיות"><textarea className={inp + ' h-24'} value={d.principle} onChange={(e) => set('principle', e.target.value)} /></Field>
      <label className="flex items-center gap-2 text-sm text-slate-600 mb-2"><input type="checkbox" checked={d.status === 'verified'} onChange={(e) => set('status', e.target.checked ? 'verified' : 'unverified')} className="accent-emerald-600" /> אומת מול מאגר (נבו/תקדין)</label>
      <div className="flex justify-end gap-2"><button onClick={() => setEdit(null)} className="px-4 py-2 text-sm text-slate-600">ביטול</button><button onClick={() => d.citation && save(d)} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">שמירה</button></div>
    </Modal>
  );
}

/* ============================ עריכת מסמכים ============================ */
const SKELETONS = {
  'כתב תביעה': `בבית המשפט ⟦…⟧                                            ת"א ⟦…⟧

התובע:     ⟦שם, ת"ז, מען, טלפון⟧
           ע"י ב"כ עו"ד ⟦…⟧, מ.ר. ⟦…⟧
           ⟦מען להמצאה, טל', פקס, דוא"ל⟧
                                   - נ ג ד -
הנתבע:     ⟦שם, ת"ז, מען⟧

                              כ ת ב   ת ב י ע ה

חלק א' — פרטים טכניים (תקנה 9)
1.  בית המשפט המוסמך: ⟦…⟧.
2.  פרטי בעלי הדין ומען להמצאה: ⟦…⟧.
3.  ⟦ציון אם בעל דין הוא תאגיד/קטין/פסול דין⟧.
4.  הסעדים המבוקשים ושווי נושא התובענה: ⟦…⟧.
5.  סכום האגרה והפניה לפרט בתוספת: ⟦…⟧.

חלק ב' — תמצית (תקנה 10)
6.  עילת התביעה: ⟦…⟧.
7.  הסעד המבוקש בתמצית: ⟦…⟧.
8.  תמצית העובדות ומועד היווצרות העילה: ⟦…⟧.
9.  העובדות המקנות סמכות: ⟦…⟧.

חלק ג' — פירוט (תקנה 14(א))  ⟦עד 9 עמ' בשלום / 12 עמ' במחוזי⟧
הצדדים והרקע
10. ⟦…⟧

אשר על כן, מתבקש בית המשפט הנכבד ⟦…⟧.`,

  'כתב הגנה': `בבית המשפט ⟦…⟧                                            ת"א ⟦…⟧

התובע:     ⟦…⟧
                                   - נ ג ד -
הנתבעים:   ⟦…⟧
           ע"י ב"כ עו"ד ⟦…⟧, מ.ר. ⟦…⟧

                              כ ת ב   ה ג נ ה

הנתבעים מתכבדים להגיש לבית המשפט הנכבד את כתב הגנתם, כדלהלן:

תמצית טענות ההגנה
1.  ⟦מצג ממוקד של קו ההגנה⟧. הנה כי כן, דין התביעה להידחות.

הצדדים והרקע
2.  ⟦…⟧

התייחסות סעיף-סעיף לכתב התביעה
⟦בלוק ההכחשות — 1..N לפי מספר סעיפי התביעה⟧

הנתבעים מכחישים כל טענה שלא הודו בה במפורש בכתב הגנה זה, ושומרים על זכותם לתקנו.

אשר על כן, יש לדחות את תביעת התובע — ולחייבו בהוצאות.`,

  'בקשת ביניים': `⟦טיוטה — שלד כללי. יחודד עם מדגם אמיתי שתעלי⟧

בבית המשפט ⟦…⟧                                            ת"א ⟦…⟧
המבקש:     ⟦…⟧   נגד   המשיב: ⟦…⟧

                    בקשה ל⟦סוג הסעד⟧

1.  הסעד המבוקש: ⟦…⟧.
2.  הנימוקים בתמצית: ⟦…⟧.
3.  התשתית העובדתית: ⟦…⟧ (נתמכת בתצהיר ⟦…⟧).
4.  התשתית המשפטית: ⟦דרושה אסמכתה⟧.

אשר על כן, מתבקש בית המשפט הנכבד ⟦…⟧.`,
};

function Documents({ s, update }) {
  const [activeId, setActiveId] = useState(s.documents[0]?.id || null);
  const active = s.documents.find((d) => d.id === activeId);
  const [tool, setTool] = useState(null);

  const create = () => {
    const doc = { id: uid(), title: 'מסמך חדש', docType: 'כתב תביעה', matterId: '', body: '', createdAt: Date.now(), updatedAt: Date.now() };
    update((p) => ({ ...p, documents: [doc, ...p.documents] }));
    setActiveId(doc.id);
  };
  const patch = (k, v) => update((p) => ({ ...p, documents: p.documents.map((d) => d.id === activeId ? { ...d, [k]: v, updatedAt: Date.now() } : d) }));
  const del = (id) => { update((p) => ({ ...p, documents: p.documents.filter((d) => d.id !== id) })); if (activeId === id) setActiveId(null); };
  const insert = (txt) => patch('body', (active.body || '') + (active.body ? '\n' : '') + txt);

  const scan = useMemo(() => active ? scanCitations(active.body, s.authorities) : null, [active, s.authorities]);
  const pageEst = active ? Math.max(1, Math.ceil((active.body || '').length / 1800)) : 0;
  const limit = active && active.matterId ? (s.matters.find((m) => m.id === active.matterId)?.courtLevel === 'מחוזי' ? 12 : 9) : null;

  const exportDoc = () => {
    const html = `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>${esc(active.title)}</title><style>@page{margin:2.5cm;}body{font-family:David,'Frank Ruhl Libre',serif;font-size:12pt;line-height:1.5;direction:rtl;text-align:justify;}p{margin:0 0 6pt;}</style></head><body>${esc(active.body).split('\n').map((l) => `<p>${l || '&nbsp;'}</p>`).join('')}</body></html>`;
    download(html, `${active.title}.doc`, 'application/msword');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
      <div>
        <button onClick={create} className="w-full flex items-center justify-center gap-1 bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-indigo-700 mb-3"><Plus size={16} /> מסמך חדש</button>
        <div className="space-y-1">
          {s.documents.map((d) => (
            <div key={d.id} onClick={() => setActiveId(d.id)} className={`px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between ${activeId === d.id ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50'}`}>
              <div className="min-w-0"><div className="text-sm font-semibold text-slate-700 truncate">{d.title}</div><div className="text-[11px] text-slate-400">{d.docType}</div></div>
              <button onClick={(e) => { e.stopPropagation(); del(d.id); }} className="text-slate-300 hover:text-rose-500"><Trash2 size={13} /></button>
            </div>
          ))}
          {s.documents.length === 0 && <p className="text-xs text-slate-400 text-center py-4">אין מסמכים</p>}
        </div>
      </div>

      {!active ? <Card className="p-8"><Empty icon={FileText} title="בחרי מסמך או צרי חדש" /></Card> : (
        <div>
          <Card className="p-4 mb-3">
            <div className="grid md:grid-cols-3 gap-3">
              <Field label="כותרת"><input className={inp} value={active.title} onChange={(e) => patch('title', e.target.value)} /></Field>
              <Field label="סוג מסמך"><select className={inp} value={active.docType} onChange={(e) => patch('docType', e.target.value)}>{DOC_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
              <Field label="שיוך לתיק"><select className={inp} value={active.matterId} onChange={(e) => patch('matterId', e.target.value)}><option value="">— ללא —</option>{s.matters.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select></Field>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              {SKELETONS[active.docType] && <button onClick={() => insert(SKELETONS[active.docType])} className="text-xs bg-slate-800 text-white rounded-lg px-3 py-1.5 hover:bg-slate-700">הוספת שלד {active.docType}</button>}
              <button onClick={() => setTool('clauses')} className="text-xs bg-slate-100 rounded-lg px-3 py-1.5 hover:bg-slate-200">בנק תניות</button>
              <button onClick={() => setTool('denial')} className="text-xs bg-slate-100 rounded-lg px-3 py-1.5 hover:bg-slate-200 flex items-center gap-1"><Hash size={12} /> בלוק הכחשות 1..N</button>
              <button onClick={() => insert(`_______________________\n${s.firm.signer}\nב"כ ⟦בעל הדין⟧\n${s.firm.name}`)} className="text-xs bg-slate-100 rounded-lg px-3 py-1.5 hover:bg-slate-200 flex items-center gap-1"><FileSignature size={12} /> חתימה</button>
              <button onClick={() => insert('⟦דרושה אסמכתה⟧')} className="text-xs bg-amber-100 text-amber-800 rounded-lg px-3 py-1.5 hover:bg-amber-200">⟦דרושה אסמכתה⟧</button>
              <button onClick={exportDoc} className="text-xs bg-emerald-600 text-white rounded-lg px-3 py-1.5 hover:bg-emerald-700 flex items-center gap-1 mr-auto"><Download size={12} /> ייצוא ל-Word</button>
            </div>
          </Card>

          <div className="grid lg:grid-cols-[1fr_300px] gap-3">
            <Card className="p-0 overflow-hidden">
              <textarea value={active.body} onChange={(e) => patch('body', e.target.value)} placeholder="גוף המסמך…" dir="rtl" style={{ fontFamily: FONT, lineHeight: 1.5 }} className="w-full h-[520px] p-5 text-[15px] text-slate-800 focus:outline-none resize-none" />
              <div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400 flex justify-between">
                <span>{(active.body || '').length} תווים · ~{pageEst} עמ' (הערכה)</span>
                {limit && pageEst > limit && <span className="text-rose-500 font-semibold">חריגה משוערת ממגבלת {limit} עמ' לחלק הפירוט</span>}
              </div>
            </Card>

            <Card className="p-4 h-fit">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-3"><ShieldCheck size={15} /> ביקורת אסמכתאות</h4>
              {scan.placeholders.length > 0 && (
                <div className="mb-3"><Badge tone="rose" icon={AlertTriangle}>{scan.placeholders.length} סימוני ⟦דרושה אסמכתה⟧</Badge></div>
              )}
              {scan.cites.length === 0 && scan.placeholders.length === 0 ? <p className="text-xs text-slate-400">לא אותרו ציטוטים. הוסיפי טקסט עם ציטוטי פסיקה.</p> : (
                <div className="space-y-1.5">
                  {scan.cites.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-[12px] border-b border-slate-50 pb-1">
                      <span className="font-semibold text-slate-700">{c.token}</span>
                      {c.status === 'verified' ? <Badge tone="emerald" icon={CheckCircle2}>מאומת</Badge> : c.status === 'unverified' ? <Badge tone="amber" icon={AlertTriangle}>טעון אימות</Badge> : <Badge tone="rose" icon={XCircle}>לא במאגר</Badge>}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">הסורק מצליב מול בנק האסמכתאות בלבד; אין חיבור חי למאגרים. "מאומת" משקף אישור ידני שלך.</p>
            </Card>
          </div>
        </div>
      )}

      <Modal open={tool === 'clauses'} onClose={() => setTool(null)} title="בנק תניות — בקולך הניסוחי" wide>
        <div className="space-y-4 max-h-[60vh] overflow-auto">
          {Object.entries(CLAUSES).map(([cat, items]) => (
            <div key={cat}>
              <h5 className="text-xs font-bold text-indigo-700 mb-2">{cat}</h5>
              <div className="flex flex-wrap gap-2">
                {items.map((it, i) => <button key={i} onClick={() => { insert(it); setTool(null); }} className="text-[13px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 hover:border-indigo-300 text-right">{it}</button>)}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {tool === 'denial' && <DenialTool onClose={() => setTool(null)} onInsert={(t) => { insert(t); setTool(null); }} />}
    </div>
  );
}

function DenialTool({ onClose, onInsert }) {
  const [n, setN] = useState(10);
  const block = Array.from({ length: Math.min(Math.max(n, 0), 200) }, (_, i) => `${i + 1}.\tהנטען בסעיף ${i + 1} לכתב התביעה מוכחש.`).join('\n');
  return (
    <Modal open onClose={onClose} title="מחולל בלוק הכחשות (מספור אוטומטי 1..N)">
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[12px] text-slate-600 mb-3">מיישם את כלל המספור מהפרופיל: התאמה אוטומטית 1..N למספר סעיפי כתב התביעה בפועל, למניעת דילוג או חזרה על מספר.</div>
      <Field label="מספר סעיפים בכתב התביעה"><input type="number" className={inp} value={n} onChange={(e) => setN(Number(e.target.value))} /></Field>
      <pre dir="rtl" style={{ fontFamily: FONT }} className="bg-white border border-slate-200 rounded-lg p-3 text-sm max-h-52 overflow-auto whitespace-pre-wrap">{block}</pre>
      <div className="flex justify-end gap-2 mt-3"><button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">ביטול</button><button onClick={() => onInsert(block)} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">הוספה למסמך</button></div>
    </Modal>
  );
}

/* ============================ מחקר ואסטרטגיה ============================ */
function Strategy({ s, update }) {
  const [mid, setMid] = useState(s.matters[0]?.id || null);
  const matter = s.matters.find((m) => m.id === mid);
  const [edit, setEdit] = useState(null);
  const patch = (fn) => update((p) => ({ ...p, matters: p.matters.map((m) => m.id === mid ? fn(m) : m) }));

  const saveIssue = (d) => {
    patch((m) => {
      const issues = m.issues || [];
      const ex = issues.find((i) => i.id === d.id);
      return { ...m, issues: ex ? issues.map((i) => i.id === d.id ? d : i) : [...issues, { ...d, id: uid() }] };
    });
    setEdit(null);
  };
  const delIssue = (id) => patch((m) => ({ ...m, issues: (m.issues || []).filter((i) => i.id !== id) }));

  if (!matter) return <Empty icon={Network} title="אין תיקים" sub="צרי תיק כדי לבנות אסטרטגיה" />;
  const issues = matter.issues || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <select className={inp + ' max-w-xs'} value={mid} onChange={(e) => setMid(e.target.value)}>{s.matters.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select>
        <button onClick={() => setEdit({ id: '', title: '', ourPosition: '', theirPosition: '', strength: 'בינונית', authIds: [] })} className="flex items-center gap-1 bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-indigo-700"><Plus size={16} /> פלוגתה</button>
      </div>

      {issues.length === 0 ? <Empty icon={Network} title="אין פלוגתות בתיק זה" sub="מיפוי פלוגתות ובניית עץ טיעון" /> : (
        <div className="space-y-3">
          {issues.map((iss) => (
            <Card key={iss.id} className="p-4">
              <div className="flex items-start justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Gavel size={15} className="text-indigo-500" /> {iss.title}</h3>
                <div className="flex items-center gap-2">
                  <Badge tone={iss.strength === 'גבוהה' ? 'emerald' : iss.strength === 'נמוכה' ? 'rose' : 'amber'}>{iss.strength}</Badge>
                  <button onClick={() => setEdit(iss)} className="p-1 text-slate-400 hover:text-indigo-600"><Edit3 size={14} /></button>
                  <button onClick={() => delIssue(iss.id)} className="p-1 text-slate-400 hover:text-rose-500"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3 mt-3">
                <div className="bg-emerald-50 rounded-lg p-3"><div className="text-[11px] font-bold text-emerald-700 mb-1">עמדתנו</div><p className="text-sm text-slate-700 whitespace-pre-wrap">{iss.ourPosition || '—'}</p></div>
                <div className="bg-rose-50 rounded-lg p-3"><div className="text-[11px] font-bold text-rose-700 mb-1">עמדת הצד שכנגד</div><p className="text-sm text-slate-700 whitespace-pre-wrap">{iss.theirPosition || '—'}</p></div>
              </div>
              {(iss.authIds || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {iss.authIds.map((aid) => { const a = s.authorities.find((x) => x.id === aid); return a ? <Badge key={aid} tone={a.status === 'verified' ? 'emerald' : 'amber'} icon={a.status === 'verified' ? ShieldCheck : ShieldAlert}>{a.citation}</Badge> : null; })}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      <IssueForm edit={edit} setEdit={setEdit} save={saveIssue} authorities={s.authorities} />
    </div>
  );
}

function IssueForm({ edit, setEdit, save, authorities }) {
  const [d, setD] = useState(edit);
  useEffect(() => setD(edit), [edit]);
  if (!d) return null;
  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));
  const toggleAuth = (id) => setD((p) => ({ ...p, authIds: p.authIds?.includes(id) ? p.authIds.filter((x) => x !== id) : [...(p.authIds || []), id] }));
  return (
    <Modal open={!!edit} onClose={() => setEdit(null)} title={d.id ? 'עריכת פלוגתה' : 'פלוגתה חדשה'} wide>
      <Field label="כותרת הפלוגתה"><input className={inp} value={d.title} onChange={(e) => set('title', e.target.value)} /></Field>
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="עמדתנו / קו הטיעון"><textarea className={inp + ' h-28'} value={d.ourPosition} onChange={(e) => set('ourPosition', e.target.value)} /></Field>
        <Field label="עמדת הצד שכנגד (צפויה)"><textarea className={inp + ' h-28'} value={d.theirPosition} onChange={(e) => set('theirPosition', e.target.value)} /></Field>
      </div>
      <Field label="הערכת חוזק"><select className={inp} value={d.strength} onChange={(e) => set('strength', e.target.value)}><option>גבוהה</option><option>בינונית</option><option>נמוכה</option></select></Field>
      <Field label="אסמכתאות תומכות">
        <div className="flex flex-wrap gap-2 max-h-32 overflow-auto">
          {authorities.map((a) => <button key={a.id} onClick={() => toggleAuth(a.id)} className={`text-[12px] rounded-lg px-2 py-1 border ${d.authIds?.includes(a.id) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200'}`}>{a.citation}</button>)}
        </div>
      </Field>
      <div className="flex justify-end gap-2 mt-2"><button onClick={() => setEdit(null)} className="px-4 py-2 text-sm text-slate-600">ביטול</button><button onClick={() => d.title && save(d)} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">שמירה</button></div>
    </Modal>
  );
}

/* ============================ הגדרות ============================ */
function Settings({ s, update, persistOk }) {
  const setFirm = (k, v) => update((p) => ({ ...p, firm: { ...p.firm, [k]: v } }));
  const exportAll = () => download(JSON.stringify(s, null, 2), `גיבוי-מערכת-סהר-${todayISO()}.json`, 'application/json');
  const wipe = () => { if (confirm('לאפס את כל הנתונים? פעולה זו אינה הפיכה.')) update(SEED()); };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Building2 size={16} /> פרטי המשרד ובלוק חתימה</h3>
        <div className="grid md:grid-cols-2 gap-x-4">
          <Field label="שם המשרד"><input className={inp} value={s.firm.name} onChange={(e) => setFirm('name', e.target.value)} /></Field>
          <Field label="שותפים"><input className={inp} value={s.firm.partners} onChange={(e) => setFirm('partners', e.target.value)} /></Field>
          <Field label="שם החותם/ת (לחתימה)"><input className={inp} value={s.firm.signer} onChange={(e) => setFirm('signer', e.target.value)} /></Field>
          <Field label="מען"><input className={inp} value={s.firm.address} onChange={(e) => setFirm('address', e.target.value)} /></Field>
          <Field label="טלפון"><input className={inp} value={s.firm.phone} onChange={(e) => setFirm('phone', e.target.value)} /></Field>
          <Field label="פקס"><input className={inp} value={s.firm.fax} onChange={(e) => setFirm('fax', e.target.value)} /></Field>
          <Field label='דוא"ל'><input className={inp} value={s.firm.email} onChange={(e) => setFirm('email', e.target.value)} /></Field>
        </div>
        <p className="text-[12px] text-slate-400">השדות המסומנים ⟦…⟧ ממתינים לפרטי המשרד המדויקים. מרגע שתמלאי — הם ננעלים כברירת מחדל בכל בלוק חתימה.</p>
      </Card>

      <Card className="p-5">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3"><Star size={16} /> תקן פורמט (נעול כברירת מחדל)</h3>
        <div className="flex flex-wrap gap-2">
          {['גופן David 12', 'ריווח שורות 1.5', 'שוליים 2.5 ס"מ', 'A4 · RTL', 'ללא קווי הפרדה'].map((x) => <Badge key={x} tone="indigo">{x}</Badge>)}
        </div>
        <p className="text-[12px] text-slate-400 mt-3">ייצוא המסמכים מיישם תקן זה. למסמך .docx מקורי — צינור ה-docx-js שלך (rightToLeft על כל TextRun, bidirectional על כל Paragraph).</p>
      </Card>

      <Card className="p-5">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3"><Save size={16} /> נתונים וגיבוי</h3>
        <div className="flex items-center gap-2 mb-3">
          <Badge tone={persistOk ? 'emerald' : 'rose'} icon={persistOk ? CheckCircle2 : AlertTriangle}>{persistOk ? 'שמירה מתמשכת פעילה' : 'שמירה לא זמינה — נתונים בזיכרון בלבד'}</Badge>
        </div>
        <p className="text-[12px] text-slate-500 mb-3">הנתונים נשמרים באחסון המקומי של הדפדפן (localStorage) במכשיר זה בלבד. למידע רגיש — מומלץ להזין placeholders ולמלא מזהים מקומית. גבי קובץ מעת לעת.</p>
        <div className="flex gap-2">
          <button onClick={exportAll} className="flex items-center gap-1 text-sm bg-slate-800 text-white rounded-lg px-4 py-2 hover:bg-slate-700"><Download size={14} /> ייצוא גיבוי JSON</button>
          <button onClick={wipe} className="flex items-center gap-1 text-sm bg-rose-50 text-rose-700 rounded-lg px-4 py-2 hover:bg-rose-100"><Trash2 size={14} /> איפוס מלא</button>
        </div>
      </Card>

      <Card className="p-5 bg-slate-50">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3"><Info size={16} /> אודות ומגבלות שקופות</h3>
        <ul className="text-[13px] text-slate-600 space-y-1.5 list-disc pr-5">
          <li>אין חיבור חי ל-נבו / תקדין / נט-המשפט. אימות סופי של כל אסמכתה נעשה אצלך.</li>
          <li>מחשבון המועדים אינו מנכה ימי פגרה (תקנה 179(ב)); מועדי ערעור מסומנים כטעוני אימות.</li>
          <li>ספירת העמודים במסמך היא הערכה לפי תווים — אינה תחליף לעימוד בפועל.</li>
          <li>שלד בקשות הביניים מסומן כטיוטה עד לחידודו מול מדגם אמיתי שתעלי.</li>
          <li>הגנת הסיסמה היא שכבה בסיסית בצד הלקוח בלבד (אין שרת/אימות אמיתי) — לגישה ממספר משתמשים/מכשירים יש לשדרג ל-backend עם אימות משתמשים.</li>
        </ul>
      </Card>
    </div>
  );
}

/* ============================ מסך כניסה (הגנת סיסמה בסיסית) ============================ */
function Login({ onSuccess }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);
  const expected = import.meta.env.VITE_APP_PASSWORD;

  const submit = (e) => {
    e.preventDefault();
    if (expected && pw === expected) {
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div dir="rtl" style={{ fontFamily: FONT }} className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="p-8 w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3"><Lock size={22} /></div>
          <h1 className="font-bold text-slate-800 text-lg">סהר ושות', עורכי דין</h1>
          <p className="text-sm text-slate-400 mt-1">מערכת ניהול ליטיגציה — גישה מוגבלת</p>
        </div>
        <form onSubmit={submit}>
          <Field label="סיסמה">
            <input
              type="password"
              autoFocus
              className={inp}
              value={pw}
              onChange={(e) => { setPw(e.target.value); setError(false); }}
            />
          </Field>
          {error && <p className="text-rose-600 text-xs mb-3">סיסמה שגויה</p>}
          {!expected && <p className="text-amber-600 text-xs mb-3">⟦VITE_APP_PASSWORD לא הוגדר בסביבת ההרצה⟧</p>}
          <button type="submit" className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-indigo-700 transition">כניסה</button>
        </form>
      </Card>
    </div>
  );
}

/* ============================ App (מסך עבודה) ============================ */
function LegalOS() {
  const { state, update, persistOk } = useStore();
  const [tab, setTab] = useState('dash');
  const [selMatter, setSelMatter] = useState(null);
  const go = (t, mid) => { setTab(t); if (mid) setSelMatter(mid); };

  if (!state) return <div className="h-screen flex items-center justify-center text-slate-400" style={{ fontFamily: FONT }}>טוען מערכת…</div>;

  return (
    <div dir="rtl" style={{ fontFamily: FONT }} className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen">
        <div className="px-5 py-5 border-b border-slate-700/50">
          <div className="flex items-center gap-2 text-white"><Scale size={22} className="text-indigo-400" /><div><div className="font-bold leading-none">{state.firm.name}</div><div className="text-[10px] text-slate-400 mt-1">מערכת ניהול ליטיגציה</div></div></div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {TABS.map((t) => { const Ic = t.icon; const on = tab === t.id; return (
            <button key={t.id} onClick={() => { setTab(t.id); if (t.id !== 'matters') setSelMatter(null); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${on ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}>
              <Ic size={17} /> {t.label}
            </button>
          ); })}
        </nav>
        <div className="p-3 text-[10px] text-slate-500 border-t border-slate-700/50">
          <Badge tone={persistOk ? 'emerald' : 'rose'}>{persistOk ? 'נשמר אוטומטית' : 'ללא שמירה'}</Badge>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <h1 className="font-bold text-slate-800 text-lg">{TABS.find((t) => t.id === tab)?.label}</h1>
          <div className="text-xs text-slate-400">{fmt(todayISO())}</div>
        </header>
        <div className="p-6 max-w-6xl mx-auto">
          {tab === 'dash' && <Dashboard s={state} go={go} />}
          {tab === 'matters' && <Matters s={state} update={update} sel={selMatter} setSel={setSelMatter} />}
          {tab === 'auth' && <Authorities s={state} update={update} />}
          {tab === 'docs' && <Documents s={state} update={update} />}
          {tab === 'strat' && <Strategy s={state} update={update} />}
          {tab === 'settings' && <Settings s={state} update={update} persistOk={persistOk} />}
        </div>
      </main>
    </div>
  );
}

/* ============================
   App הראשי — שער סיסמה בסיסי.
   מצב האימות (authed) נשמר אך ורק ב-state בזיכרון:
   לא נכתב ל-localStorage ולא מועבר ב-URL, כך שרענון דף מחזיר למסך הכניסה.
   ============================ */
export default function App() {
  const [authed, setAuthed] = useState(false);
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;
  return <LegalOS />;
}
