import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .database import engine
from .routers import auth, authorities, cases, clients, deadlines, documents, drafting, templates

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Legal Case Management Platform API",
    description=(
        "API לניהול תיקים משפטיים וסיוע בניסוח מסמכים. "
        "כלי עזר לעורך דין - כל פלט הכולל ניתוח או ניסוח משפטי טעון בדיקה ואישור אנושי."
    ),
    version="0.1.0",
)

allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(cases.router)
app.include_router(templates.router)
app.include_router(documents.router)
app.include_router(drafting.router)
app.include_router(authorities.router)
app.include_router(authorities.audit_router)
app.include_router(deadlines.router)
app.include_router(deadlines.standalone_router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
