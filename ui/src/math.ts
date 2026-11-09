/** @file Jason Stys: presentation-only projection and time labels; lines: docs/SOURCE_MAP.md. */
export interface Track {
  name: string;
  fresh: boolean;
  age_s: number;
  reference: string;
  position: number[];
  velocity: number[];
  horizontal_bound_m: number;
}
export interface Alert {
  kind: "traffic" | "zone";
  first: string;
  second: string;
  start_s: number;
  end_s: number;
  stale_source: boolean;
}
export interface Analysis {
  title: string;
  tracks: Track[];
  alerts: Alert[];
  assessment_coverage: {
    as_of_s: number;
    observations: {
      track: string;
      observed_s: number;
      fresh_at_snapshot: boolean;
      fresh_through_s: number;
      reports_received: number;
      distinct_timestamps: number;
      duplicate_reports: number;
      superseded_observations: number;
    }[];
    pairs: {
      kind: string;
      first: string;
      second: string;
      status: string;
      reasons: string[];
      assessment_window_s: number[] | null;
      overlap_window_s: number[] | null;
      stale_zone_source: boolean;
    }[];
    status_counts: Record<string, number>;
    notice: string;
  };
  unassessed_tracks: number;
  incomparable_pairs: number;
  superseded_reports: number;
  stale_zones: string[];
  status: string;
  model: string;
}
/** Keep stale observations frozen; never animate them as if they were fresh measurements. */
export function project(track: Track, seconds: number): number[] {
  return track.position.map(
    (p, i) => p + (track.fresh ? track.velocity[i] * seconds : 0),
  );
}
/** Clip time selection to model horizon, rejecting nonfinite presentation values. */
export function timeline(value: number, horizon: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(value, horizon)) : 0;
}
/** Map ENU metres into a square plot with north up; never geographic map coordinates. */
export function point(
  east: number,
  north: number,
  extent: number,
): [number, number] {
  return [300 + (east / extent) * 270, 300 - (north / extent) * 270];
}
/** State time interval explicitly instead of an unsupported probability or flight-clearance label. */
export function windowLabel(alert: Alert): string {
  return `${alert.start_s.toFixed(1)}–${alert.end_s.toFixed(1)} s${alert.stale_source ? " · stale zone source" : ""}`;
}
