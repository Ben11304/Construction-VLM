#!/bin/bash
#SBATCH --job-name=cveval-qwen25vl-full
#SBATCH --account=pgs0407
#SBATCH --partition=nextgen
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=12
#SBATCH --gpus-per-node=1
#SBATCH --mem=128G
#SBATCH --time=06:00:00
#SBATCH --output=jobs/logs/%x-%j.out
#SBATCH --error=jobs/logs/%x-%j.err

set -euo pipefail

REPO=/users/PGS0407/binben14/VietHuy/ConstructionVLM-Eval
cd "$REPO"
mkdir -p jobs/logs results

module load python/3.10
module load pytorch/2.8.0

export PYTHONPATH="$REPO:${PYTHONPATH:-}"
export HF_HOME="${HF_HOME:-/fs/scratch/PGS0407/binben14/hf_cache}"
export HF_HUB_DISABLE_TELEMETRY=1
export TOKENIZERS_PARALLELISM=false
export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True
mkdir -p "$HF_HOME"

echo "[cveval] cluster=ascend host=$(hostname)"
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader || true
python -c "import torch; print(f'[cveval] torch={torch.__version__} cuda_avail={torch.cuda.is_available()} dev={torch.cuda.get_device_name(0) if torch.cuda.is_available() else None}')"

CONFIG=configs/runs/consynthx_condition_cls_full.yaml
python jobs/run_with_models.py run --config "$CONFIG"

RUN_ID=$(python -c "import yaml; print(yaml.safe_load(open('$CONFIG'))['run_id'])")
echo "[cveval] run_id=$RUN_ID"
ls -lh "results/$RUN_ID/" || true
