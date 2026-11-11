/** Jason Stys: bounded measured-label layout without changing track geometry. Map: docs/SOURCE_MAP.md. */
export interface LabelBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface LabelAnchor extends LabelBox {}

/** Include a three-unit breathing gap; returned label boxes must not cover another label or marker. */
export function overlaps(a: LabelBox, b: LabelBox): boolean {
  return (
    a.x < b.x + b.width + 3 &&
    a.x + a.width + 3 > b.x &&
    a.y < b.y + b.height + 3 &&
    a.y + a.height + 3 > b.y
  );
}

/** Greedily place at most 64 measured labels; null means use the accessible track key instead. */
export function placeLabels(
  anchors: readonly LabelAnchor[],
): (LabelBox | null)[] {
  if (anchors.length > 64) throw new RangeError("At most 64 track labels");
  const occupied: LabelBox[] = [];
  const markers = anchors
    .filter((item) => Number.isFinite(item.x) && Number.isFinite(item.y))
    .map((item) => ({ x: item.x - 8, y: item.y - 8, width: 16, height: 16 }));
  return anchors.map((anchor) => {
    if (
      ![anchor.x, anchor.y, anchor.width, anchor.height].every(
        Number.isFinite,
      ) ||
      anchor.width <= 0 ||
      anchor.height <= 0 ||
      anchor.width > 584 ||
      anchor.height > 584
    )
      return null;
    for (let ring = 0; ring < 6; ring += 1) {
      const gap = 12 + ring * (anchor.height + 8);
      for (const [x, y] of [
        [anchor.x + gap, anchor.y - anchor.height - gap],
        [anchor.x + gap, anchor.y + gap],
        [anchor.x - anchor.width - gap, anchor.y - anchor.height - gap],
        [anchor.x - anchor.width - gap, anchor.y + gap],
      ]) {
        const box = {
          x: Math.max(8, Math.min(592 - anchor.width, x)),
          y: Math.max(8, Math.min(592 - anchor.height, y)),
          width: anchor.width,
          height: anchor.height,
        };
        if (
          occupied.some((other) => overlaps(box, other)) ||
          markers.some((marker) => overlaps(box, marker))
        )
          continue;
        occupied.push(box);
        return box;
      }
    }
    return null;
  });
}
