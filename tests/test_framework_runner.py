"""Contract test: runner orchestrates fake adapter triple end-to-end → parquet."""

from __future__ import annotations

import pandas as pd

from cveval.config import DataConfig, ModelConfig, RunConfig, RunnerConfig, TaskConfig
from cveval.runner import LocalRunner


def test_runner_e2e_with_fakes(fake_adapters, tmp_path):
    cfg = RunConfig(
        run_id="unit_001",
        model=ModelConfig(name=fake_adapters["model"]),
        data=DataConfig(name=fake_adapters["dataset"]),
        task=TaskConfig(name=fake_adapters["task"], prompt_version="v1"),
        runner=RunnerConfig(
            out_dir=tmp_path / "out",
            cache_dir=tmp_path / "cache",
            use_cache=False,
        ),
    )
    path = LocalRunner(cfg).run()
    df = pd.read_parquet(path)

    assert len(df) == 2
    required = {"model", "dataset", "condition", "image_id", "task",
                "prompt_version", "raw_output", "parsed", "gt", "score",
                "latency_ms", "run_id"}
    assert required.issubset(df.columns)
    assert (df["model"] == fake_adapters["model"]).all()
    assert (df["run_id"] == "unit_001").all()
