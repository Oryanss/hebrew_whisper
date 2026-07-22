# מערכת ניהול ליטיגציה — סהר ושות'

אפליקציית React (Vite + Tailwind + lucide-react) לניהול תיקים, אסמכתאות, עריכת מסמכים ומחקר משפטי.
כל הנתונים נשמרים מקומית בדפדפן (`localStorage`) — אין שרת/backend. שכבת הסיסמה היא הגנה בסיסית בצד הלקוח בלבד.

## הרצה מקומית

```bash
npm install
cp .env.example .env.local   # ומלאו VITE_APP_PASSWORD
npm run dev
```

## בנייה

```bash
npm run build   # פלט לתיקיית dist/
npm run preview # הרצת פלט הבנייה מקומית
```

## משתנה סביבה

| שם | תיאור |
|---|---|
| `VITE_APP_PASSWORD` | הסיסמה למסך הכניסה. חובה בזמן build/dev. |

**חשוב:** מדובר באתר סטטי ללא backend — `VITE_APP_PASSWORD` מוטמע בקובץ ה-JS הסופי בזמן ה-build, ולכן אינו סוד אמיתי (ניתן לחלץ אותו מבדיקת קוד המקור בדפדפן). זו שכבת הגנה בסיסית בלבד ("שלב ראשון") למניעת גישה מזדמנת, לא הגנת אבטחה מלאה. מצב ההתחברות (`authed`) נשמר רק ב-state של React בזיכרון — לא ב-`localStorage` ולא ב-URL — כך שרענון דף מחזיר למסך הכניסה.

לגישה מבוססת משתמשים אמיתית (ריבוי משתמשים/מכשירים, הרשאות) יש לשדרג ל-backend עם אימות אמיתי.

## פריסה ל-Vercel

1. היכנסו ל-[vercel.com](https://vercel.com) → **Add New Project** → ייבוא מ-GitHub.
2. בחרו את ה-repo וקבעו **Root Directory** = `legal-management-system` (הפרויקט נמצא בתת-תיקייה, לא בשורש ה-repo).
3. Framework Preset: **Vite** (מזוהה אוטומטית).
4. תחת **Environment Variables** הוסיפו `VITE_APP_PASSWORD` עם הסיסמה הרצויה.
5. Deploy.

## פריסה ל-Netlify

1. **Add new site** → **Import an existing project** → GitHub → בחרו את ה-repo.
2. **Base directory**: `legal-management-system`
3. **Build command**: `npm run build`
4. **Publish directory**: `legal-management-system/dist`
5. תחת **Site settings → Environment variables** הוסיפו `VITE_APP_PASSWORD`.
6. Deploy site.
