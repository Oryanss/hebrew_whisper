# התחלה מהירה — פלטפורמת ניהול תיקים משפטיים

## הדרך הקלה: לחיצה אחת (עם Docker)

1. התקינו [Docker Desktop](https://www.docker.com/products/docker-desktop/) (חינם) והפעילו אותו.
2. הפעילו:
   - **Windows**: לחיצה כפולה על `start.bat`
   - **Mac/Linux**: בטרמינל, מתיקיית הפרויקט: `./start.sh`
3. המתינו לסיום הבנייה (בפעם הראשונה: כמה דקות), ואז פתחו בדפדפן:
   **http://localhost:5173**
4. הירשמו (שם, דוא"ל, סיסמה) — והמערכת מוכנה לעבודה.

### הפעלת עוזר ה-AI (ניסוח ומחקר)

המערכת עובדת במלואה גם בלי מפתח — ניהול תיקים, לקוחות, מועדים, פגישות,
משימות, חיוב, חשבוניות, סיכונים ויומן. ניסוח טיוטות ומחקר משפטי דורשים
מפתח API של Anthropic (מ-https://console.anthropic.com):

- **Windows**: `set ANTHROPIC_API_KEY=sk-ant-...` ואז `start.bat`
- **Mac/Linux**: `ANTHROPIC_API_KEY="sk-ant-..." ./start.sh`

## התקנה ידנית (בלי Docker)

דרישות: Python 3.11+, Node.js 20+.

```bash
# טרמינל 1 - שרת
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export JWT_SECRET_KEY="ערך-אקראי-ארוך-כלשהו"
export ANTHROPIC_API_KEY="sk-ant-..."   # אופציונלי
python -m app.seed
uvicorn app.main:app --port 8000

# טרמינל 2 - ממשק
cd frontend
cp .env.example .env
npm install
npm run dev
```

ואז לגשת ל-http://localhost:5173.

## איפה הנתונים?

- ב-Docker: בנפח בשם `backend_data` — שורד עצירה והפעלה מחדש.
  `docker compose down -v` ימחק אותם (בכוונה בלבד!).
- בהתקנה ידנית: קובץ SQLite בתיקיית `backend/`.
- לייצור מומלץ PostgreSQL: הגדירו `DATABASE_URL=postgresql://...`.

## בעיות נפוצות

| תופעה | פתרון |
|--------|--------|
| "Docker אינו מותקן" | התקינו Docker Desktop והפעילו אותו לפני ההרצה |
| הניסוח מחזיר שגיאת ANTHROPIC_API_KEY | זו התנהגות מכוונת — הגדירו מפתח כמתואר לעיל |
| הפורט תפוס (5173/8000) | סגרו תוכנה אחרת שמשתמשת בפורט, או שנו פורט ב-docker-compose.yml |

## חשוב לזכור

> כל פלט AI (טיוטות, מחקר) הוא **טיוטה ראשונית בלבד** וטעון בדיקה, אימות
> מול מקור מהימן ואישור עורך דין מוסמך לפני כל שימוש. ראו את חוקת המערכת
> המלאה ב-`docs/constitution/`.
