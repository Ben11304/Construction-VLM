"""ConstructionVLM-Eval — VLM benchmark framework for ConSynth-X."""

from cveval.config import (
    DataConfig,
    ModelConfig,
    RunConfig,
    RunnerConfig,
    TaskConfig,
)
from cveval.data.base import BaseDataset, DatasetSample
from cveval.data.registry import DATASET_REGISTRY, register_dataset
from cveval.models.base import BaseVLM, ChatMessage
from cveval.models.registry import MODEL_REGISTRY, register_model
from cveval.tasks.base import BaseTask, ParsedOutput, ScoreDict
from cveval.tasks.registry import TASK_REGISTRY, register_task

__version__ = "0.1.0"

__all__ = [
    "BaseDataset",
    "BaseTask",
    "BaseVLM",
    "ChatMessage",
    "DATASET_REGISTRY",
    "DataConfig",
    "DatasetSample",
    "MODEL_REGISTRY",
    "ModelConfig",
    "ParsedOutput",
    "RunConfig",
    "RunnerConfig",
    "ScoreDict",
    "TASK_REGISTRY",
    "TaskConfig",
    "register_dataset",
    "register_model",
    "register_task",
]
