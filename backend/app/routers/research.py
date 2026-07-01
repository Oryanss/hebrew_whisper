from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .. import models, schemas, security
from ..database import get_db
from ..llm.client import LLMNotConfiguredError, generate_research
from ..llm.research_prompts import build_research_prompt

router = APIRouter(
    prefix="/api/legal-research", tags=["research"], dependencies=[Depends(security.get_current_user)]
)

MAX_KNOWLEDGE_SNIPPETS = 5
SNIPPET_LENGTH = 800


@router.post("", response_model=schemas.LegalResearchResult)
def run_legal_research(research_in: schemas.LegalResearchRequest, db: Session = Depends(get_db)):
    knowledge_snippets: list[str] = []
    referenced_docs: list[models.KnowledgeDocument] = []
    if research_in.use_knowledge_library:
        terms = [t for t in research_in.query.split() if len(t) > 2]
        if terms:
            filters = [
                or_(
                    models.KnowledgeDocument.title.contains(t),
                    models.KnowledgeDocument.content.contains(t),
                )
                for t in terms
            ]
            referenced_docs = (
                db.query(models.KnowledgeDocument)
                .filter(or_(*filters))
                .order_by(models.KnowledgeDocument.created_at.desc())
                .limit(MAX_KNOWLEDGE_SNIPPETS)
                .all()
            )
            knowledge_snippets = [
                f"[{doc.title}]\n{doc.content[:SNIPPET_LENGTH]}" for doc in referenced_docs
            ]

    prompt = build_research_prompt(research_in.query, knowledge_snippets)

    try:
        answer, sources = generate_research(prompt)
    except LLMNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    return schemas.LegalResearchResult(
        answer=answer,
        web_sources=[schemas.ResearchSource(**s) for s in sources],
        knowledge_references=referenced_docs,
    )
