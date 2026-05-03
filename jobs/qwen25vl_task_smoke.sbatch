#!/bin/bash
# Parametrized smoke runner. Submit with --export=ALL,TASK=<name>:
#   sbatch -M pitzer --export=ALL,TASK=description_gen jobs/qwen25vl_task_smoke.sbatch
# TASK ∈ {description_gen, safety_vqa, vlm_detection}
#SBATCH --job-name=cveval-qwen25vl-smoke
#SBATCH --account=pgs0407
#SBATCH --partition=gpu-exp
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=8
#SBATCH --gpus-per-node=1
#SBATCH --mem=64G
#SBATCH --time=01:30:00
#SBATCH --output=jobs/logs/%x-%j.out
#SBATCH --error=jobs/logs/%x-%j.err

set -euo pipefail

TASK="${TASK:?must export TASK=description_gen|safety_vqa|vlm_detection}"

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

echo "[cveval] task=$TASK host=$(hostname)"
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader || true

CONFIG="configs/runs/consynthx_${TASK}_smoke.yaml"
python jobs/run_with_models.py run --config "$CONFIG"

RUN_ID=$(python -c "import yaml; print(yaml.safe_load(open('$CONFIG'))['run_id'])")
echo "[cveval] run_id=$RUN_ID"
ls -lh "results/$RUN_ID/" || true
