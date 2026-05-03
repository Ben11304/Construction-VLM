from __future__ import annotations

from typing import Callable, TypeVar

from cveval.tasks.base import BaseTask

T = TypeVar("T", bound=BaseTask)

TASK_REGISTRY: dict[str, type[BaseTask]] = {}


def register_task(name: str) -> Callable[[type[T]], type[T]]:
    def deco(cls: type[T]) -> type[T]:
        if name in TASK_REGISTRY:
            raise ValueError(f"Task {name!r} already registered")
        cls.name = name
        TASK_REGISTRY[name] = cls
        return cls
    return deco
