from __future__ import annotations

from typing import Callable, TypeVar

from cveval.models.base import BaseVLM

T = TypeVar("T", bound=BaseVLM)

MODEL_REGISTRY: dict[str, type[BaseVLM]] = {}


def register_model(name: str) -> Callable[[type[T]], type[T]]:
    def deco(cls: type[T]) -> type[T]:
        if name in MODEL_REGISTRY:
            raise ValueError(f"Model {name!r} already registered")
        cls.name = name
        MODEL_REGISTRY[name] = cls
        return cls
    return deco
