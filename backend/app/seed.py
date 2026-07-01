"""Seed the database with a starter set of Israeli legal document templates.

Run with: python -m app.seed
"""
from .database import SessionLocal, engine
from . import models

DEFAULT_TEMPLATES = [
    {
        "name": "כתב תביעה אזרחי",
        "doc_type": "כתב תביעה",
        "description": "תבנית כללית לכתב תביעה בהליך אזרחי",
        "prompt_instructions": (
            "נסח כתב תביעה הכולל: פרטי הצדדים, העובדות הרלוונטיות בסדר כרונולוגי, "
            "העילות המשפטיות, הנזק/הסעד המבוקש, וסעיף סיכום עם הסעדים המבוקשים בפירוט."
        ),
        "structure_outline": (
            "1. פרטי בית המשפט והצדדים\n2. הקדמה ותמצית התביעה\n3. העובדות\n"
            "4. העילות המשפטיות\n5. הנזק והסעדים המבוקשים\n6. סוף דבר וחתימה"
        ),
    },
    {
        "name": "כתב הגנה",
        "doc_type": "כתב הגנה",
        "description": "תבנית כללית לכתב הגנה בתגובה לכתב תביעה",
        "prompt_instructions": (
            "נסח כתב הגנה המתייחס לכל סעיפי כתב התביעה, כולל הודאה/הכחשה מפורטת, "
            "טענות סף אם רלוונטיות, והצגת הגרסה העובדתית של הנתבע."
        ),
        "structure_outline": (
            "1. טענות סף (אם קיימות)\n2. מענה לעובדות הנטענות סעיף אחר סעיף\n"
            "3. הגרסה העובדתית של הנתבע\n4. טענות משפטיות\n5. סוף דבר"
        ),
    },
    {
        "name": "מכתב התראה טרם נקיטת הליכים",
        "doc_type": "מכתב התראה",
        "description": "מכתב דרישה/התראה לפני פתיחת הליך משפטי",
        "prompt_instructions": (
            "נסח מכתב התראה רשמי וברור הכולל את הרקע העובדתי, הדרישה הקונקרטית, "
            "מועד לביצוע, והתראה מפורשת בדבר נקיטת הליכים משפטיים במקרה של אי היענות."
        ),
        "structure_outline": "1. פתיח ופרטי הפונה\n2. רקע עובדתי\n3. דרישה ומועד\n4. התראה\n5. חתימה",
    },
    {
        "name": "חוות דעת משפטית פנימית",
        "doc_type": "חוות דעת",
        "description": "ניתוח וחוות דעת משפטית ראשונית לצוות התיק",
        "prompt_instructions": (
            "נתח את המצב המשפטי, הצג את השאלות המשפטיות המרכזיות, יתרונות וסיכונים, "
            "והמלצה מעשית להמשך הטיפול בתיק. סמן כל מקום שדורש אימות אסמכתא נוספת."
        ),
        "structure_outline": "1. תקציר מנהלים\n2. השאלה המשפטית\n3. ניתוח\n4. סיכונים\n5. המלצה",
    },
]


def seed():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing_names = {t.name for t in db.query(models.Template).all()}
        for template in DEFAULT_TEMPLATES:
            if template["name"] in existing_names:
                continue
            db.add(models.Template(**template))
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
    print("Seed complete.")
