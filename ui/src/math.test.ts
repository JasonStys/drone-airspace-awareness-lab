/** @file Jason Stys: presentation invariants independent of native separation math; lines: docs/SOURCE_MAP.md. */
import { describe, expect, it } from "vitest";
import { type Track, point, project, timeline, windowLabel } from "./math";
const track: Track = {
  name: "Synthetic",
  fresh: true,
  age_s: 2,
  reference: "MSL",
  position: [10, 20, 30],
  velocity: [2, -1, 0],
  horizontal_bound_m: 4,
};
describe("safe display helpers", () => {
  it("projects fresh reports only", () => {
    expect(project(track, 5)).toEqual([20, 15, 30]);
    expect(project({ ...track, fresh: false }, 5)).toEqual([10, 20, 30]);
  });
  it.each([
    [5, 60, 5],
    [-1, 60, 0],
    [100, 60, 60],
    [NaN, 60, 0],
    [Infinity, 60, 0],
    [1, 0, 0],
  ])("clamps %s", (value, horizon, result) =>
    expect(timeline(value, horizon)).toBe(result),
  );
  it("keeps north up and origin centered", () => {
    expect(point(0, 0, 1000)).toEqual([300, 300]);
    expect(point(1000, 1000, 1000)).toEqual([570, 30]);
  });
  it.each([false, true])("labels stale sources %s", (stale) =>
    expect(
      windowLabel({
        kind: "zone",
        first: "A",
        second: "B",
        start_s: 1,
        end_s: 2,
        stale_source: stale,
      }),
    ).toBe(`1.0–2.0 s${stale ? " · stale zone source" : ""}`),
  );
});
