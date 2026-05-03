"""Parser robustness for condition_cls task.

Key invariant: parse_output MUST NOT raise on any string input (BaseTask
contract v1.0.0). 10+ dirty samples covering JSON / fenced JSON / pure prose
/ wrong key / wrong label / case+space variants / empty / None-ish.
"""

from __future__ import annotations

import pytest

from cveval.tasks.condition_cls import CONDITION_VOCAB, ConditionClsTask
from cveval.tasks.registry import TASK_REGISTRY


@pytest.fixture
def task() -> ConditionClsTask:
    return ConditionClsTask(prompt_version="v1_definitions")


def test_registry_entry():
    assert "condition_cls" in TASK_REGISTRY


def test_vocab_matches_glossary():
    assert CONDITION_VOCAB == [
        "clean", "rain", "rain_heavy", "snow_light", "snow_heavy", "fog_heavy", "night",
    ]


@pytest.mark.parametrize(
    "raw, expected_label, expected_error",
    [
        # Gate 1 — clean JSON.
        ('{"condition": "fog_heavy"}', "fog_heavy", False),
        # Gate 1 — alt key 'label'.
        ('{"label": "rain"}', "rain", False),
        # Gate 1 — markdown fenced JSON.
        ('```json\n{"condition": "night"}\n```', "night", False),
        # Gate 1 — case + spaces normalised.
        ('{"condition": "Rain Heavy"}', "rain_heavy", False),
        # Gate 1 — hyphenated normalised.
        ('{"condition": "snow-light"}', "snow_light", False),
        # Gate 2 — pure prose, longer label wins (rain_heavy beats rain).
        ("This image shows rain_heavy precipitation.", "rain_heavy", False),
        # Gate 2 — uppercase/casing.
        ("Looks like NIGHT to me.", "night", False),
        # Gate 3 — completely off-topic prose.
        ("I am unable to determine.", "unknown", True),
        # Gate 3 — empty string.
        ("", "unknown", True),
        # Gate 3 — JSON with invalid label falls through to regex (which also fails).
        ('{"condition": "sandstorm"}', "unknown", True),
    ],
)
def test_parse_output_handles_dirty_inputs(task, raw, expected_label, expected_error):
    out = task.parse_output(raw)
    assert out["condition"] == expected_label
    assert out["parse_error"] is expected_error


def test_parse_output_never_raises_on_garbage(task):
    for raw in ["{{{{", None, "\x00\x01", "{'condition': 'rain'}", "no opinion"]:
        out = task.parse_output(raw if raw is not None else "")  # signature is str
        assert "condition" in out


def test_score_correct(task):
    parsed = {"condition": "fog_heavy", "parse_error": False}
    res = task.score(parsed, {"condition": "fog_heavy"})
    assert res["correct"] == 1
    assert res["parse_error"] is False


def test_score_wrong(task):
    parsed = {"condition": "rain", "parse_error": False}
    res = task.score(parsed, {"condition": "fog_heavy"})
    assert res["correct"] == 0


def test_score_parse_error_counts_as_wrong(task):
    parsed = {"condition": "unknown", "parse_error": True}
    res = task.score(parsed, {"condition": "night"})
    assert res["correct"] == 0
    assert res["parse_error"] is True


def test_score_missing_gt_returns_none(task):
    parsed = {"condition": "rain", "parse_error": False}
    res = task.score(parsed, {})
    assert res["correct"] is None
