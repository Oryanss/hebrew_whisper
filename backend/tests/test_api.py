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


def test_deadline_lifecycle_and_upcoming(client, auth_headers):
    from datetime import datetime, timedelta

    client_resp = client.post(
        "/api/clients", json={"full_name": "לקוח למועדים"}, headers=auth_headers
    )
    client_id = client_resp.json()["id"]
    case_resp = client.post(
        "/api/cases",
        json={"case_number": "T-DEADLINE-1", "title": "תיק מועדים", "client_id": client_id},
        headers=auth_headers,
    )
    case_id = case_resp.json()["id"]

    near_due = (datetime.utcnow() + timedelta(days=3)).isoformat()
    far_due = (datetime.utcnow() + timedelta(days=90)).isoformat()

    near = client.post(
        f"/api/cases/{case_id}/deadlines",
        json={"title": "הגשת כתב הגנה", "due_date": near_due},
        headers=auth_headers,
    )
    assert near.status_code == 201
    far = client.post(
        f"/api/cases/{case_id}/deadlines",
        json={"title": "דיון מקדמי", "due_date": far_due},
        headers=auth_headers,
    )
    assert far.status_code == 201

    listed = client.get(f"/api/cases/{case_id}/deadlines", headers=auth_headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 2

    upcoming = client.get("/api/deadlines/upcoming?days=14", headers=auth_headers)
    assert upcoming.status_code == 200
    titles = [d["title"] for d in upcoming.json()]
    assert "הגשת כתב הגנה" in titles
    assert "דיון מקדמי" not in titles

    deadline_id = near.json()["id"]
    updated = client.patch(
        f"/api/deadlines/{deadline_id}", json={"status": "completed"}, headers=auth_headers
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "completed"

    upcoming_after = client.get("/api/deadlines/upcoming?days=14", headers=auth_headers)
    assert "הגשת כתב הגנה" not in [d["title"] for d in upcoming_after.json()]


def test_time_entries_and_billing_summary(client, auth_headers):
    client_resp = client.post(
        "/api/clients", json={"full_name": "לקוח לחיוב שעות"}, headers=auth_headers
    )
    client_id = client_resp.json()["id"]
    case_resp = client.post(
        "/api/cases",
        json={"case_number": "T-BILLING-1", "title": "תיק חיוב שעות", "client_id": client_id},
        headers=auth_headers,
    )
    case_id = case_resp.json()["id"]

    billable_with_rate = client.post(
        f"/api/cases/{case_id}/time-entries",
        json={
            "description": "ניסוח כתב תביעה",
            "entry_date": "2026-06-01T09:00:00",
            "hours": 3,
            "hourly_rate": 500,
            "billable": True,
        },
        headers=auth_headers,
    )
    assert billable_with_rate.status_code == 201

    billable_without_rate = client.post(
        f"/api/cases/{case_id}/time-entries",
        json={
            "description": "שיחת טלפון עם הלקוח",
            "entry_date": "2026-06-02T09:00:00",
            "hours": 1,
            "billable": True,
        },
        headers=auth_headers,
    )
    assert billable_without_rate.status_code == 201

    non_billable = client.post(
        f"/api/cases/{case_id}/time-entries",
        json={
            "description": "מחקר פנימי",
            "entry_date": "2026-06-03T09:00:00",
            "hours": 2,
            "hourly_rate": 500,
            "billable": False,
        },
        headers=auth_headers,
    )
    assert non_billable.status_code == 201

    listed = client.get(f"/api/cases/{case_id}/time-entries", headers=auth_headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 3

    summary = client.get(f"/api/cases/{case_id}/billing-summary", headers=auth_headers)
    assert summary.status_code == 200
    body = summary.json()
    assert body["total_hours"] == 6
    assert body["billable_hours"] == 4
    assert body["total_billable_amount"] == 1500  # only the 3h @ 500 entry has a rate
    assert body["entries_missing_rate"] == 1  # the billable entry without a rate

    entry_id = billable_without_rate.json()["id"]
    patched = client.patch(
        f"/api/time-entries/{entry_id}", json={"hourly_rate": 400}, headers=auth_headers
    )
    assert patched.status_code == 200

    summary_after = client.get(f"/api/cases/{case_id}/billing-summary", headers=auth_headers)
    body_after = summary_after.json()
    assert body_after["total_billable_amount"] == 1900  # 1500 + 1h @ 400
    assert body_after["entries_missing_rate"] == 0
