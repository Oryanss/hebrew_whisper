def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_register_and_login(client):
    resp = client.post(
        "/api/auth/register",
        json={"full_name": "עו\"ד ראשון", "email": "lawyer1@example.com", "password": "Str0ngPass!23"},
    )
    assert resp.status_code == 201

    resp = client.post(
        "/api/auth/login", data={"username": "lawyer1@example.com", "password": "Str0ngPass!23"}
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()

    bad = client.post(
        "/api/auth/login", data={"username": "lawyer1@example.com", "password": "wrong"}
    )
    assert bad.status_code == 401


def test_endpoints_require_auth(client):
    resp = client.get("/api/cases")
    assert resp.status_code == 401


def test_client_and_case_lifecycle(client, auth_headers):
    resp = client.post(
        "/api/clients", json={"full_name": "ישראל ישראלי"}, headers=auth_headers
    )
    assert resp.status_code == 201
    client_id = resp.json()["id"]

    resp = client.post(
        "/api/cases",
        json={
            "case_number": "T-0001",
            "title": "תיק בדיקה",
            "practice_area": "חוזים",
            "client_id": client_id,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    case_id = resp.json()["id"]

    # duplicate case number should be rejected
    dup = client.post(
        "/api/cases",
        json={"case_number": "T-0001", "title": "כפילות", "client_id": client_id},
        headers=auth_headers,
    )
    assert dup.status_code == 400

    resp = client.get(f"/api/cases/{case_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "תיק בדיקה"


def test_draft_without_api_key_returns_503(client, auth_headers):
    client_resp = client.post(
        "/api/clients", json={"full_name": "לקוח לטיוטה"}, headers=auth_headers
    )
    client_id = client_resp.json()["id"]
    case_resp = client.post(
        "/api/cases",
        json={"case_number": "T-DRAFT-1", "title": "תיק לטיוטה", "client_id": client_id},
        headers=auth_headers,
    )
    case_id = case_resp.json()["id"]

    resp = client.post(
        f"/api/cases/{case_id}/draft",
        json={"doc_type": "מכתב התראה", "title": "מכתב", "instructions": "כתוב מכתב קצר"},
        headers=auth_headers,
    )
    assert resp.status_code == 503
    assert "ANTHROPIC_API_KEY" in resp.json()["detail"]


def test_citation_audit_missing_document_404s(client, auth_headers):
    resp = client.post("/api/documents/999999/audit-citations", headers=auth_headers)
    assert resp.status_code == 404


def test_citation_audit_flags_unverified_and_matches_verified(client, auth_headers):
    from app.database import SessionLocal
    from app import models

    client_resp = client.post(
        "/api/clients", json={"full_name": "לקוח לבדיקת אסמכתאות"}, headers=auth_headers
    )
    client_id = client_resp.json()["id"]
    case_resp = client.post(
        "/api/cases",
        json={"case_number": "T-AUDIT-1", "title": "תיק אסמכתאות", "client_id": client_id},
        headers=auth_headers,
    )
    case_id = case_resp.json()["id"]

    verified_citation = 'ע"א 1234/20'
    auth_resp = client.post(
        "/api/authorities",
        json={
            "citation_text": verified_citation,
            "source_type": "case_law",
            "source_database": "נבו",
            "case_id": case_id,
        },
        headers=auth_headers,
    )
    assert auth_resp.status_code == 201

    # Documents are normally only created via the /draft endpoint (which
    # requires a live LLM key); insert one directly here to exercise the
    # audit logic in isolation.
    db = SessionLocal()
    try:
        doc = models.Document(
            title="טיוטה לבדיקה",
            doc_type="מכתב",
            content=(
                'כפי שנקבע בע"א 1234/20 בפסק דין קודם, וכן ע"א 9999/99 שלא אומת מעולם.'
            ),
            case_id=case_id,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        document_id = doc.id
    finally:
        db.close()

    resp = client.post(f"/api/documents/{document_id}/audit-citations", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    citations = {f["citation_text"]: f["verified"] for f in body["findings"]}
    assert citations['ע"א 1234/20'] is True
    assert citations['ע"א 9999/99'] is False
    assert body["unverified_count"] == 1
