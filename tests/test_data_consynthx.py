"""Tests for cveval/data/consynthx.py — ConSynth-X release-v1 (parquet) adapter.

Hard-asserts when shards are reachable; auto-skips when they aren't, so CI
without the dataset still passes. NO mock samples (research_integrity rule).
"""

from __future__ import annotations

from pathlib import Path

import pytest

from cveval.data.base import DatasetSample
from cveval.data.consynthx import (
    ALLOWED_ROOTS,
    CONDITION_SEVERITY,
    DEFAULT_DATA_ROOT,
    GLOSSARY_CONDITIONS,
    ConSynthXDataset,
    _resolve_data_root,
    _resolve_shards,
)
from cveval.data.registry import DATASET_REGISTRY


def _data_root() -> Path | None:
    root = _resolve_data_root(None)
    return root if (root / "cs10k" / "parquet").is_dir() else None


REQUIRES_DATA = pytest.mark.skipif(
    _data_root() is None,
    reason="ConSynth-X release-v1 not reachable; set CONSYNTH_DATA_ROOT to enable.",
)


def test_registry_entry():
    assert "consynthx" in DATASET_REGISTRY
    assert DATASET_REGISTRY["consynthx"] is ConSynthXDataset


def test_default_data_root_points_to_scratch_release():
    assert str(DEFAULT_DATA_ROOT).endswith("ConSynth-X-release-v1")
    assert "/fs/scratch" in str(DEFAULT_DATA_ROOT)


def test_glossary_vocab_and_severity_invariants():
    assert GLOSSARY_CONDITIONS == [
        "clean", "rain", "rain_heavy", "snow_light", "snow_heavy", "fog_heavy", "night",
    ]
    # Every glossary condition has a severity entry; extended ones too.
    for c in GLOSSARY_CONDITIONS:
        assert c in CONDITION_SEVERITY
    assert CONDITION_SEVERITY["rain_heavy"] == "heavy"
    assert CONDITION_SEVERITY["snow_light"] == "light"
    assert CONDITION_SEVERITY["clean"] is None
    # Extended (release-v1) vocab present.
    for ext in ("rain_light", "fog_light", "fog_medium", "rain_night", "snow_night", "small"):
        assert ext in CONDITION_SEVERITY


def test_unknown_condition_rejected():
    with pytest.raises(ValueError):
        ConSynthXDataset(conditions=["sandstorm"])


def test_unknown_root_rejected():
    with pytest.raises(ValueError):
        ConSynthXDataset(root="not_a_real_root")


def test_allowed_roots():
    assert ALLOWED_ROOTS == ("cs10k", "soda_voc", "soda_ktsh")


@REQUIRES_DATA
def test_shard_resolution_picks_split_prefixed_files():
    # rain_light has both train__/test__ files — must filter by split.
    root = _data_root()
    test_shards = _resolve_shards(root, "cs10k", "rain", split="test")
    train_shards = _resolve_shards(root, "cs10k", "rain", split="train")
    # Glossary alias: rain → rain_light
    assert any("test__" in p.name for p in test_shards)
    assert any("train__" in p.name for p in train_shards)
    # No cross-contamination.
    assert not any("train__" in p.name for p in test_shards)
    assert not any("test__" in p.name for p in train_shards)


@REQUIRES_DATA
def test_unprefixed_shards_load_for_either_split():
    # fog_heavy has a single unprefixed file — should appear under both splits.
    root = _data_root()
    t = _resolve_shards(root, "cs10k", "fog_heavy", split="test")
    tr = _resolve_shards(root, "cs10k", "fog_heavy", split="train")
    assert t == tr and t  # same file, non-empty


@REQUIRES_DATA
def test_clean_is_dropped_with_explanation():
    # clean is not in release-v1; adapter must still construct on the
    # remaining glossary conditions and report clean as missing.
    ds = ConSynthXDataset(n_per_condition=1)
    assert "clean" in ds.missing_conditions
    assert "clean" not in ds.conditions


@REQUIRES_DATA
def test_iterate_first_sample_per_glossary_condition():
    ds = ConSynthXDataset(n_per_condition=1)
    seen: dict[str, DatasetSample] = {}
    for sample in ds:
        assert isinstance(sample, DatasetSample)
        assert sample.condition in GLOSSARY_CONDITIONS
        assert sample.gt["condition"] == sample.condition
        assert sample.gt["severity"] == CONDITION_SEVERITY[sample.condition]
        assert isinstance(sample.image_bytes, bytes) and len(sample.image_bytes) > 0
        assert sample.image_id.startswith(f"{sample.condition}/")
        assert "upstream_gt" in sample.extra
        # Release-v1 harmonized GT must surface at least image_attributes or objects.
        assert sample.extra["upstream_gt"], "upstream_gt empty"
        seen[sample.condition] = sample
    assert seen
    assert set(seen.keys()).issubset(set(ds.conditions))
    # All glossary conditions except 'clean' should be reachable on cs10k.
    expected = set(GLOSSARY_CONDITIONS) - {"clean"}
    assert set(ds.conditions) == expected


@REQUIRES_DATA
def test_n_per_condition_caps_iteration():
    ds = ConSynthXDataset(n_per_condition=2, conditions=["fog_heavy", "night"])
    counts: dict[str, int] = {}
    for s in ds:
        counts[s.condition] = counts.get(s.condition, 0) + 1
    assert counts == {"fog_heavy": 2, "night": 2}


@REQUIRES_DATA
def test_filter_to_single_condition_extended_vocab():
    # Extended-vocab condition (not in 7-class glossary) must still work explicitly.
    ds = ConSynthXDataset(conditions=["fog_medium"], n_per_condition=2)
    assert ds.conditions == ["fog_medium"]
    seen = list(ds)
    assert len(seen) <= 2
    if seen:
        assert all(s.condition == "fog_medium" for s in seen)


@REQUIRES_DATA
def test_soda_voc_root_works():
    ds = ConSynthXDataset(root="soda_voc", conditions=["fog_heavy"], n_per_condition=1)
    assert ds.conditions == ["fog_heavy"]
    s = next(iter(ds))
    assert s.extra["root"] == "soda_voc"
