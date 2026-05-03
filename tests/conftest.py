from __future__ import annotations

import pytest

from cveval.data.base import BaseDataset, DatasetSample
from cveval.data.registry import DATASET_REGISTRY, register_dataset
from cveval.models.base import BaseVLM, ChatMessage, GenerateResult
from cveval.models.registry import MODEL_REGISTRY, register_model
from cveval.tasks.base import BaseTask
from cveval.tasks.registry import TASK_REGISTRY, register_task


@pytest.fixture(autouse=True)
def _clean_registries():
    keep_d, keep_m, keep_t = (
        dict(DATASET_REGISTRY), dict(MODEL_REGISTRY), dict(TASK_REGISTRY),
    )
    yield
    DATASET_REGISTRY.clear(); DATASET_REGISTRY.update(keep_d)
    MODEL_REGISTRY.clear(); MODEL_REGISTRY.update(keep_m)
    TASK_REGISTRY.clear(); TASK_REGISTRY.update(keep_t)


@pytest.fixture
def fake_adapters():
    """Register fake dataset/model/task triple. Returns the keys."""

    @register_dataset("fake_ds")
    class FakeDS(BaseDataset):
        def __init__(self, cfg):
            self._cfg = cfg
            self._rows = [
                DatasetSample(
                    image_bytes=b"PNG_A", gt={"condition": "rain"},
                    image_id="a", condition="rain",
                ),
                DatasetSample(
                    image_bytes=b"PNG_B", gt={"condition": "clean"},
                    image_id="b", condition="clean",
                ),
            ]

        def __iter__(self):
            return iter(self._rows)

        def __len__(self):
            return len(self._rows)

        @property
        def conditions(self):
            return ["clean", "rain"]

    @register_model("fake_vlm")
    class FakeVLM(BaseVLM):
        def __init__(self, cfg):
            self._cfg = cfg

        def generate(self, messages, **kw):
            return GenerateResult(raw_output='{"condition":"rain"}', latency_ms=1)

    @register_task("fake_task")
    class FakeTask(BaseTask):
        def __init__(self, cfg):
            self.prompt_version = cfg.prompt_version

        def build_prompt(self, sample):
            from cveval.models.base import ChatContent
            return [ChatMessage(role="user", content=[ChatContent(type="text", text="q")])]

        def parse_output(self, raw):
            import json
            try:
                return json.loads(raw)
            except Exception:
                return {"condition": "unknown"}

        def score(self, parsed, gt):
            return {"correct": int(parsed.get("condition") == gt.get("condition"))}

    return {"dataset": "fake_ds", "model": "fake_vlm", "task": "fake_task"}
