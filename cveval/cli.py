"""CLI entry: `cveval run --config <yaml>` or composed flags. Typer-based."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import typer
import yaml

from cveval.config import DataConfig, ModelConfig, RunConfig, RunnerConfig, TaskConfig
from cveval.runner import LocalRunner

app = typer.Typer(add_completion=False, help="ConstructionVLM-Eval CLI")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")


def _load_yaml_config(path: Path) -> RunConfig:
    raw = yaml.safe_load(path.read_text())
    return RunConfig.model_validate(raw)


@app.command("run")
def run_cmd(
    config: Optional[Path] = typer.Option(None, "--config", "-c", exists=True),
    model: Optional[str] = typer.Option(None, "--model"),
    task: Optional[str] = typer.Option(None, "--task"),
    data: Optional[str] = typer.Option(None, "--data"),
    prompt_version: Optional[str] = typer.Option(None, "--prompt"),
    n_per_condition: Optional[int] = typer.Option(None, "--n-per-condition"),
    max_samples: Optional[int] = typer.Option(None, "--max-samples"),
    out_dir: Optional[Path] = typer.Option(None, "--out"),
    run_id: Optional[str] = typer.Option(None, "--run-id"),
) -> None:
    """Run a benchmark. Either pass --config <yaml> or compose via flags."""
    if config is not None:
        cfg = _load_yaml_config(config)
    else:
        if not (model and task and data and prompt_version and run_id):
            raise typer.BadParameter(
                "Without --config, must provide --model --task --data --prompt --run-id"
            )
        cfg = RunConfig(
            run_id=run_id,
            model=ModelConfig(name=model),
            data=DataConfig(name=data, n_per_condition=n_per_condition),
            task=TaskConfig(name=task, prompt_version=prompt_version),
            runner=RunnerConfig(
                **{
                    k: v
                    for k, v in {"max_samples": max_samples, "out_dir": out_dir}.items()
                    if v is not None
                }
            ),
        )

    path = LocalRunner(cfg).run()
    typer.echo(f"Wrote: {path}")


@app.command("list")
def list_cmd(kind: str = typer.Argument(..., help="models | datasets | tasks")) -> None:
    """List registered adapters."""
    from cveval.data.registry import DATASET_REGISTRY
    from cveval.models.registry import MODEL_REGISTRY
    from cveval.tasks.registry import TASK_REGISTRY

    table = {"models": MODEL_REGISTRY, "datasets": DATASET_REGISTRY, "tasks": TASK_REGISTRY}
    if kind not in table:
        raise typer.BadParameter(f"kind must be one of {list(table)}")
    for name in sorted(table[kind]):
        typer.echo(name)


if __name__ == "__main__":
    app()
