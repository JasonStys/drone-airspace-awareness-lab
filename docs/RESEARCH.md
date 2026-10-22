# Primary references and design consequences

Jason Stys: sources consulted for this educational design; no certification, endorsement or regulatory guarantee.

- [FAA AIM surveillance systems](https://www.faa.gov/air_traffic/publications/aim_html/chap4_section_5.html): surveillance has coverage/equipment limitations and traffic displays are advisory, not maneuver guidance. Result: no complete-traffic, collision-avoidance or safe-to-fly status; age and missing-data uncertainty always visible.
- [FAA airspace restrictions](https://www.faa.gov/uas/getting_started/where_can_i_fly/airspace_restrictions): restrictions include airports, special-use/security areas and emergency contexts. Result: synthetic zones are explicitly not live official restrictions or a legal authorization service.
- [FAA LAANC industry program](https://www.faa.gov/uas/programs_partnerships/data_exchange): approved supplier/program requirements exist. Result: do not claim supplier approval, LAANC integration or clearance generation.
- [FAA ADS-B FAQ](https://www.faa.gov/air_traffic/technology/adsb/faq): equipment, infrastructure and coverage context matters. Result: no inference that every aircraft is observable; no live ADS-B reception is implemented.
- [Rust standard iterator model](https://doc.rust-lang.org/book/ch13-02-iterators.html): bounded iterator loops separate parsing/state storage from pair evaluation. No unsafe code/external crates; ordinary double-precision maths with independent tests.
- [OSV-Scanner source scanning](https://google.github.io/osv-scanner/usage/scan-source): lockfiles can be scanned directly. Result: explicit npm lock input plus all-packages JSON output; an independent inventory gate prevents partial scans from appearing successful.
- [OSV-Scanner output](https://google.github.io/osv-scanner/output/): structured results support package/advisory verification. Result: findings/errors/uncovered dependencies fail; no suppression configuration.

These references inform limitations and validation choices, not domain accuracy certification. Synthetic illustrative measurements/errors/margins are original examples, not extracted operational standards. No real emergency, identity, employer, aircraft track or restricted dataset is included.
