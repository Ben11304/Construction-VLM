"""Pydantic v2 configs. CLI flags > YAML > defaults. Dump effective_config.yaml per run."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

DeviceLiteral = Literal["auto", "cuda", "mps", "cpu"]


class ModelConfig(BaseModel):
    name: str = Field(..., description="Registry key, e.g. 'qwen2.5-vl-7b'.")
    revision: str | None = Field(None, description="HF SHA or git tag (pin, no 'main').")
    backend: Literal["hf", "vllm", "api"] = "hf"
    dtype: Literal["auto", "float16", "bfloat16", "float32"] = "auto"
    max_new_tokens: int = 256
    temperature: float = 0.0
    extra: dict[str, Any] = Field(default_factory=dict)


class DataConfig(BaseModel):
    name: str = Field(..., description="Registry key, e.g. 'consynthx_kaggle_v6'.")
    split: str = "test"
    n_per_condition: int | None = Field(None, ge=1, description="Cap per condition (debug).")
    conditions: list[str] | None = Field(None, description="Subset filter; None = all.")
    extra: dict[str, Any] = Field(default_factory=dict)


class TaskConfig(BaseModel):
    name: str = Field(..., description="Registry key, e.g. 'condition_cls'.")
    prompt_version: str = Field(..., description="e.g. 'v2_definitions'.")
    extra: dict[str, Any] = Field(default_factory=dict)


class RunnerConfig(BaseModel):
    batch_size: int = 1
    device: DeviceLiteral = "auto"
    max_samples: int | None = Field(None, ge=1)
    cache_dir: Path = Path("~/.cache/cveval").expanduser()
    out_dir: Path = Path("./results")
    seed: int = 42
    use_cache: bool = True

    @field_validator("cache_dir", "out_dir", mode="before")
    @classmethod
    def _expand(cls, v: Any) -> Path:
        return Path(str(v)).expanduser()


class RunConfig(BaseModel):
    """Top-level config. One YAML file or composed via CLI flags."""

    run_id: str = Field(..., description="Unique run identifier; default = timestamp+hash.")
    model: ModelConfig
    data: DataConfig
    task: TaskConfig
    runner: RunnerConfig = Field(default_factory=RunnerConfig)

    model_config = {"extra": "forbid"}
