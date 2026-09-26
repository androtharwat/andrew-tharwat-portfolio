# ATS String Art V4 — Solver Architecture

Status: experimental core, isolated from production.

## Goal

Build a professional computational string-art engine rather than another portrait-only greedy effect. V4 is designed around physical thread simulation, sparse image reconstruction, and joint line+color optimization so mono and multicolor share the same mathematical foundation.

## Reference level

V4 is informed by the public state of the art and mature open implementations, especially:

- Birsak et al., *String Art: Towards Computational Fabrication of String Images* — computational fabrication framing and iterative optimization.
- Roy Hachnochi, *Algorithmic String Art* — sparse/binary linear reconstruction, physical fiber width, palette selection, dithering, multicolor optimization and path post-processing. The repository is AGPL-3.0; ATS uses it as an architectural/research reference only and does not copy its source.
- DanAla/String_Art — MIT-licensed implementation showing practical CMYK output, physical thread dimensions and production-oriented exports.
- atomAltera/string-art-studio — browser architecture reference for Rust/WASM + Web Worker isolation. No license was present when reviewed, so it is treated as reference-only.

## V4 pipeline

1. **Preprocess**
   - crop/frame source
   - linear-light RGB target
   - mono darkness target
   - tone floor / gamma / local detail
   - palette selection + optional dithering for color
   - optional importance map

2. **Physical geometry**
   - circular nail geometry
   - all valid chords after minimum nail-gap filtering
   - anti-aliased sparse fiber raster
   - real canvas size + thread width mapped to sub-pixel coverage
   - packed sparse line table reusable across solves

3. **Mono optimization**
   - weighted squared reconstruction error
   - sparse coordinate descent over line counts
   - add and remove moves, not forward-only greedy
   - global mode for fidelity; path-constrained mode for direct single-thread execution

4. **Color optimization**
   - line and thread color are optimized jointly
   - optical-density / transmittance accumulation rather than independent CMYK image overlays
   - each color maintains an executable continuous route
   - color switching can be constrained with minimum run length / switch penalty

5. **Path layer**
   - global edge solution may remain non-continuous for maximum fidelity
   - production layer will convert selected edges into executable trails / color paths
   - later checkpoint: Euler trail cover + connector optimization + instruction export

6. **Runtime**
   - current JS core is the correctness/reference implementation
   - production solver will move the hot loops to Rust/WASM
   - Web Worker owns the matrix cache and solver so the ATS UI remains responsive

## Current checkpoint

Implemented in `core.mjs`:

- circular pin geometry
- sub-pixel physical thread strength
- anti-aliased fiber rasterization
- packed sparse line matrix/table
- weighted mono reconstruction error
- global mono add/remove coordinate-descent solver
- optional single-path constrained mono solver
- optical-density color accumulation
- joint line+color multicolor solver with per-color executable paths
- deterministic candidate sampling for performance experiments
- synthetic targets and metrics for regression tests

Implemented in `worker.mjs`:

- reusable line-table cache keyed by physical/geometry parameters
- mono solve messages
- color solve messages
- progress messages
- no image upload or backend dependency

## Quality targets

The first production-quality profiles should be built around physical rather than arbitrary visual parameters:

- Canvas: ~600 mm reference diameter
- Nails: 360 baseline, later 420–480 high-detail
- Thread width: ~0.12 mm default baseline
- Mono: ~3k–5k useful fibers depending on target/error stop
- Color: ~8k–12k fibers across a selected 4–6 color palette
- Optimization target: high-resolution enough to preserve identity, while line geometry is cached and solved off-main-thread

These are starting profiles, not hard limits. Final values must be benchmarked against real portraits and real thread/board dimensions.

## Licensing rule

Do not paste or vendor AGPL/GPL/no-license source into ATS V4. Reimplement published algorithms and mathematical ideas independently. MIT-licensed code may only be reused intentionally with attribution and license preservation.

## Next engineering checkpoint

1. Add production preprocess module for linear-light RGB, gamma/detail and palette selection.
2. Add packed line-table persistence in IndexedDB.
3. Port the solver hot path to Rust/WASM behind the same worker contract.
4. Add path post-processing for global mono solutions.
5. Integrate V4 into the String Art page behind an internal experimental switch.
6. Benchmark mono and multicolor against the existing engine before any main/production change.
