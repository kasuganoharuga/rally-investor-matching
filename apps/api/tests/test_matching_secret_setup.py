import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPT = REPO_ROOT / "scripts/aws/configure-matching-secret.sh"


def bash_path(path: Path) -> str:
    """Git Bash needs POSIX paths for its coreutils on Windows."""
    value = path.as_posix()
    if sys.platform == "win32":
        return f"/{value[0].lower()}{value[2:]}"
    return value


def run_setup(tmp_path: Path) -> subprocess.CompletedProcess[str]:
    if sys.platform == "win32":
        shell = Path(os.environ.get("PROGRAMFILES", "C:/Program Files")) / (
            "Git/bin/bash.exe"
        )
        bash = str(shell) if shell.is_file() else None
    else:
        bash = shutil.which("bash")
    if not bash:
        pytest.skip("Bash is required for AWS environment setup tests")
    return subprocess.run(
        [bash, bash_path(SCRIPT)],
        env={
            **os.environ,
            "RALLY_WEB_ENV_FILE": bash_path(tmp_path / "web.env"),
            "RALLY_API_ENV_FILE": bash_path(tmp_path / "api.env"),
            "RALLY_PYTHON_BIN": bash_path(Path(sys.executable)),
        },
        capture_output=True,
        text=True,
        check=False,
    )


def test_generate_shared_secret_without_logging_and_keep_it_on_rerun(
    tmp_path: Path,
) -> None:
    (tmp_path / "web.env").write_text("APP_BASE_URL=https://example.test\n")
    (tmp_path / "api.env").write_text("APP_ENV=aws-dev\n")
    result = run_setup(tmp_path)
    assert result.returncode == 0, result.stderr
    web_env = (tmp_path / "web.env").read_text()
    api_env = (tmp_path / "api.env").read_text()
    found = re.search(r"RALLY_MATCHING_API_SECRET=([a-f0-9]{64})", web_env)
    assert found is not None
    key = found.group(1)
    assert f"RALLY_MATCHING_API_SECRET={key}\n" in api_env
    assert "APP_BASE_URL=https://example.test\n" in web_env
    assert "APP_ENV=aws-dev\n" in api_env
    assert key not in result.stdout + result.stderr
    rerun = run_setup(tmp_path)
    assert rerun.returncode == 0, rerun.stderr
    assert (tmp_path / "web.env").read_text() == web_env
    assert (tmp_path / "api.env").read_text() == api_env
    assert key not in rerun.stdout + rerun.stderr


def test_existing_quoted_key_is_reused_for_missing_side(tmp_path: Path) -> None:
    key = "a" * 64
    (tmp_path / "web.env").write_text(f"RALLY_MATCHING_API_SECRET='{key}'\n")
    (tmp_path / "api.env").write_text("APP_ENV=aws-dev\n")
    result = run_setup(tmp_path)
    assert result.returncode == 0, result.stderr
    assert f"RALLY_MATCHING_API_SECRET={key}\n" in (tmp_path / "api.env").read_text()
    assert key not in result.stdout + result.stderr


@pytest.mark.parametrize(
    "web_value,api_value",
    [
        ("a" * 64, "b" * 64),
        ("rally-local-only-matching-key-change-for-deployment", ""),
        ("short", ""),
        ("'$(echo do-not-evaluate)'", ""),
        ("a" * 64 + "\nRALLY_MATCHING_API_SECRET=" + "a" * 64, ""),
    ],
)
def test_reject_bad_config_without_mutating_either_file(
    tmp_path: Path,
    web_value: str,
    api_value: str,
) -> None:
    web_contents = f"RALLY_MATCHING_API_SECRET={web_value}\n"
    api_contents = f"RALLY_MATCHING_API_SECRET={api_value}\n"
    (tmp_path / "web.env").write_text(web_contents)
    (tmp_path / "api.env").write_text(api_contents)
    result = run_setup(tmp_path)
    assert result.returncode != 0
    assert (tmp_path / "web.env").read_text() == web_contents
    assert (tmp_path / "api.env").read_text() == api_contents
    assert web_value not in result.stdout + result.stderr
