"""BaseTask ABC. A task owns: prompt template, output parser, scorer.

Tasks are model-agnostic and dataset-agnostic. They consume a `DatasetSample` to
build messages and return per-sample scores. Aggregation is metric layer's job.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from cveval.data.base import DatasetSample
from cveval.models.base import ChatMessage

ParsedOutput = dict[str, Any]
ScoreDict = dict[str, Any]


class BaseTask(ABC):
    """Adapter contract for tasks (condition_cls, paired_delta, vlm_detection, ...)."""

    name: str  # set by @register_task
    prompt_version: str  # adapter sets when constructed

    @abstractmethod
    def build_prompt(self, sample: DatasetSample) -> list[ChatMessage]:
        ...

    @abstractmethod
    def parse_output(self, raw_output: str) -> ParsedOutput:
        """Robust parse. MUST NOT raise on bad output — return parsed-with-error sentinel."""
        ...

    @abstractmethod
    def score(self, parsed: ParsedOutput, gt: dict[str, Any]) -> ScoreDict:
        """Per-sample score (e.g. {'correct': 1}). Aggregation lives in metrics layer."""
        ...
