"""Jason Stys: public-source hygiene, immutable CI and payload budgets. Lines: docs/SOURCE_MAP.md."""

import gzip
import re

from docs_index import ROOT, files, public_text


def main():
    """Check narrow high-confidence secrets, documented source headers and storage-conscious workflows."""
    for path in files():
        relative = path.relative_to(ROOT).as_posix()
        value = public_text(path)
        if path.suffix in {".py", ".rs", ".ts", ".mjs"}:
            assert "Jason Stys:" in value[:600] and "docs/SOURCE_MAP.md" in value[:600], relative
        assert not re.search(r"(?:ghp_|github_pat_)[A-Za-z0-9_]{30,}", value), relative
        assert ("-----BEGIN " + "PRIVATE KEY-----") not in value, relative
        if relative.startswith(".github/workflows/"):
            for ref in re.findall(r"uses:\s*([^\s]+)", value):
                assert re.search(r"@[0-9a-f]{40}$", ref), ref
            assert "upload-artifact" not in value and "actions/cache" not in value
    for suffix, budget in [("js", 40_000), ("css", 12_000)]:
        size = sum(
            len(gzip.compress(p.read_bytes())) for p in (ROOT / "dist/assets").glob(f"*.{suffix}")
        )
        assert 0 < size <= budget, (suffix, size, budget)
        print(f"Built {suffix}: {size} gzip bytes / {budget} budget")
    assert "dependencies" not in (ROOT / "Cargo.toml").read_text(), (
        "Native kernel must stay dependency-free"
    )
    print("Public-source hygiene and pinned CI verified")


if __name__ == "__main__":
    main()
