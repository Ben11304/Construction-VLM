"""ConSynth-X release-v1 adapter — per-condition parquet shards.

Targets the harmonized v1 release laid out as:
    <data_root>/<root>/parquet/<release_condition>/{train__,test__,}*.parquet

Where:
  - `root` ∈ {cs10k, soda_voc, soda_ktsh}  (cs10k = ConstructionSite 10k upstream)
  - `release_condition` ∈ {fog_light, fog_medium, fog_heavy, rain_light,
        rain_heavy, snow_light, snow_heavy, night, rain_night, snow_night, small}
  - Files prefixed `train__` / `test__` carry split. Files without prefix have
    no train/test partition (whole shard).

The release schema (verified 2026-05-03 against the cs10k/soda_voc/soda_ktsh
shards on /fs/scratch) is harmonized across roots:
    image (bytes), image_id, source_id, source_dataset, condition,
    condition_labels, objects, pipeline, quality_scores, quality_alert,
    image_attributes, [rule_violations  — cs10k only]

Mapping vs. shared/glossary.md 7-class vocab:
    glossary "rain"  → release "rain_light"  (alias)
    glossary "clean" → NOT in release (license: cs10k upstream is CC-BY-NC-4.0,
                       not redistributed in v1). Adapter drops "clean" if asked
                       and reports it via .missing_conditions; user can opt-in
                       to load clean from upstream HF via a separate adapter
                       (planned, not in this release).
Other release conditions (fog_light, fog_medium, rain_night, snow_night, small)
are reachable by passing them in `conditions=` explicitly; they bypass the
glossary alias layer.

Resolution of `data_root`:
  1. DataConfig.extra["data_root"]
  2. env var CONSYNTH_DATA_ROOT
  3. fallback /fs/scratch/PGS0407/binben14/ConSynth-X-release-v1
"""

from __future__ import annotations

import os
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pyarrow.parquet as pq

from cveval.data.base import BaseDataset, DatasetSample
from cveval.data.registry import register_dataset

# Glossary 7-class vocab (from shared/glossary.md). Adapter exposes these names;
# any glossary→release alias is applied via _ALIAS.
GLOSSARY_CONDITIONS: list[str] = [
    "clean", "rain", "rain_heavy", "snow_light", "snow_heavy", "fog_heavy", "night",
]

CONDITION_SEVERITY: dict[str, str | None] = {
    "clean": None,
    "rain": "light",
    "rain_heavy": "heavy",
    "snow_light": "light",
    "snow_heavy": "heavy",
    "fog_heavy": "heavy",
    "night": None,
    # Extended (release-v1 only):
    "rain_light": "light",
    "fog_light": "light",
    "fog_medium": "medium",
    "rain_night": "heavy",
    "snow_night": "heavy",
    "small": None,
}

# glossary name → release directory name. Identity if not listed.
_ALIAS: dict[str, str] = {"rain": "rain_light"}

# Conditions known to be absent from release-v1 (license / pipeline reasons).
_NOT_IN_RELEASE: set[str] = {"clean"}

DEFAULT_DATA_ROOT = Path("/fs/scratch/PGS0407/binben14/ConSynth-X-release-v1")
ALLOWED_ROOTS: tuple[str, ...] = ("cs10k", "soda_voc", "soda_ktsh")

_UPSTREAM_GT_KEYS: tuple[str, ...] = (
    "objects", "image_attributes", "rule_violations",
    "pipeline", "quality_scores", "quality_alert",
    "condition_labels", "source_id", "source_dataset",
)


def _resolve_data_root(explicit: str | None) -> Path:
    if explicit:
        return Path(explicit).expanduser().resolve()
    env = os.environ.get("CONSYNTH_DATA_ROOT")
    if env:
        return Path(env).expanduser().resolve()
    return DEFAULT_DATA_ROOT


def _resolve_shards(data_root: Path, root: str, condition: str, split: str) -> list[Path]:
    """Return parquet files for (root, condition, split). Empty if condition dir missing.

    Split filtering rules (verified against release-v1 layout):
      - Files prefixed `train__` → split == 'train'.
      - Files prefixed `test__`  → split == 'test'.
      - Unprefixed files (e.g. `fog_heavy.parquet`) → match any split (whole-shard).
    """
    release_cond = _ALIAS.get(condition, condition)
    cond_dir = data_root / root / "parquet" / release_cond
    if not cond_dir.is_dir():
        return []
    out: list[Path] = []
    for p in sorted(cond_dir.glob("*.parquet")):
        name = p.name
        if name.startswith("train__"):
            if split == "train":
                out.append(p)
        elif name.startswith("test__"):
            if split == "test":
                out.append(p)
        else:
            out.append(p)
    return out


def _extract_image_bytes(cell: Any) -> bytes | None:
    """Release-v1 stores images as raw bytes; legacy HF dict layout tolerated too."""
    if cell is None:
        return None
    if isinstance(cell, (bytes, bytearray)):
        return bytes(cell)
    if isinstance(cell, dict):
        b = cell.get("bytes")
        if b:
            return bytes(b)
    return None


