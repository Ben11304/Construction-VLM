"""Synchronous local runner. v0.1 = sequential per-sample loop with cache + parquet writer.

Concurrency is intentionally simple for v0.1 (single GPU, GPU-bound). Async/threaded
runner for API adapters lives in a separate runner class added later.
"""

from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Any

import yaml

from cveval.config import RunConfig
from cveval.data.registry import DATASET_REGISTRY
from cveval.models.registry import MODEL_REGISTRY
from cveval.runner.parquet_writer import write_predictions
from cveval.tasks.registry import TASK_REGISTRY
from cveval.utils.cache import ResponseCache
from cveval.utils.hashing import sha1_bytes, sha1_text

logger = logging.getLogger(__name__)


class LocalRunner:
    """Orchestrate dataset → task → model → score → parquet for one RunConfig."""

    def __init__(self, config: RunConfig):
        self.config = config
        self.cache = (
            ResponseCache(config.runner.cache_dir / "responses.db")
            if config.runner.use_cache
            else None
        )
        self._dataset_cls = self._lookup(DATASET_REGISTRY, config.data.name, "dataset")
        self._model_cls = self._lookup(MODEL_REGISTRY, config.model.name, "model")
        self._task_cls = self._lookup(TASK_REGISTRY, config.task.name, "task")

    @staticmethod
    def _lookup(reg: dict, key: str, kind: str):
        if key not in reg:
            raise KeyError(
                f"{kind} {key!r} not registered. Available: {sorted(reg.keys())}"
            )
        return reg[key]

    def _serialize_messages(self, messages) -> str:
        parts: list[str] = []
        for m in messages:
            for c in m.content:
                if c.type == "text" and c.text is not None:
                    parts.append(f"{m.role}:{c.text}")
        return "\n".join(parts)

    def run(self) -> Path:
        cfg = self.config
        out_dir = cfg.runner.out_dir / cfg.run_id
        out_dir.mkdir(parents=True, exist_ok=True)

        (out_dir / "effective_config.yaml").write_text(
            yaml.safe_dump(cfg.model_dump(mode="json"), sort_keys=False)
        )

        dataset = self._dataset_cls(cfg.data)
        task = self._task_cls(cfg.task)
        model = self._model_cls(cfg.model)

        rows: list[dict[str, Any]] = []
        n_max = cfg.runner.max_samples

        for i, sample in enumerate(dataset):
            if n_max is not None and i >= n_max:
                break

            messages = task.build_prompt(sample)
            prompt_text = self._serialize_messages(messages)
            image_hash = sha1_bytes(sample.image_bytes)
            prompt_hash = sha1_text(prompt_text)

            cached = (
                self.cache.get(
                    model=cfg.model.name,
                    image_hash=image_hash,
                    prompt_hash=prompt_hash,
                    prompt_version=cfg.task.prompt_version,
                    task=cfg.task.name,
                )
                if self.cache
                else None
            )

            error: str | None = None
            if cached is not None:
                raw_output = cached["raw_output"]
                latency_ms = cached["latency_ms"]
                tokens_in = cached["tokens_in"]
                tokens_out = cached["tokens_out"]
                cost_usd = cached["cost_usd"]
            else:
                t0 = time.perf_counter()
                try:
                    result = model.generate(
                        messages,
                        max_new_tokens=cfg.model.max_new_tokens,
                        temperature=cfg.model.temperature,
                    )
                    raw_output = result.raw_output
                    latency_ms = result.latency_ms or int((time.perf_counter() - t0) * 1000)
                    tokens_in = result.tokens_in
                    tokens_out = result.tokens_out
                    cost_usd = result.cost_usd
                except Exception as e:
                    logger.exception("generate() failed for image_id=%s", sample.image_id)
                    raw_output = ""
                    latency_ms = int((time.perf_counter() - t0) * 1000)
                    tokens_in = tokens_out = cost_usd = None
                    error = f"{type(e).__name__}: {e}"

                if self.cache and error is None:
                    self.cache.put(
                        model=cfg.model.name,
                        image_hash=image_hash,
                        prompt_hash=prompt_hash,
                        prompt_version=cfg.task.prompt_version,
                        task=cfg.task.name,
                        raw_output=raw_output,
                        latency_ms=latency_ms,
                        tokens_in=tokens_in,
                        tokens_out=tokens_out,
                        cost_usd=cost_usd,
                    )

            try:
                parsed = task.parse_output(raw_output)
                score = task.score(parsed, sample.gt)
            except Exception as e:
                parsed, score = {}, {}
                error = error or f"parse/score: {type(e).__name__}: {e}"

            rows.append({
                "model": cfg.model.name,
                "dataset": cfg.data.name,
                "condition": sample.condition,
                "severity": sample.severity,
                "image_id": sample.image_id,
                "task": cfg.task.name,
                "prompt_version": cfg.task.prompt_version,
                "raw_output": raw_output,
                "parsed": parsed,
                "gt": sample.gt,
                "score": score,
                "latency_ms": latency_ms,
                "tokens_in": tokens_in,
                "tokens_out": tokens_out,
                "cost_usd": cost_usd,
                "error": error,
                "run_id": cfg.run_id,
            })

        path = write_predictions(rows, out_dir / "predictions.parquet")
        (out_dir / "summary.json").write_text(
            json.dumps({"n_rows": len(rows), "run_id": cfg.run_id}, indent=2)
        )
        logger.info("Wrote %d rows to %s", len(rows), path)
        return path
