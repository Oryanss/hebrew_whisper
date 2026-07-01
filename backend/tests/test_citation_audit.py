from app.citation_audit import find_citation_candidates


def test_finds_case_citation():
    text = 'כפי שנקבע בע"א 1234/20 פלוני נ׳ אלמוני.'
    candidates = find_citation_candidates(text)
    assert 'ע"א 1234/20' in candidates


def test_finds_statute_citation():
    text = 'ראו סעיף 12 לחוק החוזים (חלק כללי), התשל"ג-1973.'
    candidates = find_citation_candidates(text)
    assert any("סעיף 12" in c for c in candidates)


def test_no_false_positive_on_plain_text():
    text = "זהו טקסט רגיל ללא אסמכתאות משפטיות כלשהן."
    assert find_citation_candidates(text) == []
