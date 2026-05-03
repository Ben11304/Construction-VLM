import pytest

from cveval.data.registry import DATASET_REGISTRY, register_dataset
from cveval.data.base import BaseDataset


def test_register_and_lookup(_clean_registries=None):
    @register_dataset("xx")
    class X(BaseDataset):
        def __iter__(self): return iter([])
        def __len__(self): return 0
        @property
        def conditions(self): return []

    assert "xx" in DATASET_REGISTRY
    assert DATASET_REGISTRY["xx"].name == "xx"


def test_duplicate_raises():
    @register_dataset("dup")
    class A(BaseDataset):
        def __iter__(self): return iter([])
        def __len__(self): return 0
        @property
        def conditions(self): return []

    with pytest.raises(ValueError):
        @register_dataset("dup")
        class B(BaseDataset):
            def __iter__(self): return iter([])
            def __len__(self): return 0
            @property
            def conditions(self): return []
