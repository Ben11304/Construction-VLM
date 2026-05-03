"""Smoke tests cho SmolVLM adapter.

- Unit (mặc định): mock transformers, không cần GPU/network.
- Live download (opt-in): set CVEVAL_RUN_VLM_DOWNLOAD=1 để load model thật.
"""

from __future__ import annotations

import io
import os
import sys
import types
from unittest.mock import MagicMock

import pytest
from PIL import Image

from cveval.config import ModelConfig


def _png_bytes(color: tuple[int, int, int] = (10, 20, 30)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (32, 32), color).save(buf, format="PNG")
    return buf.getvalue()


def _config() -> ModelConfig:
    return ModelConfig(
        name="smolvlm-256m",
        backend="hf",
        dtype="bfloat16",
        max_new_tokens=8,
        temperature=0.0,
        extra={"hf_id": "HuggingFaceTB/SmolVLM-256M-Instruct", "device_pref": "cpu"},
    )


def test_register_and_message_conversion():
    """Adapter import → registry chứa key, _to_hf_messages convert đúng."""
    from cveval.models import MODEL_REGISTRY  # noqa: WPS433
    import cveval.models.smolvlm as smolvlm_mod  # noqa: WPS433

    assert "smolvlm-256m" in MODEL_REGISTRY
    assert MODEL_REGISTRY["smolvlm-256m"] is smolvlm_mod.SmolVLM

    from cveval.models.base import ChatContent, ChatMessage

    msgs = [
        ChatMessage(
            role="user",
            content=[
                ChatContent(type="image", image_bytes=_png_bytes()),
                ChatContent(type="text", text="hello"),
            ],
        )
    ]
    hf, imgs = smolvlm_mod._to_hf_messages(msgs)
    assert len(imgs) == 1 and imgs[0].size == (32, 32)
    assert hf == [
        {
            "role": "user",
            "content": [{"type": "image"}, {"type": "text", "text": "hello"}],
        }
    ]


def test_image_content_missing_bytes_raises():
    import cveval.models.smolvlm as smolvlm_mod
    from cveval.models.base import ChatContent, ChatMessage

    msgs = [ChatMessage(role="user", content=[ChatContent(type="image")])]
    with pytest.raises(ValueError):
        smolvlm_mod._to_hf_messages(msgs)


def test_generate_with_mocked_transformers(monkeypatch):
    """Init + generate không touch network — patch AutoProcessor / AutoModelForVision2Seq."""
    import torch  # noqa: F401  ensure torch present

    fake_tf = types.ModuleType("transformers")

    proc = MagicMock()
    proc.apply_chat_template.return_value = "<|im_start|>user\n<image>hi"
    proc.tokenizer.decode.return_value = '{"condition":"clean"}'
    fake_input_ids = MagicMock()
    fake_input_ids.shape = (1, 5)
    proc.return_value = {
        "input_ids": _FakeTensor((1, 5)),
        "pixel_values": _FakeTensor((1, 3, 32, 32)),
    }

    fake_tf.AutoProcessor = MagicMock()
    fake_tf.AutoProcessor.from_pretrained.return_value = proc

    model = MagicMock()
    model.eval.return_value = model
    model.to.return_value = model
    model.generate.return_value = _FakeTensor((1, 13))  # input_len=5, new=8
    fake_tf.AutoModelForVision2Seq = MagicMock()
    fake_tf.AutoModelForVision2Seq.from_pretrained.return_value = model

    monkeypatch.setitem(sys.modules, "transformers", fake_tf)

    # Force CPU device path
    from cveval.utils import device as device_mod

    monkeypatch.setattr(device_mod, "select_device", lambda prefer=None: "cpu")

    # Reload adapter so its imports bind to the patched modules.
    import importlib

    import cveval.models.smolvlm as smolvlm_mod

    smolvlm_mod = importlib.reload(smolvlm_mod)

    from cveval.models.base import ChatContent, ChatMessage

    adapter = smolvlm_mod.SmolVLM(_config())
    msgs = [
        ChatMessage(
            role="user",
            content=[
                ChatContent(type="image", image_bytes=_png_bytes()),
                ChatContent(type="text", text="What weather?"),
            ],
        )
    ]
    res = adapter.generate(msgs, max_new_tokens=8)

    assert res.raw_output == '{"condition":"clean"}'
    assert res.tokens_in == 5
    assert res.tokens_out == 8
    assert res.latency_ms is not None and res.latency_ms >= 0


@pytest.mark.skipif(
    os.getenv("CVEVAL_RUN_VLM_DOWNLOAD") != "1",
    reason="Set CVEVAL_RUN_VLM_DOWNLOAD=1 to download SmolVLM-256M (~600MB)",
)
def test_live_smoke_smolvlm_download():
    """End-to-end smoke: tải model thật, sinh 1 output ngắn từ 1 ảnh dummy."""
    import importlib

    import cveval.models.smolvlm as smolvlm_mod

    smolvlm_mod = importlib.reload(smolvlm_mod)

    from cveval.models.base import ChatContent, ChatMessage

    adapter = smolvlm_mod.SmolVLM(_config())
    res = adapter.generate(
        [
            ChatMessage(
                role="user",
                content=[
                    ChatContent(type="image", image_bytes=_png_bytes((200, 200, 200))),
                    ChatContent(type="text", text="Describe in one word."),
                ],
            )
        ],
        max_new_tokens=8,
    )
    assert isinstance(res.raw_output, str) and len(res.raw_output) > 0


class _FakeTensor:
    """Đủ giao diện cho .shape, .to(device), index slicing trong adapter."""

    def __init__(self, shape: tuple[int, ...]):
        self.shape = shape

    def to(self, _device):
        return self

    def __getitem__(self, idx):
        # adapter dùng out_ids[0, input_len:] → trả tensor mới với shape mới
        if isinstance(idx, tuple) and len(idx) == 2 and isinstance(idx[1], slice):
            start = idx[1].start or 0
            stop = idx[1].stop if idx[1].stop is not None else self.shape[1]
            return _FakeTensor((stop - start,))
        return self