@register_dataset("consynthx")
class ConSynthXDataset(BaseDataset):
    """Per-condition iterator over ConSynth-X release-v1 parquet shards.

    Args (passed via DataConfig + DataConfig.extra):
      data_root: Path. Else env CONSYNTH_DATA_ROOT, else
        /fs/scratch/PGS0407/binben14/ConSynth-X-release-v1.
      root: 'cs10k' (default v0.1), 'soda_voc', or 'soda_ktsh'.
      conditions: subset of glossary or extended release names. None = all
        glossary conditions resolvable on this root (clean dropped, see
        _NOT_IN_RELEASE).
      n_per_condition: cap rows per condition (debug).
      split: 'test' (default) or 'train'. Whole-shard files (no train__/test__
        prefix) are loaded for either split.
    """

    def __init__(
        self,
        *,
        data_root: str | None = None,
        root: str = "cs10k",
        conditions: list[str] | None = None,
        n_per_condition: int | None = None,
        split: str = "test",
    ) -> None:
        if root not in ALLOWED_ROOTS:
            raise ValueError(f"Unknown root {root!r}; allowed = {ALLOWED_ROOTS}")
        self.data_root: Path = _resolve_data_root(data_root)
        self.root: str = root
        self.split: str = split
        self.n_per_condition: int | None = n_per_condition

        wanted = conditions if conditions else GLOSSARY_CONDITIONS
        unknown_severity = [c for c in wanted if c not in CONDITION_SEVERITY]
        if unknown_severity:
            raise ValueError(
                f"Unknown conditions {unknown_severity}; "
                f"glossary={GLOSSARY_CONDITIONS}, "
                f"extended={[c for c in CONDITION_SEVERITY if c not in GLOSSARY_CONDITIONS]}"
            )

        resolved: list[tuple[str, list[Path]]] = []
        missing: list[str] = []
        for cond in wanted:
            if cond in _NOT_IN_RELEASE:
                missing.append(cond)
                continue
            shards = _resolve_shards(self.data_root, root, cond, split)
            if not shards:
                missing.append(cond)
            else:
                resolved.append((cond, shards))
        if not resolved:
            raise FileNotFoundError(
                f"No ConSynth-X shards found under {self.data_root} for "
                f"root={root} split={split} conditions={wanted}. "
                f"Set CONSYNTH_DATA_ROOT or DataConfig.extra.data_root."
            )
        self._resolved: list[tuple[str, list[Path]]] = resolved
        self._missing: list[str] = missing

    @property
    def conditions(self) -> list[str]:
        return [c for c, _ in self._resolved]

    @property
    def missing_conditions(self) -> list[str]:
        return list(self._missing)

    def __len__(self) -> int:
        if not hasattr(self, "_len_cache"):
            total = 0
            for _, shards in self._resolved:
                rows = sum(pq.read_metadata(p).num_rows for p in shards)
                total += min(rows, self.n_per_condition) if self.n_per_condition else rows
            self._len_cache = total
        return self._len_cache

    def __iter__(self) -> Iterator[DatasetSample]:
        for cond, shards in self._resolved:
            severity = CONDITION_SEVERITY[cond]
            taken = 0
            for shard in shards:
                if self.n_per_condition is not None and taken >= self.n_per_condition:
                    break
                pf = pq.ParquetFile(str(shard))
                for batch in pf.iter_batches(batch_size=64):
                    rows = batch.to_pylist()
                    for row in rows:
                        if self.n_per_condition is not None and taken >= self.n_per_condition:
                            break
                        img_bytes = _extract_image_bytes(row.get("image"))
                        if img_bytes is None:
                            continue
                        image_id_raw = row.get("image_id") or row.get("source_id")
                        if image_id_raw is None:
                            continue
                        # Trust release-v1 `condition` column when present, but the
                        # adapter's authoritative tag is the glossary key (cond) so
                        # downstream metric breakdowns use the glossary vocab even if
                        # release names diverge (e.g. glossary 'rain' ↔ release 'rain_light').
                        upstream_gt = {
                            k: row[k] for k in _UPSTREAM_GT_KEYS if k in row and row[k] is not None
                        }
                        if "condition" in row:
                            upstream_gt["release_condition"] = row["condition"]
                        yield DatasetSample(
                            image_bytes=img_bytes,
                            gt={"condition": cond, "severity": severity},
                            image_id=f"{cond}/{image_id_raw}",
                            condition=cond,
                            severity=severity,
                            extra={
                                "root": self.root,
                                "shard": str(shard.relative_to(self.data_root))
                                if shard.is_relative_to(self.data_root) else str(shard),
                                "upstream_gt": upstream_gt,
                            },
                        )
                        taken += 1
                    if self.n_per_condition is not None and taken >= self.n_per_condition:
                        break


def _factory_from_config(cfg: Any) -> ConSynthXDataset:
    extra = getattr(cfg, "extra", {}) or {}
    return ConSynthXDataset(
        data_root=extra.get("data_root"),
        root=extra.get("root", "cs10k"),
        conditions=getattr(cfg, "conditions", None),
        n_per_condition=getattr(cfg, "n_per_condition", None),
        split=getattr(cfg, "split", "test"),
    )
