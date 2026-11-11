"""Jason Stys: release version, source cleanliness and archive acceptance contracts. Lines: docs/SOURCE_MAP.md."""

import hashlib
import json
import subprocess
import sys
import tomllib

import pytest

from tools import package_app


@pytest.mark.parametrize(
    "platform,modified", [("windows", False), ("linux", False), ("darwin", True)]
)
def test_collected_identity_preserves_build_and_actual_packaged_digests(
    tmp_path, platform, modified
):
    """Real independent binary bytes model macOS signing while both inner/outer manifests bind final bytes."""
    build = b"original compiled kernel"
    final_bytes = build + b"-ad-hoc-signature" if modified else build
    original_digest = hashlib.sha256(build).hexdigest()
    metadata = {"platform": platform, "kernel_sha256": original_digest, "source_commit": "a" * 40}
    worker = (
        tmp_path
        / "_internal/native"
        / ("airspace-kernel.exe" if platform == "windows" else "airspace-kernel")
    )
    worker.parent.mkdir(parents=True)
    worker.write_bytes(final_bytes)
    inner = tmp_path / "_internal/awareness/resources/RELEASE.json"
    inner.parent.mkdir(parents=True)
    inner.write_text(json.dumps(metadata))
    result = package_app.finalize_kernel_identity(tmp_path, metadata)
    assert result["kernel_build_sha256"] == original_digest
    assert result["kernel_sha256"] == hashlib.sha256(final_bytes).hexdigest()
    assert (
        json.loads(inner.read_text())
        == json.loads((tmp_path / "RELEASE.json").read_text())
        == result
    )
    assert metadata == {
        "platform": platform,
        "kernel_sha256": original_digest,
        "source_commit": "a" * 40,
    }


@pytest.mark.parametrize("platform", ["windows", "linux", "unknown"])
def test_unexpected_worker_transformation_is_not_silently_accepted(tmp_path, platform):
    """Only the explicitly documented macOS collection boundary permits a different binary digest."""
    worker = (
        tmp_path
        / "_internal/native"
        / ("airspace-kernel.exe" if platform == "windows" else "airspace-kernel")
    )
    worker.parent.mkdir(parents=True)
    worker.write_bytes(b"changed bytes")
    with pytest.raises(ValueError, match="outside macOS"):
        package_app.finalize_kernel_identity(
            tmp_path, {"platform": platform, "kernel_sha256": "0" * 64}
        )
    assert not (tmp_path / "RELEASE.json").exists()


def test_missing_or_oversized_collected_worker_cannot_write_success_identity(tmp_path):
    """The final hash cannot be copied from the source worker or taken from an excessive file."""
    metadata = {"platform": "darwin", "kernel_sha256": "0" * 64}
    with pytest.raises(FileNotFoundError):
        package_app.finalize_kernel_identity(tmp_path, metadata)
    worker = tmp_path / "_internal/native/airspace-kernel"
    worker.parent.mkdir(parents=True)
    worker.write_bytes(b"x" * (2 * 1024 * 1024 + 1))
    with pytest.raises(ValueError, match="2 MiB"):
        package_app.finalize_kernel_identity(tmp_path, metadata)
    assert not (tmp_path / "RELEASE.json").exists()


def test_wrong_collected_manifest_and_empty_worker_fail_before_manifest_rewrite(tmp_path):
    """A neighboring stale identity cannot be rebound to new worker bytes and presented as this build."""
    worker = tmp_path / "_internal/native/airspace-kernel"
    worker.parent.mkdir(parents=True)
    worker.write_bytes(b"")
    metadata = {"platform": "darwin", "kernel_sha256": "a" * 64}
    with pytest.raises(ValueError, match="missing"):
        package_app.finalize_kernel_identity(tmp_path, metadata)
    worker.write_bytes(b"real collected bytes")
    inner = tmp_path / "_internal/awareness/resources/RELEASE.json"
    inner.parent.mkdir(parents=True)
    prior = '{"source_commit":"unrelated"}'
    inner.write_text(prior)
    with pytest.raises(ValueError, match="identity differs"):
        package_app.finalize_kernel_identity(tmp_path, metadata)
    assert inner.read_text() == prior and not (tmp_path / "RELEASE.json").exists()


