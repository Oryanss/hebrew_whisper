SYSTEM_PROMPT = """\
אתה עוזר ניסוח משפטי הפועל במסגרת פלטפורמת ניהול תיקים של עורך דין בישראל.
תפקידך לייצר טיוטת מסמך משפטי ראשונית בלבד, אשר תיבדק, תתוקן ותאושר על ידי \
עורך דין מוסמך לפני כל שימוש בפועל.

כללי עבודה מחייבים:
1. כתוב עברית משפטית תקנית, ברורה ומדויקת, בהתאם למבנה המקובל למסמך המבוקש \
   (למשל: כתב תביעה, כתב הגנה, חוות דעת, מכתב התראה, הסכם).
2. אל תמציא עובדות, תאריכים, סכומים או פרטים שלא נמסרו לך בהקשר התיק או בהנחיות. \
   במקום פרט חסר, סמן זאת בבירור בסוגריים מרובעים, למשל: [להשלים: סכום התביעה].
3. לעולם אל תמציא אסמכתאות משפטיות - פסיקה, חקיקה, תקנות, מספרי הליכים, שמות תיקים \
   או ציטוטים. אתה רשאי לצטט אסמכתה רק אם היא מופיעה במפורש ברשימת "אסמכתאות מאומתות" \
   שתסופק לך בהקשר. אם נדרשת אסמכתה שאינה ברשימה, אל תנחש ואל תמציא - סמן זאת בבירור \
   כ-[לאמת אסמכתא: תיאור הנושא] והשאר את מקומה לעורך הדין להשלים לאחר אימות עצמאי \
   במאגר משפטי מוסמך (למשל נבו, תקדין, רשומות).
4. הוסף בסוף כל מסמך הערה קצרה: "טיוטה שנוצרה בסיוע בינה מלאכותית - טעונה בדיקה, \
   השלמה ואישור של עורך דין מוסמך לפני שימוש."
5. שים לב לפערים או לסתירות אפשריות בעובדות שנמסרו, וציין אותם בסעיף הערות בסוף \
   הטיוטה אם קיימים.
"""

# Practice-area legal framework anchors: short, factual pointers to the
# relevant Israeli statutes for a given practice area. These are provided to
# the model as background *anchors only* - they do not substitute for the
# verified authority bank and must still be confirmed against a reliable
# source before being cited in an actual filing.
PRACTICE_AREA_ANCHORS: dict[str, str] = {
    "חוזים": (
        "חוק החוזים (חלק כללי), התשל\"ג-1973 - חובת תום לב במשא ומתן ובקיום חוזה "
        "(סעיפים 12, 39); כללי פרשנות חוזה (סעיף 25). "
        "חוק החוזים (תרופות בשל הפרת חוזה), התשל\"א-1970 - סעדים בגין הפרת חוזה."
    ),
    "נזיקין": (
        "פקודת הנזיקין [נוסח חדש] - עוולות הרשלנות, התרמית והפרת חובה חקוקה."
    ),
    "מקרקעין": (
        "חוק המקרקעין, התשכ\"ט-1969 - זכויות במקרקעין ורישום."
    ),
    "דיני עבודה": (
        "חוק הגנת השכר, התשי\"ח-1958; חוק פיצויי פיטורים, התשכ\"ג-1963."
    ),
    "משפחה": (
        "חוק יחסי ממון בין בני זוג, התשל\"ג-1973; חוק הכשרות המשפטית והאפוטרופסות, "
        "התשכ\"ב-1962."
    ),
    "חברות": (
        "חוק החברות, התשנ\"ט-1999 - חובות נושאי משרה ואורגנים."
    ),
    "פרטיות": (
        "חוק הגנת הפרטיות, התשמ\"א-1981, לרבות תיקוני האכיפה המנהלית."
    ),
    "סדר דין אזרחי": (
        "תקנות סדר הדין האזרחי, התשע\"ט-2018."
    ),
}


def build_user_prompt(
    *,
    client_name: str,
    case_title: str,
    case_type: str | None,
    practice_area: str | None,
    court: str | None,
    case_description: str | None,
    doc_type: str,
    doc_title: str,
    template_instructions: str | None,
    structure_outline: str | None,
    user_instructions: str,
    verified_authorities: list[str] | None = None,
) -> str:
    parts = [
        f"סוג המסמך המבוקש: {doc_type}",
        f"כותרת המסמך: {doc_title}",
        f"שם הלקוח/ה: {client_name}",
        f"כותרת התיק: {case_title}",
    ]
    if case_type:
        parts.append(f"סוג התיק: {case_type}")
    if court:
        parts.append(f"ערכאה: {court}")
    if case_description:
        parts.append(f"תיאור/רקע עובדתי של התיק:\n{case_description}")
    if practice_area:
        anchor = PRACTICE_AREA_ANCHORS.get(practice_area)
        if anchor:
            parts.append(
                f"תחום עיסוק: {practice_area}. עוגן משפטי כללי לתחום (לעיון בלבד, "
                f"טעון אימות עצמאי לפני ציטוט):\n{anchor}"
            )
    if template_instructions:
        parts.append(f"הנחיות תבנית קבועות למסמך מסוג זה:\n{template_instructions}")
    if structure_outline:
        parts.append(f"מבנה מומלץ למסמך:\n{structure_outline}")
    if verified_authorities:
        joined = "\n".join(f"- {a}" for a in verified_authorities)
        parts.append(
            "אסמכתאות מאומתות זמינות לציטוט בתיק זה (מותר לצטט רק מתוך רשימה זו):\n"
            f"{joined}"
        )
    else:
        parts.append(
            "לא סופקו אסמכתאות מאומתות לתיק זה - אין לצטט שום פסיקה, חקיקה או תקנה "
            "קונקרטית; יש לסמן כל מקום הדורש אסמכתה כ-[לאמת אסמכתא: ...]."
        )
    parts.append(f"הנחיות ספציפיות לטיוטה זו מעורך הדין:\n{user_instructions}")
    parts.append("צור כעת את טיוטת המסמך המלאה בעברית, בהתאם לכל הכללים וההנחיות לעיל.")
    return "\n\n".join(parts)
