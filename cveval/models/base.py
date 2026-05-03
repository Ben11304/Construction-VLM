"""BaseVLM ABC. Adapters expose generate(messages) -> raw_output: str.

Messages follow a chat-style schema; image content is raw bytes (loader-agnostic).
Adapters must NOT know which task is calling them.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Literal

from pydantic import BaseModel, Field

ContentType = Literal["text", "image"]


class ChatContent(BaseModel):
    type: ContentType
    text: str | None = None
    image_bytes: bytes | None = None


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: list[ChatContent]


class GenerateResult(BaseModel):
    """What an adapter returns from generate(). Latency/tokens/cost are best-effort."""

    raw_output: str
    latency_ms: int | None = None
    tokens_in: int | None = None
    tokens_out: int | None = None
    cost_usd: float | None = None
    extra: dict[str, Any] = Field(default_factory=dict)


class BaseVLM(ABC):
    """Adapter contract. Implementations live in cveval/models/<name>.py.

    Lifecycle:
      __init__(model_config) → load weights / set up client (lazy ok)
      generate(messages) → raw text + telemetry
    """

    name: str  # set by @register_model

    @abstractmethod
    def __init__(self, config: Any) -> None:
        ...

    @abstractmethod
    def generate(
        self,
        messages: list[ChatMessage],
        *,
        max_new_tokens: int = 256,
        temperature: float = 0.0,
        **kwargs: Any,
    ) -> GenerateResult:
        ...