@pytest.mark.parametrize(
    "version,level,allowed",
    [
        ((), "final", False),
        ((3, 14, 6), "final", False),
        ((3, 12, 16), "final", False),
        ((3, 14, 10), "candidate", False),
        ((3, 14, 10), "final", True),
        ((3, 14, 11), "final", True),
        ((3, 15, 0), "final", False),
    ],
)
def test_freeze_refuses_old_cached_or_prerelease_runtime(version, level, allowed):
    """A clean source checkout cannot hide an outdated or experimental embedded Python runtime."""
    assert package_app.build_python_supported(version, level) is allowed


def test_all_product_version_surfaces_agree():
    """The GUI product version stays distinct from its unchanged independent Rust component."""
    assert package_app.configuration() == "0.2.0"
    native = tomllib.loads((package_app.ROOT / "Cargo.toml").read_text())["package"]
    assert native["name"] == "airspace-kernel" and native["version"] == "0.1.0"


@pytest.mark.parametrize(
    "surface", ["project", "package", "lock", "lock-root", "runtime", "product"]
)
def test_mismatched_version_or_identity_cannot_build(tmp_path, surface):
    """Independent tiny real files expose any one stale or wrong product/version declaration."""
    root = package_app.ROOT
    for path in ("pyproject.toml", "package.json", "package-lock.json", "awareness/__init__.py"):
        output = tmp_path / path
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes((root / path).read_bytes())
    selected = {
        "project": "pyproject.toml",
        "package": "package.json",
        "lock": "package-lock.json",
        "lock-root": "package-lock.json",
        "runtime": "awareness/__init__.py",
        "product": "package.json",
    }[surface]
    path = tmp_path / selected
    if surface in {"project", "runtime"}:
        path.write_text(path.read_text().replace("0.2.0", "0.1.0"))
    else:
        value = json.loads(path.read_text())
        if surface == "lock-root":
            value["packages"][""]["version"] = "0.1.0"
        elif surface == "product":
            value["name"] = "other-project"
        else:
            value["version"] = "0.1.0"
        path.write_text(json.dumps(value))
    with pytest.raises(ValueError, match="mismatch"):
        package_app.configuration(tmp_path)


@pytest.mark.parametrize(
    "dirty,ci,override,sha,allowed",
    [
        (False, False, False, None, True),
        (True, False, False, None, False),
        (True, False, True, None, True),
        (True, True, True, "a" * 40, False),
        (False, True, True, "a" * 40, False),
        (False, True, False, "b" * 40, False),
        (False, True, False, "a" * 40, True),
    ],
)
def test_source_cleanliness_is_not_a_release_flag_waiver(
    monkeypatch, dirty, ci, override, sha, allowed
):
    """Local uncommitted candidate is explicit; CI cannot use the override or a different checkout."""

    def output(command, **_kwargs):
        return (
            "a" * 40 + "\n"
            if command[-2:] == ["rev-parse", "HEAD"]
            else " M source.py\n"
            if dirty
            else ""
        )

    monkeypatch.setattr(package_app.subprocess, "check_output", output)
    monkeypatch.setattr(package_app, "kernel_digest", lambda: "c" * 64)
    monkeypatch.setenv("GITHUB_ACTIONS", "true" if ci else "false")
    if sha:
        monkeypatch.setenv("GITHUB_SHA", sha)
    if not allowed:
        with pytest.raises(ValueError):
            package_app.source_metadata("0.2.0", allow_dirty=override)
    else:
        value = package_app.source_metadata("0.2.0", allow_dirty=override)
        assert value["source_commit"] == "a" * 40 and value["source_dirty"] is dirty


def test_archive_rejection_remains_active_with_optimized_python():
    """An actual optimized child still rejects path escape before creating any output."""
    result = subprocess.run(
        [
            sys.executable,
            "-O",
            "-c",
            "from tools.portable_archive import safe_name; safe_name('../escape', 'ExampleApp')",
        ],
        cwd=package_app.ROOT,
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert result.returncode != 0 and "Unsafe archive member path" in result.stderr
