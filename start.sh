#!/usr/bin/env bash
# הפעלה בלחיצה אחת של פלטפורמת ניהול התיקים (Mac/Linux).
# דורש Docker Desktop מותקן ופועל. לאחר העלייה:
#   ממשק:  http://localhost:5173
#   API:    http://localhost:8000
set -e
cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker אינו מותקן. יש להתקין Docker Desktop מ-https://www.docker.com/products/docker-desktop/"
  echo "לחלופין ראו הוראות התקנה ידנית ב-QUICKSTART.md"
  exit 1
fi

if [ -n "$ANTHROPIC_API_KEY" ]; then
  echo "מפתח Anthropic זוהה - עוזר הניסוח והמחקר יהיו פעילים."
else
  echo "אזהרה: ANTHROPIC_API_KEY לא הוגדר - המערכת תעבוד במלואה מלבד ניסוח AI ומחקר,"
  echo "שיחזירו שגיאה מוסברת. להפעלה מלאה: ANTHROPIC_API_KEY=\"sk-ant-...\" ./start.sh"
fi

docker compose up --build
