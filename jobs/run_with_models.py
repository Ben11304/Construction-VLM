"""Entry script — pre-import VLM adapters then dispatch to cveval CLI.

Lý do tồn tại: `cveval.models.__init__` (FRAMEWORK scope) hiện chưa auto-load
adapter cụ thể; runner gọi MODEL_REGISTRY[name] sẽ KeyError. Script này import
adapter VLM rồi forward argv sang `cveval.cli`. KHÔNG sửa file FRAMEWORK.
"""

from __future__ import annotations

import sys

import cveval.data.consynthx  # noqa: F401  register("consynthx")
import cveval.models.qwen2_5_vl  # noqa: F401  register("qwen2.5-vl-7b")
import cveval.models.smolvlm  # noqa: F401  register("smolvlm-256m")
import cveval.tasks.condition_cls  # noqa: F401  register("condition_cls")

from cveval.cli import app

if __name__ == "__main__":
    sys.argv[0] = "cveval"
    app()
