"""Function-style metric registry. Adapters live in DATASET agent's scope."""

from __future__ import annotations

from typing import Callable

import pandas as pd

MetricFn = Callable[[pd.DataFrame], dict]
METRIC_REGISTRY: dict[str, MetricFn] = {}


def register_metric(name: str) -> Callable[[MetricFn], MetricFn]:
    def deco(fn: MetricFn) -> MetricFn:
        if name in METRIC_REGISTRY:
            raise ValueError(f"Metric {name!r} already registered")
        METRIC_REGISTRY[name] = fn
        return fn
    return deco


__all__ = ["METRIC_REGISTRY", "MetricFn", "register_metric"]
