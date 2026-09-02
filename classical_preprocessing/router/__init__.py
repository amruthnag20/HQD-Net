"""
Input Router subpackage for clinical input classification and dispatch.
"""

from classical_preprocessing.router.input_router import (
    InputKind,
    InputRouter,
    ProcessingPath,
    RoutingDecision,
    UnsupportedFormatError,
    route_input,
)

__all__ = [
    "InputKind",
    "ProcessingPath",
    "RoutingDecision",
    "UnsupportedFormatError",
    "route_input",
    "InputRouter",
]
