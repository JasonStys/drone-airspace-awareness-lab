//! Jason Stys: bounded constant-velocity cylinder-overlap kernel; never a guidance system.
//! Functions, parameters and local variables: docs/SOURCE_MAP.md. Metres and seconds only.
use std::io::{self, Read};

/// One aligned synthetic ENU state with conservative horizontal/vertical error bounds.
#[derive(Clone, Copy, Debug)]
struct State {
    p: [f64; 3],
    v: [f64; 3],
    radius: f64,
    height: f64,
}

/// Intersect closed time windows, including a single tangent instant.
fn intersect(a: (f64, f64), b: (f64, f64)) -> Option<(f64, f64)> {
    let result = (a.0.max(b.0), a.1.min(b.1));
    (result.0 <= result.1).then_some(result)
}

/// Solve |p + v*t| <= limit in one dimension, clipped to the prediction horizon.
fn vertical(p: f64, v: f64, limit: f64, horizon: f64) -> Option<(f64, f64)> {
    if v == 0.0 {
        return (p.abs() <= limit).then_some((0.0, horizon));
    }
    let a = (-limit - p) / v;
    let b = (limit - p) / v;
    intersect((a.min(b), a.max(b)), (0.0, horizon))
}

/// Solve the horizontal quadratic with stable roots to reduce cancellation error.
fn horizontal(p: [f64; 2], v: [f64; 2], radius: f64, horizon: f64) -> Option<(f64, f64)> {
    let a = v[0].mul_add(v[0], v[1] * v[1]);
    let b = 2.0 * p[0].mul_add(v[0], p[1] * v[1]);
    let c = p[0].mul_add(p[0], p[1] * p[1]) - radius * radius;
    if a == 0.0 {
        return (c <= 0.0).then_some((0.0, horizon));
    }
    let d = b.mul_add(b, -4.0 * a * c);
    if d < 0.0 {
        return None;
    }
    let q = -0.5 * (b + d.sqrt().copysign(b));
    let (r1, r2) = if q == 0.0 { (0.0, 0.0) } else { (q / a, c / q) };
    intersect((r1.min(r2), r1.max(r2)), (0.0, horizon))
}

/// Return simultaneous horizontal AND vertical overlap; separate closest approaches are insufficient.
fn overlap(a: State, b: State, h: f64, z: f64, horizon: f64) -> Option<(f64, f64)> {
    let p = std::array::from_fn::<_, 3, _>(|i| a.p[i] - b.p[i]);
    let v = std::array::from_fn::<_, 3, _>(|i| a.v[i] - b.v[i]);
    intersect(
        horizontal([p[0], p[1]], [v[0], v[1]], h + a.radius + b.radius, horizon)?,
        vertical(p[2], v[2], z + a.height + b.height, horizon)?,
    )
}

/// Strict native protocol validation, independent of API validation; no external dependencies.
fn calculate(text: &str) -> Result<String, &'static str> {
    let mut tokens = text.split_whitespace();
    let mut number = || {
        tokens
            .next()
            .ok_or("missing value")?
            .parse::<f64>()
            .map_err(|_| "invalid number")
    };
    let count = number()?;
    let horizon = number()?;
    let h = number()?;
    let z = number()?;
    if !count.is_finite()
        || count.fract() != 0.0
        || !(0.0..=80.0).contains(&count)
        || !horizon.is_finite()
        || !(0.0..=120.0).contains(&horizon)
        || !h.is_finite()
        || !(0.0..=2000.0).contains(&h)
        || !z.is_finite()
        || !(0.0..=1000.0).contains(&z)
    {
        return Err("header outside bounds");
    }
    let mut states = Vec::with_capacity(count as usize);
    for _ in 0..count as usize {
        let mut values = [0.0; 8];
        for value in &mut values {
            *value = number()?;
            if !value.is_finite() || value.abs() > 1_000_000.0 {
                return Err("state outside bounds");
            }
        }
        if values[6] < 0.0 || values[7] < 0.0 {
            return Err("negative uncertainty");
        }
        states.push(State {
            p: [values[0], values[1], values[2]],
            v: [values[3], values[4], values[5]],
            radius: values[6],
            height: values[7],
        });
    }
    if tokens.next().is_some() {
        return Err("trailing input");
    }
    let mut output = String::from("AWARENESS/1\n");
    for (i, a) in states.iter().enumerate() {
        for (j, b) in states.iter().enumerate().skip(i + 1) {
            if let Some((start, end)) = overlap(*a, *b, h, z, horizon) {
                output.push_str(&format!("{i} {j} {start:.12} {end:.12}\n"));
            }
        }
    }
    Ok(output)
}

/// Read at most 64 KiB; emit fixed diagnostic without reflecting hostile input.
fn main() {
    let mut text = String::new();
    let result = io::stdin().take(65_537).read_to_string(&mut text);
    if result.is_err() || text.len() > 65_536 {
        eprintln!("invalid or oversized protocol input");
        std::process::exit(2);
    }
    match calculate(&text) {
        Ok(output) => print!("{output}"),
        Err(message) => {
            eprintln!("{message}");
            std::process::exit(2);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Independent hand-calculated boundary and interval checks.
    #[test]
    fn intervals() {
        assert_eq!(
            horizontal([100.0, 0.0], [-10.0, 0.0], 10.0, 20.0),
            Some((9.0, 11.0))
        );
        assert_eq!(
            horizontal([0.0, 10.0], [1.0, 0.0], 10.0, 20.0),
            Some((0.0, 0.0))
        );
        assert_eq!(horizontal([0.0, 11.0], [1.0, 0.0], 10.0, 20.0), None);
        assert_eq!(vertical(100.0, -10.0, 10.0, 20.0), Some((9.0, 11.0)));
        assert_eq!(vertical(10.0, 0.0, 10.0, 20.0), Some((0.0, 20.0)));
        assert_eq!(vertical(11.0, 0.0, 10.0, 20.0), None);
        assert_eq!(intersect((0.0, 2.0), (3.0, 4.0)), None);
    }

    /// Public CLI rejects malformed/nonfinite/unbounded payloads and extra tokens.
    #[test]
    fn protocol() {
        for bad in [
            "",
            "nan 1 1 1",
            "81 1 1 1",
            "1.5 1 1 1",
            "0 inf 1 1",
            "0 1 -1 1",
            "0 1 1 1001",
            "0 121 1 1",
            "1 1 1 1",
            "0 1 1 1 extra",
            "1 1 1 1 0 0 0 0 0 0 -1 1",
            "1 1 1 1 0 0 0 0 0 0 NaN 1",
        ] {
            assert!(calculate(bad).is_err(), "accepted {bad}");
        }
        assert_eq!(calculate("0 1 1 1"), Ok("AWARENESS/1\n".into()));
    }
}
