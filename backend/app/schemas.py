from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, ConfigDict, Field

from .models import UserRole, CaseStatus, DocumentStatus, AuthoritySourceDb, DeadlineStatus, RiskCategory


# --- Auth ---
class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.LAWYER


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    full_name: str
    email: EmailStr
    role: UserRole


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# --- Client ---
class ClientCreate(BaseModel):
    full_name: str
    id_number: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class ClientUpdate(ClientCreate):
    full_name: Optional[str] = None


class ClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    full_name: str
    id_number: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime


# --- Case ---
class CaseCreate(BaseModel):
    case_number: str
    title: str
    case_type: Optional[str] = None
    practice_area: Optional[str] = None
    court: Optional[str] = None
    status: CaseStatus = CaseStatus.OPEN
    description: Optional[str] = None
    client_id: int


class CaseUpdate(BaseModel):
    title: Optional[str] = None
    case_type: Optional[str] = None
    practice_area: Optional[str] = None
    court: Optional[str] = None
    status: Optional[CaseStatus] = None
    description: Optional[str] = None


class CaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    case_number: str
    title: str
    case_type: Optional[str] = None
    practice_area: Optional[str] = None
    court: Optional[str] = None
    status: CaseStatus
    description: Optional[str] = None
    opened_date: datetime
    client_id: int


# --- Authority (verified citation bank) ---
class AuthorityCreate(BaseModel):
    citation_text: str
    source_type: str
    source_database: AuthoritySourceDb = AuthoritySourceDb.OTHER
    summary: Optional[str] = None
    reference_url: Optional[str] = None
    verified_by: Optional[str] = None
    notes: Optional[str] = None
    case_id: Optional[int] = None


class AuthorityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    citation_text: str
    source_type: str
    source_database: AuthoritySourceDb
    summary: Optional[str] = None
    reference_url: Optional[str] = None
    verified_by: Optional[str] = None
    verified_at: datetime
    notes: Optional[str] = None
    case_id: Optional[int] = None


class CitationFinding(BaseModel):
    citation_text: str
    verified: bool
    matched_authority_id: Optional[int] = None


class CitationAuditResult(BaseModel):
    findings: list[CitationFinding]
    unverified_count: int


# --- Deadline ---
class DeadlineCreate(BaseModel):
    title: str
    due_date: datetime
    description: Optional[str] = None
    status: DeadlineStatus = DeadlineStatus.PENDING


class DeadlineUpdate(BaseModel):
    title: Optional[str] = None
    due_date: Optional[datetime] = None
    description: Optional[str] = None
    status: Optional[DeadlineStatus] = None


class DeadlineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    due_date: datetime
    description: Optional[str] = None
    status: DeadlineStatus
    created_at: datetime
    case_id: int


class DeadlineWithCaseOut(DeadlineOut):
    case_title: str
    case_number: str


# --- Time & billing ---
class TimeEntryCreate(BaseModel):
    description: str
    entry_date: datetime
    hours: float
    hourly_rate: Optional[float] = None
    billable: bool = True


class TimeEntryUpdate(BaseModel):
    description: Optional[str] = None
    entry_date: Optional[datetime] = None
    hours: Optional[float] = None
    hourly_rate: Optional[float] = None
    billable: Optional[bool] = None


class TimeEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    description: str
    entry_date: datetime
    hours: float
    hourly_rate: Optional[float] = None
    billable: bool
    created_at: datetime
    case_id: int


class BillingSummary(BaseModel):
    total_hours: float
    billable_hours: float
    total_billable_amount: float
    entries_missing_rate: int


# --- Case notes / timeline ---
class CaseNoteCreate(BaseModel):
    content: str


class CaseNoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    content: str
    created_by: Optional[str] = None
    created_at: datetime
    case_id: int


# --- Knowledge library ---
class KnowledgeDocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    category: str
    source_filename: Optional[str] = None
    uploaded_by: Optional[str] = None
    created_at: datetime


class KnowledgeDocumentDetail(KnowledgeDocumentOut):
    content: str


class KnowledgeSearchResult(BaseModel):
    id: int
    title: str
    category: str
    snippet: str


# --- Legal research ---
class LegalResearchRequest(BaseModel):
    query: str
    use_knowledge_library: bool = True


class ResearchSource(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None


class LegalResearchResult(BaseModel):
    answer: str
    web_sources: list[ResearchSource]
    knowledge_references: list[KnowledgeDocumentOut]


# --- Risk assessment ---
class RiskAssessmentCreate(BaseModel):
    category: RiskCategory = RiskCategory.OTHER
    description: str
    severity: int = Field(ge=1, le=5)
    likelihood: int = Field(ge=1, le=5)
    mitigating_factors: Optional[str] = None


class RiskAssessmentOut(BaseModel):
    id: int
    category: RiskCategory
    description: str
    severity: int
    likelihood: int
    risk_score: int
    risk_level: str
    recommended_action: str
    mitigating_factors: Optional[str] = None
    assessed_by: Optional[str] = None
    created_at: datetime
    case_id: int


# --- Template ---
class TemplateCreate(BaseModel):
    name: str
    doc_type: str
    description: Optional[str] = None
    prompt_instructions: str
    structure_outline: Optional[str] = None


class TemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    doc_type: str
    description: Optional[str] = None
    prompt_instructions: str
    structure_outline: Optional[str] = None


# --- Document ---
class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    doc_type: str
    content: str
    status: DocumentStatus
    generation_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    case_id: int
    template_id: Optional[int] = None


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    status: Optional[DocumentStatus] = None


class DraftRequest(BaseModel):
    template_id: Optional[int] = None
    doc_type: str
    title: str
    instructions: str
