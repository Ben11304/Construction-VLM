"""BaseDataset ABC. Adapters yield (image_bytes, gt, image_id, condition)."""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterator
from typing import Any

from pydantic import BaseModel, Field


class DatasetSample(BaseModel):
    """One row yielded by a dataset adapter.

    `image_bytes` is raw encoded bytes (JPEG/PNG); models load via image_io.
    `gt` is task-agnostic ground truth (task decides how to score).
    `condition` is one of glossary conditions (clean/rain/.../night).
    `severity` is optional fine-grained label (none/light/heavy).
    """

    image_bytes: bytes
    gt: dict[str, Any] = Field(default_factory=dict)
    image_id: str
    condition: str
    severity: str | None = None
    extra: dict[str, Any] = Field(default_factory=dict)


class BaseDataset(ABC):
    """Streaming iterator interface. Adapters MUST implement __iter__ and __len__."""

    name: str  # set by @register_dataset

    @abstractmethod
    def __iter__(self) -> Iterator[DatasetSample]:
        ...

    @abstractmethod
    def __len__(self) -> int:
        ...

    @property
    @abstractmethod
    def conditions(self) -> list[str]:
        """Authoritative condition vocab for this dataset (subset of glossary)."""
        ...
