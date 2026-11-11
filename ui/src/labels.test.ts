/** Jason Stys: independent collision/boundary/dense-label oracles. Map: docs/SOURCE_MAP.md. */
import { describe, expect, it } from "vitest";
import {
  overlaps,
  placeLabels,
  type LabelAnchor,
  type LabelBox,
} from "./labels";

/** Separate interval-separation oracle; never calls the production overlap helper. */
function separate(a: LabelBox, b: LabelBox): boolean {
  return (
    a.x + a.width + 3 <= b.x ||
    b.x + b.width + 3 <= a.x ||
    a.y + a.height + 3 <= b.y ||
    b.y + b.height + 3 <= a.y
  );
}

function verify(anchors: LabelAnchor[], output: (LabelBox | null)[]): void {
  const placed = output.filter((value): value is LabelBox => value !== null);
  for (const box of placed) {
    expect(box.x).toBeGreaterThanOrEqual(8);
    expect(box.y).toBeGreaterThanOrEqual(8);
    expect(box.x + box.width).toBeLessThanOrEqual(592);
    expect(box.y + box.height).toBeLessThanOrEqual(592);
    for (const anchor of anchors)
      expect(
        separate(box, {
          x: anchor.x - 8,
          y: anchor.y - 8,
          width: 16,
          height: 16,
        }),
      ).toBe(true);
  }
  for (let i = 0; i < placed.length; i += 1)
    for (let j = i + 1; j < placed.length; j += 1)
      expect(separate(placed[i] as LabelBox, placed[j] as LabelBox)).toBe(true);
}

describe("measured SVG label placement", () => {
  it("separates close labels and preserves caller-owned marker coordinates", () => {
    const anchors = [
      { x: 300, y: 300, width: 110, height: 24 },
      { x: 308, y: 302, width: 130, height: 24 },
    ];
    const before = structuredClone(anchors);
    const result = placeLabels(anchors);
    expect(result.every((value) => value !== null)).toBe(true);
    verify(anchors, result);
    expect(anchors).toEqual(before);
  });
  it("clamps all corners while leaving room around actual markers", () => {
    const anchors = [
      [4, 4],
      [596, 4],
      [4, 596],
      [596, 596],
    ].map(([x, y]) => ({
      x: x as number,
      y: y as number,
      width: 150,
      height: 24,
    }));
    const result = placeLabels(anchors);
    expect(result.every((value) => value !== null)).toBe(true);
    verify(anchors, result);
  });
  it("uses explicit fallback for dense64 rather than overlapping names", () => {
    const anchors = Array.from({ length: 64 }, () => ({
      x: 300,
      y: 300,
      width: 260,
      height: 24,
    }));
    const result = placeLabels(anchors);
    expect(result[0]).not.toBeNull();
    expect(result.some((value) => value === null)).toBe(true);
    verify(anchors, result);
    expect(placeLabels(anchors)).toEqual(result);
  });
  it("handles a seeded spatial grid without clipping or hiding markers", () => {
    const anchors = Array.from({ length: 64 }, (_, i) => ({
      x: 30 + (i % 8) * 77,
      y: 30 + Math.floor(i / 8) * 77,
      width: 80 + (i % 3) * 20,
      height: 22,
    }));
    verify(anchors, placeLabels(anchors));
    expect(placeLabels([])).toEqual([]);
    expect(() =>
      placeLabels(Array.from({ length: 65 }, () => anchors[0] as LabelAnchor)),
    ).toThrow(RangeError);
  });
  it.each([
    { x: Number.NaN },
    { y: Number.POSITIVE_INFINITY },
    { width: 0 },
    { width: -1 },
    { height: 0 },
    { height: -1 },
    { width: 585 },
    { height: 585 },
  ])("never renders invalid measured geometry %j", (change) => {
    const anchor = { x: 300, y: 300, width: 100, height: 20, ...change };
    expect(placeLabels([anchor])).toEqual([null]);
  });
  it("treats touching breathing gaps as separated on either axis", () => {
    const a = { x: 10, y: 10, width: 20, height: 20 };
    expect(overlaps(a, { ...a })).toBe(true);
    for (const b of [
      { ...a, x: 33 },
      { ...a, x: -13 },
      { ...a, y: 33 },
      { ...a, y: -13 },
    ])
      expect(overlaps(a, b)).toBe(false);
  });
});
