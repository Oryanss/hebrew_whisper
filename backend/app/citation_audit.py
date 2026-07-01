import re
from typing import List

# Patterns for common Israeli legal citation shapes: court-decision references
# (e.g. ע"א 1234/20, בג"ץ 5100/94, ת"א (ת"א) 456-07-19) and statute/section
# references (e.g. סעיף 12 לחוק החוזים (חלק כללי), התשל"ג-1973).
_CASE_CITATION = re.compile(
    r"""(?:בג"?צ|ע"?א|ע"?פ|רע"?א|רע"?פ|ה"?פ|ת"?א|תא"?מ|בש"?א|עע"?ם|דנ"?א)\s*
        (?:\([^)]{0,20}\)\s*)?
        \d{1,6}[-/]\d{1,4}(?:[-/]\d{1,2})?""",
    re.VERBOSE,
)

_STATUTE_CITATION = re.compile(
    r"""(?:סעיף|ס['\"]?)\s*\d+[א-ת]?\s*ל?חוק\s+[^,.\n]{2,60}?,?\s*התש[א-ת]"[א-ת]-\d{4}"""
)

_STATUTE_NAME_ONLY = re.compile(r"""חוק\s+[^,.\n]{2,60}?,?\s*התש[א-ת]"[א-ת]-\d{4}""")


def find_citation_candidates(text: str) -> List[str]:
    """Scan drafted document text for strings that look like legal citations,
    so they can be cross-checked against the verified authority bank before
    a lawyer relies on the draft."""
    candidates = set()
    for pattern in (_CASE_CITATION, _STATUTE_CITATION, _STATUTE_NAME_ONLY):
        for match in pattern.finditer(text):
            candidates.add(match.group(0).strip())
    return sorted(candidates)
