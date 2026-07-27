# Rapid Mapping of the July 2021 Ahr Valley Flood Using Sentinel-1 SAR

Benchmarked a rapid Sentinel-1 SAR flood-mapping method against the Copernicus Emergency Management Service (EMS) authoritative product for the July 2021 Ahr Valley flood (Germany) — and diagnosed why the fast method under-detected by roughly 97%.

MSc Applied GIS & Remote Sensing dissertation, University of Southampton (2025).

## Result

| Metric | Rapid Sentinel-1 | Copernicus EMS (authoritative) |
|---|---|---|
| Population exposed | 81 | 2,806 |
| Buildings intersected | 22 | 1,715 |
| Road length intersected | 0.1 km | 31.0 km |
| Flooded area | ~0.007 km² | 5.4 km² |

Both pipelines used the same OpenStreetMap building/road layers and WorldPop 2020 population grid, so the gap reflects the mapping method, not the exposure data.

## Why the rapid method under-detected

- **Radar shadow and layover** — in the Ahr's narrow, steep-sided valley, the SAR line-of-sight either misses the valley floor entirely (shadow) or mixes it with adjacent slopes (layover), erasing the flood signal before any threshold can see it.
- **Urban double-bounce** — in dense town cores (e.g. Bad Neuenahr-Ahrweiler), radar energy bouncing between building walls and floodwater brightens inundated pixels instead of darkening them, which a darkening-only threshold rejects outright.
- **Sub-pixel channel widths** — at 10 m Sentinel-1 resolution, many flooded segments were narrower than a single pixel, diluting the change signal below the detection threshold.

A sensitivity test across −2.0 dB, −2.5 dB, and −3.0 dB thresholds showed low elasticity to threshold choice — evidence that the limitation is structural (geometry and urban scattering), not a tuning problem.

## What I'd do differently

- Local/adaptive thresholds instead of one global cut, to handle within-scene incidence-angle variation
- A bipolar change rule in urban masks (accept strong brightening or darkening) to capture double-bounce flooding
- DEM-aware region growing (HAND-guided) instead of a blunt slope cutoff, to avoid excising true flood on steep valley margins
- Coherence-based change detection in city cores where SAR pairs allow it

## Repository contents

- rapid_s1_pipeline.js — the rapid Sentinel-1 change-detection workflow (Google Earth Engine)
- copernicus_benchmark.js — the Copernicus EMS exposure benchmark, using an identical asset stack for a like-for-like comparison
- dissertation.pdf — full write-up: literature review, methodology, results, discussion, limitations, and operational recommendations.

## Tools

Google Earth Engine · JavaScript · Sentinel-1 GRD · Copernicus EMS (EMSR517) · OpenStreetMap · WorldPop

## Note on authorship

The methodology, parameter choices, and analysis are my own. The Google Earth Engine / JavaScript implementation was developed with AI assistance. I'm currently rebuilding the pipeline independently in Python (GeoPandas/ArcPy) as a separate portfolio project.
