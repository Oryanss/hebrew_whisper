"""Legal risk scoring: a severity x likelihood matrix, each rated 1-5, with
the resulting score banded into four escalation levels. This is a standard,
widely-used risk-management framework (not proprietary to any one source);
the exact banding and escalation wording here are original to this project.
"""

SEVERITY_LABELS = {
    1: "זניח",
    2: "נמוך",
    3: "בינוני",
    4: "גבוה",
    5: "קריטי",
}

LIKELIHOOD_LABELS = {
    1: "רחוק",
    2: "לא סביר",
    3: "אפשרי",
    4: "סביר",
    5: "כמעט ודאי",
}

RECOMMENDED_ACTION = {
    "green": "סיכון נמוך - לתעד ולעקוב במסגרת סקירה תקופתית רגילה. אין צורך בהסלמה.",
    "yellow": (
        "סיכון בינוני - למנות אחראי מעקב, לגבש צעדי צמצום סיכון ולעדכן בעלי עניין רלוונטיים. "
        "לעקוב באופן פעיל ולהגדיר תנאים שיחייבו הסלמה."
    ),
    "orange": (
        "סיכון גבוה - להעלות לעורך דין בכיר, לגבש תכנית צמצום סיכון מפורטת, ולשקול ליווי "
        "משפטי חיצוני. לעקוב בתדירות גבוהה (שבועית לפחות)."
    ),
    "red": (
        "סיכון קריטי - הסלמה מיידית לדרג הבכיר ביותר במשרד/בארגון, ליווי משפטי חיצוני מיידי, "
        "ובחינת הפעלת נהלי ניהול משבר. מעקב יומי עד לצמצום הסיכון."
    ),
}


def compute_risk_score(severity: int, likelihood: int) -> int:
    return severity * likelihood


def compute_risk_level(score: int) -> str:
    if score <= 4:
        return "green"
    if score <= 9:
        return "yellow"
    if score <= 15:
        return "orange"
    return "red"


def recommended_action(level: str) -> str:
    return RECOMMENDED_ACTION[level]
