"""
Categorical encoding utilities for tabular clinical data.
"""

from sklearn.preprocessing import OneHotEncoder


def create_categorical_encoder(handle_unknown: str = "ignore") -> OneHotEncoder:
    """
    Create a deterministic scikit-learn OneHotEncoder for categorical features.

    Parameters
    ----------
    handle_unknown : str
        Behavior for unseen categories during transform (default 'ignore').

    Returns
    -------
    OneHotEncoder
    """
    return OneHotEncoder(sparse_output=False, handle_unknown=handle_unknown)
