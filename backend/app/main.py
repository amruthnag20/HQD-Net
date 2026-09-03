"""
HQD-Net Quantum Backend Application Entry Point (Phase 3B.2).
Standalone FastAPI service providing native-domain VQC verification endpoints.
"""

from typing import Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from backend.app.quantum.schemas import (
    HealthResponse,
    QuantumPredictRequest,
    QuantumPredictResponse,
)
from backend.app.quantum.service import NativeQuantumService

app = FastAPI(
    title="HQD-Net Quantum Backend",
    description="Standalone Python/FastAPI service executing frozen 10-qubit VQC on its native clinical domain.",
    version="1.0.0",
)

# Configure CORS specifically for Vite development frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Global service instance
_quantum_service: Optional[NativeQuantumService] = None


def get_quantum_service() -> NativeQuantumService:
    global _quantum_service
    if _quantum_service is None:
        _quantum_service = NativeQuantumService()
    return _quantum_service


@app.on_event("startup")
def startup_event():
    """Pre-initialize the quantum service and checkpoint at startup."""
    get_quantum_service()


@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
def health_check() -> HealthResponse:
    """
    Health check endpoint indicating backend service availability.
    """
    return HealthResponse(status="ok", service="hqd-net-quantum-backend")


@app.post(
    "/api/quantum/predict",
    response_model=QuantumPredictResponse,
    tags=["Quantum Inference"],
    responses={
        400: {"description": "Invalid dataset or row index"},
        500: {"description": "Quantum runtime error"},
    },
)
def predict_quantum(request: QuantumPredictRequest) -> QuantumPredictResponse:
    """
    Executes real PennyLane quantum inference for a requested row from the native dataset.
    Strictly native-domain only in Phase 3B.2.
    """
    service = get_quantum_service()
    try:
        return service.predict_native_row(
            dataset=request.dataset,
            row_index=request.row_index,
        )
    except (ValueError, IndexError) as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Quantum execution error: {str(err)}",
        )
