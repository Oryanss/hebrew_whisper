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
