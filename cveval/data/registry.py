from __future__ import annotations

from typing import Callable, TypeVar

from cveval.data.base import BaseDataset

T = TypeVar("T", bound=BaseDataset)

DATASET_REGISTRY: dict[str, type[BaseDataset]] = {}


def register_dataset(name: str) -> Callable[[type[T]], type[T]]:
    def deco(cls: type[T]) -> type[T]:
        if name in DATASET_REGISTRY:
            raise ValueError(f"Dataset {name!r} already registered")
        cls.name = name
        DATASET_REGISTRY[name] = cls
        return cls
    return deco
