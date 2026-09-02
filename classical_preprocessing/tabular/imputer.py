"""
Imputation utilities for numeric and categorical clinical features.
"""

from typing import Optional
from sklearn.impute import SimpleImputer


def create_numeric_imputer(strategy: str = "median") -> SimpleImputer:
    """
    Create a deterministic scikit-learn SimpleImputer for numeric features.

    Parameters
    ----------
    strategy : str
        Imputation strategy (default 'median').

    Returns
    -------
    SimpleImputer
    """
    return SimpleImputer(strategy=strategy)


def create_categorical_imputer(
    strategy: str = "most_frequent",
    fill_value: Optional[str] = "missing",
) -> SimpleImputer:
    """
    Create a deterministic scikit-learn SimpleImputer for categorical features.

    Parameters
    ----------
    strategy : str
        Imputation strategy (default 'most_frequent').
    fill_value : Optional[str]
        Value used if strategy='constant'.

    Returns
    -------
    SimpleImputer
    """
    if strategy == "constant":
        return SimpleImputer(strategy="constant", fill_value=fill_value)
    return SimpleImputer(strategy=strategy)
