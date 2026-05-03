"""SmolVLM (Idefics3) adapter — HF transformers backend.

Verified target: HuggingFaceTB/SmolVLM-256M-Instruct (Apache-2.0, BF16).
Cùng adapter dùng được cho SmolVLM-500M / 2.2B (đổi `extra.hf_id`).
"""

from __future__ import annotations

import io
import time
from typing import Any

from PIL import Image

from cveval.config import ModelConfig
from cveval.models.base import BaseVLM, ChatMessage, GenerateResult
from cveval.models.registry import register_model
from cveval.utils.device import select_device

_DTYPE_MAP = {
    "auto": None,
    "float16": "float16",
    "bfloat16": "bfloat16",
    "float32": "float32",
}


@register_model("smolvlm-256m")
class SmolVLM(BaseVLM):
    def __init__(self, config: ModelConfig) -> None:
        import torch
        from transformers import AutoModelForVision2Seq, AutoProcessor

        self._cfg = config
        hf_id: str = config.extra.get("hf_id", "HuggingFaceTB/SmolVLM-256M-Instruct")
        trust_remote = bool(config.extra.get("trust_remote_code", False))
        device_pref = config.extra.get("device_pref", "auto")

        self._device = select_device(device_pref)

        dtype_name = _DTYPE_MAP.get(config.dtype, None)
        torch_dtype = getattr(torch, dtype_name) if dtype_name else "auto"

        self._processor = AutoProcessor.from_pretrained(
            hf_id, revision=config.revision, trust_remote_code=trust_remote
        )
        self._model = AutoModelForVision2Seq.from_pretrained(
            hf_id,
            revision=config.revision,
            torch_dtype=torch_dtype,
            trust_remote_code=trust_remote,
        ).to(self._device)
        self._model.eval()

    def generate(
        self,
        messages: list[ChatMessage],
        *,
        max_new_tokens: int | None = None,
        temperature: float | None = None,
        **kwargs: Any,
    ) -> GenerateResult:
        import torch

        max_new = max_new_tokens if max_new_tokens is not None else self._cfg.max_new_tokens
        temp = temperature if temperature is not None else self._cfg.temperature
        do_sample = bool(self._cfg.extra.get("do_sample", False)) and temp > 0.0

        hf_messages, images = _to_hf_messages(messages)
        prompt = self._processor.apply_chat_template(hf_messages, add_generation_prompt=True)

        inputs = self._processor(text=prompt, images=images or None, return_tensors="pt")
        inputs = {k: v.to(self._device) for k, v in inputs.items()}

        gen_kwargs: dict[str, Any] = {"max_new_tokens": max_new, "do_sample": do_sample}
        if do_sample:
            gen_kwargs["temperature"] = temp

        t0 = time.perf_counter()
        with torch.no_grad():
            out_ids = self._model.generate(**inputs, **gen_kwargs)
        latency_ms = int((time.perf_counter() - t0) * 1000)

        input_len = inputs["input_ids"].shape[1]
        new_tokens = out_ids[0, input_len:]
        raw = self._processor.tokenizer.decode(new_tokens, skip_special_tokens=True).strip()

        return GenerateResult(
            raw_output=raw,
            latency_ms=latency_ms,
            tokens_in=int(input_len),
            tokens_out=int(new_tokens.shape[0]),
        )


def _to_hf_messages(
    messages: list[ChatMessage],
) -> tuple[list[dict[str, Any]], list[Image.Image]]:
    """Convert canonical ChatMessage → HF processor format. Image bytes → PIL."""
    hf_msgs: list[dict[str, Any]] = []
    images: list[Image.Image] = []
    for m in messages:
        parts: list[dict[str, Any]] = []
        for c in m.content:
            if c.type == "text":
                parts.append({"type": "text", "text": c.text or ""})
            elif c.type == "image":
                if c.image_bytes is None:
                    raise ValueError("ChatContent.type=='image' missing image_bytes")
                images.append(Image.open(io.BytesIO(c.image_bytes)).convert("RGB"))
                parts.append({"type": "image"})
        hf_msgs.append({"role": m.role, "content": parts})
    return hf_msgs, images
