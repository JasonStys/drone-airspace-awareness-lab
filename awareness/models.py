"""Jason Stys: closed, bounded SI-unit replay contracts. Lines/variables: docs/SOURCE_MAP.md.

Synthetic local coordinates only; no geographic-coordinate, URL, identity-lookup or executable fields.
"""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Finite = Annotated[float, Field(strict=True, allow_inf_nan=False)]
Position = Annotated[Finite, Field(ge=-100_000, le=100_000)]
Speed = Annotated[Finite, Field(ge=-300, le=300)]
Label = Annotated[str, Field(pattern=r"^[A-Za-z0-9][A-Za-z0-9 _-]{0,39}$", strict=True)]
Reference = Literal["MSL", "AGL", "UNKNOWN"]


class Contract(BaseModel):
    """Reject unknown fields rather than silently omitting information."""

    model_config = ConfigDict(extra="forbid", strict=True)


class Report(Contract):
    """A synthetic observation: position metres, velocity m/s, conservative bounded errors."""

    track: Label
    observed_s: Annotated[Finite, Field(ge=0, le=4_000_000_000)]
    east_m: Position
    north_m: Position
    altitude_m: Position
    ve_mps: Speed
    vn_mps: Speed
    vz_mps: Speed
    horizontal_error_m: Annotated[Finite, Field(ge=0, le=1000)] = 0.0
    vertical_error_m: Annotated[Finite, Field(ge=0, le=1000)] = 0.0
    velocity_error_mps: Annotated[Finite, Field(ge=0, le=30)] = 0.0
    altitude_reference: Reference = "UNKNOWN"


class Zone(Contract):
    """Synthetic cylindrical zone with activation interval and explicit source age."""

    name: Label
    east_m: Position
    north_m: Position
    radius_m: Annotated[Finite, Field(ge=1, le=10_000)]
    floor_m: Position
    ceiling_m: Position
    altitude_reference: Reference = "UNKNOWN"
    active_from_s: Annotated[Finite, Field(ge=0, le=4_000_000_000)]
    active_until_s: Annotated[Finite, Field(ge=0, le=4_000_000_000)]
    source_updated_s: Annotated[Finite, Field(ge=0, le=4_000_000_000)]

    @model_validator(mode="after")
    def ordered(self):
        """Reject reversed altitude/time intervals; inclusive boundaries remain meaningful."""
        if self.floor_m > self.ceiling_m or self.active_from_s > self.active_until_s:
            raise ValueError("Zone altitude and activation intervals must be ordered")
        return self


class Replay(Contract):
    """One bounded deterministic snapshot, never a continuously trusted traffic feed."""

    title: Label = "Synthetic exercise"
    as_of_s: Annotated[Finite, Field(ge=0, le=4_000_000_000)]
    horizon_s: Annotated[Finite, Field(ge=0, le=120)] = 60.0
    horizontal_margin_m: Annotated[Finite, Field(ge=1, le=2000)] = 100.0
    vertical_margin_m: Annotated[Finite, Field(ge=1, le=1000)] = 30.0
    stale_after_s: Annotated[Finite, Field(ge=1, le=120)] = 15.0
    zone_max_age_s: Annotated[Finite, Field(ge=1, le=86_400)] = 3600.0
    reports: Annotated[list[Report], Field(max_length=256)]
    zones: Annotated[list[Zone], Field(max_length=16)] = []

    @model_validator(mode="after")
    def consistent(self):
        """Cap unique tracks; reject future observations, contradictory duplicates and duplicate zones."""
        unique = {}
        for report in self.reports:
            if report.observed_s > self.as_of_s:
                raise ValueError("Future observations are not accepted")
            key = (report.track, report.observed_s)
            if key in unique and unique[key] != report:
                raise ValueError("Conflicting reports at the same track timestamp")
            unique[key] = report
        if len({report.track for report in self.reports}) > 64:
            raise ValueError("At most 64 unique tracks")
        if len({zone.name for zone in self.zones}) != len(self.zones):
            raise ValueError("Zone names must be unique")
        if any(zone.source_updated_s > self.as_of_s for zone in self.zones):
            raise ValueError("Future zone sources are not accepted")
        return self
