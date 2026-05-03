"""7-class environmental condition classification.

Vocab (authoritative, from `shared/glossary.md`):
    clean, rain, rain_heavy, snow_light, snow_heavy, fog_heavy, night

Prompt versions are immutable. v1_definitions = baseline prompt that ships
taxonomy definitions inline so the VLM does not have to guess label semantics.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from cveval.data.base import DatasetSample
from cveval.models.base import ChatContent, ChatMessage
from cveval.tasks.base import BaseTask, ParsedOutput, ScoreDict
from cveval.tasks.registry import register_task
from cveval.utils.parsers import match_label, try_json

CONDITION_VOCAB: list[str] = [
    "clean", "rain", "rain_heavy", "snow_light", "snow_heavy", "fog_heavy", "night",
]

_PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts" / "condition_cls"


def _load_prompt(version: str) -> dict[str, Any]:
    path = _PROMPTS_DIR / f"{version}.yaml"
    if not path.is_file():
        raise FileNotFoundError(
            f"Prompt template not found: {path}. Available: "
            f"{sorted(p.stem for p in _PROMPTS_DIR.glob('*.yaml'))}"
        )
    with open(path) as f:
        return yaml.safe_load(f)


@register_task("condition_cls")
class ConditionClsTask(BaseTask):
    """Single-label 7-class classification. JSON output: {"condition": "<label>"}."""

    def __init__(self, prompt_version: str = "v1_definitions") -> None:
        self.prompt_version = prompt_version
        tpl = _load_prompt(prompt_version)
        self._system: str = tpl["system"]
        self._user: str = tpl["user"]

    def build_prompt(self, sample: DatasetSample) -> list[ChatMessage]:
        return [
            ChatMessage(role="system", content=[ChatContent(type="text", text=self._system)]),
            ChatMessage(
                role="user",
                content=[
                    ChatContent(type="image", image_bytes=sample.image_bytes),
                    ChatContent(type="text", text=self._user),
                ],
            ),
        ]

    def parse_output(self, raw_output: str) -> ParsedOutput:
        # Gate 1: structured JSON {"condition": "..."}.
        obj = try_json(raw_output or "")
        if isinstance(obj, dict):
            cand = obj.get("condition") or obj.get("label") or obj.get("class")
            if isinstance(cand, str):
                norm = cand.strip().lower().replace(" ", "_").replace("-", "_")
                if norm in CONDITION_VOCAB:
                    return {"condition": norm, "parse_error": False, "source": "json"}
        # Gate 2: substring match against vocab. Order matters — match longer labels first
        # so 'rain_heavy' is not shadowed by 'rain'.
        ordered_vocab = sorted(CONDITION_VOCAB, key=len, reverse=True)
        label = match_label(raw_output or "", ordered_vocab, unknown="unknown")
        if label != "unknown":
            return {"condition": label, "parse_error": False, "source": "regex"}
        # Gate 3: give up cleanly — never raise.
        return {"condition": "unknown", "parse_error": True, "source": "fallback"}

    def score(self, parsed: ParsedOutput, gt: dict[str, Any]) -> ScoreDict:
        pred = parsed.get("condition", "unknown")
        truth = gt.get("condition")
        if truth is None:
            return {"correct": None, "parse_error": True, "reason": "missing_gt"}
        if parsed.get("parse_error"):
            return {"correct": 0, "parse_error": True, "pred": pred, "gt": truth}
        return {"correct": int(pred == truth), "parse_error": False, "pred": pred, "gt": truth}
