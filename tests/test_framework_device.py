from unittest.mock import patch

from cveval.utils.device import select_device


def test_cuda_when_available():
    with patch("torch.cuda.is_available", return_value=True):
        assert select_device() == "cuda"


def test_mps_when_no_cuda():
    with patch("torch.cuda.is_available", return_value=False), \
         patch("torch.backends.mps.is_available", return_value=True):
        assert select_device() == "mps"


def test_cpu_fallback():
    with patch("torch.cuda.is_available", return_value=False), \
         patch("torch.backends.mps.is_available", return_value=False):
        assert select_device() == "cpu"


def test_force_cpu():
    assert select_device("cpu") == "cpu"
