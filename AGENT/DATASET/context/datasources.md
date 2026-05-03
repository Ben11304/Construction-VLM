# Data Sources — Authoritative Citation Pack

Mỗi dataset phải có 1 entry. Citation chưa verify → đánh `[VERIFY]`. KHÔNG bịa
DOI / row count / license.

## ConSynth-X (release v1)

- **Authoritative name**: ConSynth-X
- **HF dataset**: `Ben11304/ConSynth-X-augmentation`
- **Row count (release v1)**: 122,156 rows / 35 shards (shipped 2026-04-30)
- **Format**: Arrow shards
- **License**: **CC-BY-NC-4.0** (kế thừa từ ConstructionSite 10k upstream — primary
  source). Verified 2026-05-03 against `../ConSynth-X/docs/data_sources.md` §1.
  HF dataset card riêng của ConSynth-X v1 hiện ghi `CC0-1.0` cho repo upload —
  conflict với upstream license; downstream sử dụng PHẢI tuân CC-BY-NC-4.0.
  `[VERIFY]` còn treo: confirm với upstream maintainer xem CC0 trên HF có
  override license upstream không (nghi vấn chưa relicense hợp lệ).
- **Repo gốc**: sibling `../ConSynth-X/`
- **Mirrors**: Kaggle, Google Drive (xem dataset card cho link chính thức).
- **Paper**: ConSynth-X — `[VERIFY DOI/preprint URL]`. Khi cite trong `cveval`
  README, dùng BibTeX entry trong file này (chưa có → escalate user).
- **Generators per condition** (authoritative; xem ConSynth-X glossary):
  Fog = Depth Anything V2 + Koschmieder; Rain/Snow = InstructPix2Pix + physics
  overlay; Night = CycleGAN-Turbo; Small (outpainting) = FLUX.1-Fill-dev.
- **Schema GT** (`[VERIFY]`): cần map sang canonical
  `(image_bytes, gt, image_id, condition)` của FRAMEWORK.

### Upstream sources (ConSynth-X = augmentation, KHÔNG tự sinh ảnh nền)

ConSynth-X augment weather (fog/rain/snow/night) + small-object outpaint **lên ảnh
gốc** của 3 dataset upstream, kế thừa split (train/test) và label (VOC bbox /
detection class / safety rule). Image_id trong ConSynth-X traceable về source →
**ground truth của task upstream reusable** trên ConSynth-X clean-side và cho
paired clean↔aug eval.

#### 1. ConstructionSite 10k (primary)
- **HF**: `LouisChen15/ConstructionSite`
- **Total**: 10,013 images (train 7,009 / test 3,004)
- **Classes**: excavator, rebar, worker_with_white_hard_hat (3 detection classes)
- **Annotations**: detailed caption + 4 safety-rule violation
  (rule_1=PPE, rule_2=harness, rule_3=edge protection, rule_4=excavator radius)
  + scene attributes (illumination, camera_distance, view, quality_of_info)
- **License**: CC-BY-NC-4.0 (HF requires login + contact-info agreement)
- **Paper**: Chen, X. & Zou, Z. (2025). "Are Large Pre-trained Vision Language
  Models Effective Construction Safety Inspectors?" arXiv:2508.11011.
- **BibTeX**:
  ```bibtex
  @misc{chen2025largepretrainedvisionlanguage,
    title  = {Are Large Pre-trained Vision Language Models Effective Construction Safety Inspectors?},
    author = {Xuezheng Chen and Zhengbo Zou},
    year   = {2025}, eprint = {2508.11011},
    archivePrefix = {arXiv}, primaryClass = {cs.CV},
    url = {https://arxiv.org/abs/2508.11011}
  }
  ```
- **Reference impl**: `../ConstructionSite-10k-Implementation/Evaluations/`
  (description / object_detection / safety_violation_vqa). Reusable cho `cveval`
  task port (post-v0.1).

#### 2. SODA-VOC
- **Total**: 19,846 images, VOC-style detection annotations
- **Categories**: workers / materials / machines / layout
- **Paper**: Duan, R. et al. (2022). "SODA: A large-scale open site object
  detection dataset for deep learning in construction." *Automation in
  Construction*, 142, 104499. DOI:10.1016/j.autcon.2022.104499.

#### 3. SODA-KTSH (auxiliary)
- **Total**: 9,988 source images, 16 construction scene categories +
  vision-language annotations.
- **Paper**: Deng, H. et al. (2025). "Enabling High-Level Worker-Centric
  Semantic Understanding of Onsite Images Using Visual Language Models with
  Attention Mechanism and Beam Search Strategy." *Buildings*, 15(6), 959.

#### Authors of ConSynth-X
Viet Huy Duong¹ · Ruoxin Xiong, Ph.D.². Cite as `duong2026consynthx` (xem
`../ConSynth-X/data_card.md`).

### Release-v1 on /fs/scratch (authoritative for v0.1)

- **Local path**: `/fs/scratch/PGS0407/binben14/ConSynth-X-release-v1/`
  (35 parquet shards, harmonized schema). HF mirror:
  `Ben11304/ConSynth-X-augmentation`. Kaggle mirror: `[VERIFY URL]`.
- **Layout**: `<data_root>/<root>/parquet/<release_condition>/{train__,test__,}*.parquet`
  - `root` ∈ {cs10k, soda_voc, soda_ktsh}
  - `release_condition` ∈ {fog_light, fog_medium, fog_heavy, rain_light,
    rain_heavy, snow_light, snow_heavy, night, rain_night, snow_night, small}
- **Schema** (verified 2026-05-03 against fog_heavy / night / rain_heavy
  shards): `image (bytes), image_id, source_id, source_dataset, condition,
  condition_labels, objects, pipeline, quality_scores, quality_alert,
  image_attributes`, plus `rule_violations` on cs10k root only.
- **Glossary→release mapping**:
  - `rain` → `rain_light` (alias)
  - `rain_heavy, snow_light, snow_heavy, fog_heavy, night` → identity
  - `clean` → release dir `original/` (added 2026-05-03; cs10k 3,004 rows).
    Severity = none. All 7 glossary conditions now reachable on cs10k.
- **Adapter**: `cveval/data/consynthx.py` (registry key `consynthx`,
  `BaseDataset` v1.1.0). Resolution: `DataConfig.extra.data_root` →
  `$CONSYNTH_DATA_ROOT` → default `/fs/scratch/PGS0407/binben14/ConSynth-X-release-v1`.

## (Template cho dataset thêm sau)

```
### <Dataset Name>
- Authoritative name:
- Source URL:
- License:
- Paper / DOI:
- BibTeX:
- Row count:
- Schema GT:
- Mapping → canonical contract:
- Notes / [VERIFY]:
```
