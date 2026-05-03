"""Single source of truth for device selection. Never hard-code 'cuda' elsewhere."""

from __future__ import annotations

import logging
from typing import Literal

logger = logging.getLogger(__name__)

Device = Literal["cuda", "mps", "cpu"]


def select_device(prefer: str | None = None) -> Device:
    """Pick device with fallback chain cuda → mps → cpu.

    `prefer` may be 'auto' or None (full chain), or 'cuda'/'mps'/'cpu' (force).
    Logs a warning when falling back below the requested level.
    """
    import torch

    cuda_ok = torch.cuda.is_available()
    mps_ok = getattr(torch.backends, "mps", None) is not None and torch.backends.mps.is_available()

    if prefer in (None, "auto"):
        if cuda_ok:
            return "cuda"
        if mps_ok:
            logger.warning("CUDA unavailable; falling back to MPS. Reduce batch_size to 1.")
            return "mps"
        logger.warning("CUDA/MPS unavailable; falling back to CPU. Inference will be slow.")
        return "cpu"

    if prefer == "cuda":
        if cuda_ok:
            return "cuda"
        logger.warning("CUDA requested but unavailable; falling back to CPU.")
        return "cpu"
    if prefer == "mps":
        if mps_ok:
            return "mps"
        logger.warning("MPS requested but unavailable; falling back to CPU.")
        return "cpu"
    if prefer == "cpu":
        return "cpu"

    raise ValueError(f"Unknown device preference: {prefer!r}")
