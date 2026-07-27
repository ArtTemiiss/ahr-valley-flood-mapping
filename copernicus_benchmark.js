/*** Ahr Valley Flood — Copernicus EMS Authoritative Benchmark ***/
// Part of: "Rapid Mapping of the July 2021 Ahr Valley Flood Using Sentinel-1 SAR"
// MSc Applied GIS & Remote Sensing, University of Southampton
// Computes exposure using the official Copernicus EMS Grading product (EMSR517)
// with the same asset stack as rapid_s1_pipeline.js, to isolate mapping method
// as the source of any exposure gap.

var aoi = ee.Geometry.Rectangle([6.95, 50.48, 7.20, 50.62]); // Example AOI

// --- Authoritative Data ---
var EMS_ASSET_ID = 'projects/ahr-flood/assets/EMS_Ahr2021_observedEventA';
var copernicusFlood = ee.FeatureCollection(EMS_ASSET_ID)
  .filterBounds(aoi);

// --- Exposure Data ---
var OSM_BUILDINGS_ID = 'projects/ahr-flood/assets/osm_buildings_gee';
var OSM_ROADS_ID = 'projects/ahr-flood/assets/osm_roads_gee';

var worldpop = ee.ImageCollection('WorldPop/GP/100m/pop')
  .filter(ee.Filter.eq('country', 'DEU')).filter(ee.Filter.eq('year', 2020))
  .first().resample('bilinear').rename('population');

// --- Exposure Analysis ---
var osmBuildings = ee.FeatureCollection(OSM_BUILDINGS_ID).filterBounds(aoi);
var osmRoads = ee.FeatureCollection(OSM_ROADS_ID).filterBounds(aoi);

var buildingsInFlood = osmBuildings.filterBounds(copernicusFlood.geometry());

var addLenKm = function (f) { return f.set('len_km', f.geometry().length().divide(1000)); };
var roadsInFlood = osmRoads.filterBounds(copernicusFlood.geometry()).map(addLenKm);

var buildingCount = buildingsInFlood.size();
var roadKm = ee.Number(roadsInFlood.aggregate_sum('len_km'));

var populationExposed = worldpop.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: copernicusFlood.geometry(),
  scale: 30,
  maxPixels: 1e13,
  bestEffort: true
});

print('Population exposed:', populationExposed.get('population'));
print('OSM buildings intersected:', buildingCount);
print('OSM road length within flood (km):', roadKm);

// Result (from dissertation, Section 4.2):
// 2,806 people exposed, 1,715 buildings intersected, 31.0 km roads within extent.
// Compare against rapid_s1_pipeline.js (81 people / 22 buildings / 0.1 km) —
// the ~97% gap is diagnosed in dissertation.pdf Section 5 (shadow/layover,
// urban double-bounce, sub-pixel channel widths).
