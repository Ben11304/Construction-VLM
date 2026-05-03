#!/bin/bash
#SBATCH --job-name=cveval-smolvlm-smoke
#SBATCH --account=pgs0407
#SBATCH --partition=gpu-exp
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=8
#SBATCH --gpus-per-node=1
#SBATCH --mem=32G
#SBATCH --time=00:45:00
#SBATCH --output=jobs/logs/%x-%j.out
#SBATCH --error=jobs/logs/%x-%j.err

set -euo pipefail

REPO=/users/PGS0407/binben14/VietHuy/ConstructionVLM-Eval
cd "$REPO"
mkdir -p jobs/logs results

module load python/3.10
module load pytorch/2.8.0     # torch 2.8 cu128 + transformers 4.57

export PYTHONPATH="$REPO:${PYTHONPATH:-}"
export HF_HOME="${HF_HOME:-/fs/scratch/PGS0407/binben14/hf_cache}"
export TRANSFORMERS_CACHE="$HF_HOME"
export HF_HUB_DISABLE_TELEMETRY=1
export TOKENIZERS_PARALLELISM=false
mkdir -p "$HF_HOME"

echo "[cveval] host=$(hostname) gpu=$(nvidia-smi --query-gpu=name --format=csv,noheader || echo none)"
echo "[cveval] python=$(python --version)"
python -c "import torch; print(f'[cveval] torch={torch.__version__} cuda_avail={torch.cuda.is_available()}')"

CONFIG=configs/runs/consynthx_condition_cls_smolvlm_smoke.yaml

python jobs/run_with_models.py run --config "$CONFIG"

RUN_ID=$(python -c "import yaml; print(yaml.safe_load(open('$CONFIG'))['run_id'])")
echo "[cveval] run_id=$RUN_ID"
ls -lh "results/$RUN_ID/" || true
