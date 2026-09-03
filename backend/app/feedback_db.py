"""
Clinician Feedback SQLite Database Module for HQD-Net.
Stores clinician review audit logs, corrections, and evaluation outcomes.
"""

import os
import sqlite3
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

DB_PATH = Path(__file__).resolve().parent / "feedback.db"


class FeedbackRecord(BaseModel):
    sample_id: str
    request_id: Optional[str] = None
    clinician_id: str = Field(default="ANONYMOUS_CLINICIAN")
    clinician_decision: str = Field(description="AGREE / OVERRIDE / UNCERTAIN")
    clinician_correction: Optional[str] = Field(default=None, description="Corrected diagnosis label if overridden")
    feedback_category: str = Field(default="diagnostic_verification")
    comments: Optional[str] = None
    timestamp: float = Field(default_factory=time.time)
    quantum_risk_score: Optional[float] = None
    classical_risk_score: Optional[float] = None
    model_version: str = Field(default="v1.0.0")
    quantum_model_version: str = Field(default="vqc_v1.0.0")
    classical_model_version: str = Field(default="rf_v1.0.0")


def init_feedback_db():
    """Initializes feedback database schema if not present."""
    os.makedirs(DB_PATH.parent, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS clinician_feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sample_id TEXT NOT NULL,
            request_id TEXT,
            clinician_id TEXT,
            clinician_decision TEXT NOT NULL,
            clinician_correction TEXT,
            feedback_category TEXT,
            comments TEXT,
            timestamp REAL,
            quantum_risk_score REAL,
            classical_risk_score REAL,
            model_version TEXT,
            quantum_model_version TEXT,
            classical_model_version TEXT
        )
    """)
    conn.commit()
    conn.close()


def save_feedback(record: FeedbackRecord) -> int:
    """Inserts a new clinician feedback record into the database."""
    init_feedback_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO clinician_feedback (
            sample_id, request_id, clinician_id, clinician_decision, clinician_correction,
            feedback_category, comments, timestamp, quantum_risk_score, classical_risk_score,
            model_version, quantum_model_version, classical_model_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        record.sample_id, record.request_id, record.clinician_id, record.clinician_decision,
        record.clinician_correction, record.feedback_category, record.comments, record.timestamp,
        record.quantum_risk_score, record.classical_risk_score, record.model_version,
        record.quantum_model_version, record.classical_model_version
    ))
    row_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return row_id


def get_all_feedback() -> List[Dict[str, Any]]:
    """Retrieves all feedback records."""
    init_feedback_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM clinician_feedback ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]
