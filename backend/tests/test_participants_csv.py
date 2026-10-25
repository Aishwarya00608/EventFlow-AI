import io
import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database import Base, get_db
from backend.app.models import Event, Participant
from backend.app.services.certificate_service import generate_unique_certificate_id

# In-memory SQLite for complete test isolation without touching production/dev database
TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def init_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def db_session():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def sample_event(db_session):
    event = Event(
        id=str(uuid.uuid4()),
        title="HackFlow Global AI 2026",
        event_type="Hackathon",
        organization="EventFlow Open Source",
        date="October 24-25, 2026",
        location="Hybrid",
        certificate_title="Certificate of Achievement",
        certificate_issue_date="October 25, 2026"
    )
    db_session.add(event)
    db_session.commit()
    db_session.refresh(event)
    return event

@pytest.fixture
def client():
    return TestClient(app)


def test_import_csv_twice(client, sample_event, db_session):
    """
    Requirement 7: Importing a CSV twice must skip duplicates on second upload,
    preserve existing participant records and certificate IDs, and avoid collisions.
    """
    csv_content = (
        "Name,Email,Role,Organization\n"
        "Alice Walker,alice@example.com,Hacker,Stanford\n"
        "Bob Smith,bob@example.com,Mentor,Google\n"
        "Carol Danvers,carol@example.com,Winner,MIT\n"
    )

    # 1. First upload
    file_data = io.BytesIO(csv_content.encode("utf-8"))
    res1 = client.post(
        f"/api/events/{sample_event.id}/participants/upload-csv",
        files={"file": ("participants.csv", file_data, "text/csv")}
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["success"] is True
    assert data1["created_count"] == 3
    assert data1["skipped_count"] == 0

    # Capture initial certificate IDs
    initial_parts = db_session.query(Participant).filter(Participant.event_id == sample_event.id).all()
    assert len(initial_parts) == 3
    initial_cert_map = {p.email: p.certificate_id for p in initial_parts}
    assert len(set(initial_cert_map.values())) == 3  # All unique

    # 2. Second upload with the exact same CSV
    file_data_repeat = io.BytesIO(csv_content.encode("utf-8"))
    res2 = client.post(
        f"/api/events/{sample_event.id}/participants/upload-csv",
        files={"file": ("participants.csv", file_data_repeat, "text/csv")}
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["success"] is True
    assert data2["created_count"] == 0
    assert data2["skipped_count"] == 3
    assert "duplicates skipped" in data2["message"]

    # Verify no new participants created, and certificate IDs are strictly preserved
    after_parts = db_session.query(Participant).filter(Participant.event_id == sample_event.id).all()
    assert len(after_parts) == 3
    for p in after_parts:
        assert p.certificate_id == initial_cert_map[p.email]


def test_import_multiple_batches(client, sample_event, db_session):
    """
    Requirement 7: Importing multiple distinct and partially overlapping batches
    must assign globally unique certificate IDs across all batches without collisions.
    """
    batch1 = (
        "Name,Email,Role,Organization\n"
        "Dev 1,dev1@test.com,Hacker,OrgA\n"
        "Dev 2,dev2@test.com,Hacker,OrgB\n"
    )
    batch2 = (
        "Name,Email,Role,Organization\n"
        "Dev 3,dev3@test.com,Hacker,OrgC\n"
        "Dev 4,dev4@test.com,Hacker,OrgD\n"
    )
    batch3 = (
        "Name,Email,Role,Organization\n"
        "Dev 2,dev2@test.com,Hacker,OrgB-Updated\n"  # Duplicate of batch1
        "Dev 5,dev5@test.com,Hacker,OrgE\n"          # New
    )

    # Upload Batch 1
    r1 = client.post(
        f"/api/events/{sample_event.id}/participants/upload-csv",
        files={"file": ("b1.csv", io.BytesIO(batch1.encode("utf-8")), "text/csv")}
    )
    assert r1.status_code == 200
    assert r1.json()["created_count"] == 2

    # Upload Batch 2
    r2 = client.post(
        f"/api/events/{sample_event.id}/participants/upload-csv",
        files={"file": ("b2.csv", io.BytesIO(batch2.encode("utf-8")), "text/csv")}
    )
    assert r2.status_code == 200
    assert r2.json()["created_count"] == 2

    # Upload Batch 3 (1 duplicate, 1 new)
    r3 = client.post(
        f"/api/events/{sample_event.id}/participants/upload-csv",
        files={"file": ("b3.csv", io.BytesIO(batch3.encode("utf-8")), "text/csv")}
    )
    assert r3.status_code == 200
    assert r3.json()["created_count"] == 1
    assert r3.json()["skipped_count"] == 1

    # Check database state: 5 total participants
    parts = db_session.query(Participant).filter(Participant.event_id == sample_event.id).all()
    assert len(parts) == 5
    cert_ids = [p.certificate_id for p in parts]
    assert len(set(cert_ids)) == 5  # Every single certificate ID is distinct


def test_import_when_certificate_ids_already_exist(client, sample_event, db_session):
    """
    Requirement 7: Importing participants when specific certificate IDs (such as legacy EF-HACK-1001)
    already exist in the database must never collide with or overwrite them.
    """
    # Pre-populate participant with legacy sequential certificate ID
    legacy_part = Participant(
        id=str(uuid.uuid4()),
        event_id=sample_event.id,
        name="Legacy Participant",
        email="legacy@example.com",
        role="Attendee",
        organization="Legacy Corp",
        feedback_token=str(uuid.uuid4()),
        feedback_status="Not Sent",
        certificate_id="EF-HACK-1001",
        certificate_status="Pending"
    )
    db_session.add(legacy_part)
    db_session.commit()

    # Upload CSV with new participants
    new_csv = (
        "Name,Email,Role,Organization\n"
        "New Guy,newguy@example.com,Hacker,New Org\n"
        "Another Guy,another@example.com,Hacker,New Org\n"
    )
    res = client.post(
        f"/api/events/{sample_event.id}/participants/upload-csv",
        files={"file": ("new.csv", io.BytesIO(new_csv.encode("utf-8")), "text/csv")}
    )
    assert res.status_code == 200
    assert res.json()["created_count"] == 2

    # Verify legacy participant's certificate_id remains EF-HACK-1001
    db_session.expire_all()
    check_legacy = db_session.query(Participant).filter(Participant.email == "legacy@example.com").first()
    assert check_legacy.certificate_id == "EF-HACK-1001"

    # Verify new participants got unique certificate IDs different from EF-HACK-1001
    all_parts = db_session.query(Participant).filter(Participant.event_id == sample_event.id).all()
    assert len(all_parts) == 3
    all_cert_ids = {p.certificate_id for p in all_parts}
    assert len(all_cert_ids) == 3
    assert "EF-HACK-1001" in all_cert_ids


def test_duplicate_emails_in_same_csv_batch(client, sample_event, db_session):
    """
    CSV file containing duplicate email addresses in multiple rows
    must be deduplicated during the same batch, creating only 1 participant record.
    """
    csv_with_dupes = (
        "Name,Email,Role,Organization\n"
        "Dave Original,dave@example.com,Hacker,Caltech\n"
        "Dave Duplicate,dave@example.com,Hacker,Caltech\n"
        "Eve Adams,eve@example.com,Speaker,Stanford\n"
    )
    res = client.post(
        f"/api/events/{sample_event.id}/participants/upload-csv",
        files={"file": ("dupes.csv", io.BytesIO(csv_with_dupes.encode("utf-8")), "text/csv")}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["created_count"] == 2
    assert data["skipped_count"] == 1

    dave_count = db_session.query(Participant).filter(
        Participant.event_id == sample_event.id,
        Participant.email == "dave@example.com"
    ).count()
    assert dave_count == 1


def test_cross_event_certificate_id_uniqueness(client, db_session):
    """
    Participants uploaded to different events with the same event_type
    must receive globally distinct certificate IDs without UNIQUE constraint conflicts.
    """
    e1 = Event(id=str(uuid.uuid4()), title="Event One", event_type="Hackathon")
    e2 = Event(id=str(uuid.uuid4()), title="Event Two", event_type="Hackathon")
    db_session.add_all([e1, e2])
    db_session.commit()

    csv_data = "Name,Email,Role\nUser A,usera@test.com,Hacker\nUser B,userb@test.com,Hacker\n"

    r1 = client.post(
        f"/api/events/{e1.id}/participants/upload-csv",
        files={"file": ("p.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    )
    assert r1.status_code == 200
    assert r1.json()["created_count"] == 2

    # Upload same CSV to Event 2
    r2 = client.post(
        f"/api/events/{e2.id}/participants/upload-csv",
        files={"file": ("p.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    )
    assert r2.status_code == 200
    assert r2.json()["created_count"] == 2

    e1_parts = db_session.query(Participant).filter(Participant.event_id == e1.id).all()
    e2_parts = db_session.query(Participant).filter(Participant.event_id == e2.id).all()

    e1_certs = {p.certificate_id for p in e1_parts}
    e2_certs = {p.certificate_id for p in e2_parts}

    # Certificate IDs across different events must not overlap
    assert len(e1_certs.intersection(e2_certs)) == 0


def test_certificate_verification_with_newly_generated_ids(client, sample_event, db_session):
    """
    Requirement 8: Public certificate verification endpoint must work seamlessly
    with newly generated certificate IDs.
    """
    csv_data = "Name,Email,Role,Organization\nZoe Saldana,zoe@test.com,Winner,Avatar Org\n"
    res = client.post(
        f"/api/events/{sample_event.id}/participants/upload-csv",
        files={"file": ("p.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    )
    assert res.status_code == 200

    part = db_session.query(Participant).filter(Participant.email == "zoe@test.com").first()
    assert part is not None
    assert part.certificate_id.startswith("EF-HACK-")

    # Verify certificate via public endpoint
    verify_res = client.get(f"/api/public/verify/{part.certificate_id}")
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["valid"] is True
    assert verify_data["certificate_id"] == part.certificate_id
    assert verify_data["participant_name"] == "Zoe Saldana"
    assert verify_data["event_title"] == sample_event.title
    assert verify_data["role"] == "Winner"
    assert verify_data["verification_hash"].startswith("SHA256-")


def test_actual_sample_csv_upload_twice(client, sample_event, db_session):
    """
    Test uploading the exact sample_hackathon_participants.csv file from the project twice.
    """
    with open("sample_data/sample_hackathon_participants.csv", "rb") as f:
        file_bytes = f.read()

    # Upload 1
    res1 = client.post(
        f"/api/events/{sample_event.id}/participants/upload-csv",
        files={"file": ("sample_hackathon_participants.csv", io.BytesIO(file_bytes), "text/csv")}
    )
    assert res1.status_code == 200
    assert res1.json()["created_count"] == 12
    assert res1.json()["skipped_count"] == 0

    # Upload 2
    res2 = client.post(
        f"/api/events/{sample_event.id}/participants/upload-csv",
        files={"file": ("sample_hackathon_participants.csv", io.BytesIO(file_bytes), "text/csv")}
    )
    assert res2.status_code == 200
    assert res2.json()["created_count"] == 0
    assert res2.json()["skipped_count"] == 12

    # Verify all 12 participants have unique certificate IDs
    parts = db_session.query(Participant).filter(Participant.event_id == sample_event.id).all()
    assert len(parts) == 12
    assert len({p.certificate_id for p in parts}) == 12


def test_manual_add_participant(client, sample_event, db_session):
    """
    Test adding a participant manually via POST /api/events/{event_id}/participants.
    """
    payload = {
        "name": "Manual Participant",
        "email": "manual@example.com",
        "role": "Speaker",
        "organization": "Open Source Foundation"
    }
    res = client.post(f"/api/events/{sample_event.id}/participants", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Manual Participant"
    assert data["email"] == "manual@example.com"
    assert data["certificate_id"].startswith("EF-HACK-")

    # Duplicate manual registration must be rejected with 400
    res_dup = client.post(f"/api/events/{sample_event.id}/participants", json=payload)
    assert res_dup.status_code == 400
    assert "already registered" in res_dup.json()["detail"]


def test_generator_avoids_in_batch_and_db_collisions(db_session, sample_event, monkeypatch):
    """
    Directly test generate_unique_certificate_id when encountering pre-existing candidate IDs.
    """
    # Force first generated suffix to be a collision
    colliding_id = "EF-HACK-COLLIDE1"

    # Save a participant with this colliding ID in DB
    existing_p = Participant(
        id=str(uuid.uuid4()),
        event_id=sample_event.id,
        name="Collision User",
        email="collision@example.com",
        role="Attendee",
        certificate_id=colliding_id,
        feedback_token=str(uuid.uuid4())
    )
    db_session.add(existing_p)
    db_session.commit()

    # Pre-populate batch set with another ID
    batch_set = {"EF-HACK-BATCH1"}

    # Mock secrets.token_hex to return COLLIDE1 on call 1, BATCH1 on call 2, then UNIQUE1 on call 3
    call_count = 0
    def mock_token_hex(nbytes):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return "COLLIDE1"
        elif call_count == 2:
            return "BATCH1"
        else:
            return "UNIQUE01"

    monkeypatch.setattr("secrets.token_hex", mock_token_hex)

    new_id = generate_unique_certificate_id(
        db=db_session,
        event=sample_event,
        existing_in_batch=batch_set
    )

    assert new_id == "EF-HACK-UNIQUE01"
    assert new_id in batch_set
    assert call_count == 3


def test_transaction_rollback_on_database_error(client, sample_event, monkeypatch):
    """
    Requirement 5: If an error occurs during upload, db.rollback() is invoked and
    an appropriate HTTP error is returned.
    """
    csv_data = "Name,Email,Role\nCrash User,crash@example.com,Attendee\n"

    from sqlalchemy.exc import OperationalError
    def mock_commit(*args, **kwargs):
        raise OperationalError("Simulated database failure", {}, None)

    # Patch Session.commit to fail
    monkeypatch.setattr("sqlalchemy.orm.Session.commit", mock_commit)

    res = client.post(
        f"/api/events/{sample_event.id}/participants/upload-csv",
        files={"file": ("crash.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    )
    assert res.status_code == 400
    assert "Database error during participant upload" in res.json()["detail"]

