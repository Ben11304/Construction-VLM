import pytest
from pydantic import ValidationError

from cveval.config import DataConfig, ModelConfig, RunConfig, TaskConfig


def test_runconfig_minimal():
    c = RunConfig(
        run_id="t1",
        model=ModelConfig(name="m"),
        data=DataConfig(name="d"),
        task=TaskConfig(name="t", prompt_version="v1"),
    )
    assert c.runner.batch_size == 1
    assert c.runner.seed == 42


def test_runconfig_rejects_extra():
    with pytest.raises(ValidationError):
        RunConfig(
            run_id="t",
            model=ModelConfig(name="m"),
            data=DataConfig(name="d"),
            task=TaskConfig(name="t", prompt_version="v1"),
            unknown_field=1,
        )
