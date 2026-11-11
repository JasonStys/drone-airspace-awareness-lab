"""Jason Stys: exact current Word remains privacy-scanned, bounded and macro-free. Lines: docs/SOURCE_MAP.md."""

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

import pytest

from tools import docs_index as policy


def current_word(root: Path, extra: dict[str, str] | None = None) -> Path:
    """Create genuine compressed ZIP XML independently of the named-edition reader."""
    path = root / "docs/reports/windows-application-guide-0.2.0.docx"
    path.parent.mkdir(parents=True)
    with ZipFile(path, "x", compression=ZIP_DEFLATED) as package:
        package.writestr("[Content_Types].xml", "<Types/>")
        package.writestr("word/document.xml", "<document>current-guide-visible</document>")
        package.writestr(
            "word/_rels/document.xml.rels", "<Relationship>relationship-visible</Relationship>"
        )
        for name, value in (extra or {}).items():
            package.writestr(name, value)
    return path


def test_exact_current_word_exposes_text_and_relationships(tmp_path, monkeypatch):
    """The real new edition supplies full XML text rather than a skipped-file placeholder."""
    monkeypatch.setattr(policy, "ROOT", tmp_path)
    text = policy.public_text(current_word(tmp_path))
    assert "current-guide-visible" in text and "relationship-visible" in text


@pytest.mark.parametrize("part", ["word/document-extra.xml", "word/_rels/extra.rels"])
def test_current_guide_credential_parts_remain_visible(tmp_path, monkeypatch, part):
    """Credential patterns in either actual Word XML or relationships are visible to the existing guard."""
    monkeypatch.setattr(policy, "ROOT", tmp_path)
    marker = "ghp_" + "A" * 32
    text = policy.public_text(current_word(tmp_path, {part: f"<x>{marker}</x>"}))
    assert marker in text


@pytest.mark.parametrize("member", ["word/vbaProject.bin", "word/embeddings/inert.bin"])
def test_current_guide_active_parts_are_refused(tmp_path, monkeypatch, member):
    """The newly admitted exact name retains real-ZIP macro and embedded-object rejection."""
    monkeypatch.setattr(policy, "ROOT", tmp_path)
    with pytest.raises(ValueError, match="unsupported"):
        policy.public_text(current_word(tmp_path, {member: "inert bytes"}))


def test_current_guide_keeps_xml_budget(tmp_path, monkeypatch):
    """A genuinely compressed oversized relationship cannot expand the existing two MiB XML budget."""
    monkeypatch.setattr(policy, "ROOT", tmp_path)
    path = current_word(tmp_path, {"word/_rels/huge.rels": "x" * (2 * 1024 * 1024)})
    with pytest.raises(ValueError, match="XML exceeds"):
        policy.public_text(path)


def test_unknown_binary_is_not_a_current_edition(tmp_path, monkeypatch):
    """Other filenames retain strict UTF-8 refusal instead of inheriting an Office exclusion."""
    monkeypatch.setattr(policy, "ROOT", tmp_path)
    current = current_word(tmp_path)
    unknown = current.with_name("unreviewed-current.docx")
    unknown.write_bytes(current.read_bytes() + b"\xff")
    with pytest.raises(UnicodeDecodeError):
        policy.public_text(unknown)
