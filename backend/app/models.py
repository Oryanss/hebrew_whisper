import enum
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Enum,
    Float,
    Boolean,
)
from sqlalchemy.orm import relationship

from .database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    LAWYER = "lawyer"
    PARALEGAL = "paralegal"


class CaseStatus(str, enum.Enum):
    OPEN = "open"
    PENDING = "pending"
    CLOSED = "closed"


class DocumentStatus(str, enum.Enum):
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    FINAL = "final"


class DeadlineStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    MISSED = "missed"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"


class MeetingType(str, enum.Enum):
    CLIENT_MEETING = "client_meeting"
    COURT_HEARING = "court_hearing"
    DEPOSITION = "deposition"
    INTERNAL = "internal"
    OTHER = "other"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.LAWYER, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    id_number = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    address = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    cases = relationship("Case", back_populates="client", cascade="all, delete-orphan")


class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    case_type = Column(String, nullable=True)
    practice_area = Column(String, nullable=True)
    court = Column(String, nullable=True)
    status = Column(Enum(CaseStatus), default=CaseStatus.OPEN, nullable=False)
    description = Column(Text, nullable=True)
    opened_date = Column(DateTime, default=datetime.utcnow)

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    client = relationship("Client", back_populates="cases")

    documents = relationship("Document", back_populates="case", cascade="all, delete-orphan")
    authorities = relationship("Authority", back_populates="case", cascade="all, delete-orphan")
    deadlines = relationship("Deadline", back_populates="case", cascade="all, delete-orphan")
    time_entries = relationship("TimeEntry", back_populates="case", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="case", cascade="all, delete-orphan")
    notes = relationship(
        "CaseNote", back_populates="case", cascade="all, delete-orphan", order_by="CaseNote.created_at"
    )
    risk_assessments = relationship(
        "RiskAssessment", back_populates="case", cascade="all, delete-orphan"
    )
    tasks = relationship("Task", back_populates="case", cascade="all, delete-orphan")
    meetings = relationship("Meeting", back_populates="case", cascade="all, delete-orphan")


class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    doc_type = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    prompt_instructions = Column(Text, nullable=False)
    structure_outline = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    doc_type = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    status = Column(Enum(DocumentStatus), default=DocumentStatus.DRAFT, nullable=False)
    generation_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    case = relationship("Case", back_populates="documents")

    template_id = Column(Integer, ForeignKey("templates.id"), nullable=True)


class AuthoritySourceDb(str, enum.Enum):
    NEVO = "נבו"
    TAKDIN = "תקדין"
    RESHUMOT = "רשומות"
    LAWDATA = "לשכת עורכי הדין"
    COURT_WEBSITE = "אתר בתי המשפט"
    OTHER = "אחר"


class Authority(Base):
    """A legal citation (statute, regulation, or case law) that a human has
    manually verified against a reliable source database, forming a
    verified-authority bank the drafting assistant may cite from."""

    __tablename__ = "authorities"

    id = Column(Integer, primary_key=True, index=True)
    citation_text = Column(String, nullable=False, index=True)
    source_type = Column(String, nullable=False)  # statute | case_law | regulation
    source_database = Column(Enum(AuthoritySourceDb), default=AuthoritySourceDb.OTHER, nullable=False)
    summary = Column(Text, nullable=True)
    reference_url = Column(String, nullable=True)
    verified_by = Column(String, nullable=True)
    verified_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)

    case_id = Column(Integer, ForeignKey("cases.id"), nullable=True)
    case = relationship("Case", back_populates="authorities")


class Deadline(Base):
    """A date-sensitive obligation on a case (filing deadline, hearing,
    statute of limitations, etc). Due dates are entered manually by the
    lawyer - the platform does not auto-calculate statutory deadlines, since
    that requires jurisdiction-specific procedural rules that must be
    verified by a human before being relied upon."""

    __tablename__ = "deadlines"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    due_date = Column(DateTime, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(DeadlineStatus), default=DeadlineStatus.PENDING, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    case = relationship("Case", back_populates="deadlines")


class TimeEntry(Base):
    """A billable-or-not time entry logged against a case."""

    __tablename__ = "time_entries"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, nullable=False)
    entry_date = Column(DateTime, nullable=False)
    hours = Column(Float, nullable=False)
    hourly_rate = Column(Float, nullable=True)
    billable = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    case = relationship("Case", back_populates="time_entries")

    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    invoice = relationship("Invoice", back_populates="time_entries")


class Invoice(Base):
    """A generated invoice for a case, produced from a set of billable time
    entries that had not yet been invoiced. Entries stay attached to their
    invoice (via TimeEntry.invoice_id) so a lawyer can trace what was billed."""

    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String, nullable=False, index=True)
    issue_date = Column(DateTime, default=datetime.utcnow)
    total_amount = Column(Float, nullable=False)
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.DRAFT, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    case = relationship("Case", back_populates="invoices")
    time_entries = relationship("TimeEntry", back_populates="invoice")


class CaseNote(Base):
    """A dated free-text entry in a case's running journal - developments,
    strategy thoughts, call summaries, hearing outcomes, etc."""

    __tablename__ = "case_notes"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    case = relationship("Case", back_populates="notes")


class KnowledgeDocument(Base):
    """A firm-wide reference document (case-law example, article, treatise
    excerpt, internal memo template, etc) uploaded to ground the legal
    research and drafting assistants in the firm's own material, in addition
    to the verified Authority bank."""

    __tablename__ = "knowledge_documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False)  # case_law / article / literature / other
    content = Column(Text, nullable=False)
    source_filename = Column(String, nullable=True)
    uploaded_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class RiskCategory(str, enum.Enum):
    CONTRACT = "contract"
    REGULATORY = "regulatory"
    LITIGATION = "litigation"
    IP = "ip"
    DATA_PRIVACY = "data_privacy"
    EMPLOYMENT = "employment"
    CORPORATE = "corporate"
    OTHER = "other"


class RiskAssessment(Base):
    """A severity x likelihood legal risk assessment for a case. The score
    and escalation guidance are derived (not stored) from severity/likelihood
    by app.risk_scoring, so the banding logic lives in one place."""

    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(Enum(RiskCategory), default=RiskCategory.OTHER, nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(Integer, nullable=False)  # 1 (negligible) - 5 (critical)
    likelihood = Column(Integer, nullable=False)  # 1 (remote) - 5 (almost certain)
    mitigating_factors = Column(Text, nullable=True)
    assessed_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    case = relationship("Case", back_populates="risk_assessments")


class Task(Base):
    """A lightweight action item on a case - not necessarily date-critical,
    unlike Deadline. Simple to-do checklist entries such as 'send draft
    agreement to client for approval'."""

    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    done = Column(Boolean, default=False, nullable=False)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    case = relationship("Case", back_populates="tasks")


class Meeting(Base):
    """A scheduled meeting or event on a case - client meeting, court hearing,
    deposition, internal strategy session, etc. Like Deadline, times are
    entered manually by the lawyer."""

    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    location = Column(String, nullable=True)  # courtroom, office address, "video", etc.
    attendees = Column(Text, nullable=True)  # free-text list of names/roles
    notes = Column(Text, nullable=True)
    meeting_type = Column(Enum(MeetingType), default=MeetingType.OTHER, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    case = relationship("Case", back_populates="meetings")
