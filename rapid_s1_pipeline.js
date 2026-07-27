/*** Ahr Valley Flood — Rapid Sentinel-1 Change-Detection Pipeline ***/
// Part of: "Rapid Mapping of the July 2021 Ahr Valley Flood Using Sentinel-1 SAR"
// MSc Applied GIS & Remote Sensing, University of Southampton
// Implements a lightweight, first-day flood triage workflow in Google Earth Engine.

// ---------- INPUTS ----------
var aoi = Map.drawingTools().layers().length() > 0
  ? ee.Geometry(Map.drawingTools().layers().get(0).getEeObject())
  : ee.Geometry.Rectangle([6.95, 50.48, 7.20, 50.62]);

var preStart = '2021-06-28', preEnd = '2021-07-14';
var postStart = '2021-07-16', postEnd = '2021-08-02';

var CHOSEN_THR_DB = -2.5;
var maxSlopeDeg = 8;
var minClusterPx = 100;
var thrDb_list = [-2.0, -2.5, -3.0];
var doPopulationExposure = true;

// OSM assets
var OSM_BUILDINGS_ID = 'projects/ahr-flood/assets/osm_buildings_gee';
var OSM_ROADS_ID = 'projects/ahr-flood/assets/osm_roads_gee';

// ---------- S1 PRE/POST ----------
function getS1(preStart, preEnd, postStart, postEnd, aoi) {
    var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
      .filterBounds(aoi)
      .filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'))
      .filter(ee.Filter.eq('instrumentMode', 'IW'))
      .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'));

    var preIC = s1.filterDate(preStart, preEnd).select('VV');
    var postIC = s1.filterDate(postStart, postEnd).select('VV');

    print('Pre S1 count:', preIC.size());
    print('Post S1 count:', postIC.size());

    var pre = ee.Image(ee.Algorithms.If(preIC.size().gt(0), preIC.median(),
                                            ee.Image(0).updateMask(ee.Image(0)).rename('VV')));
    var post = ee.Image(ee.Algorithms.If(postIC.size().gt(0), postIC.median(),
                                             ee.Image(0).updateMask(ee.Image(0)).rename('VV')));

    return { preDb: pre.log10().multiply(10), postDb: post.log10().multiply(10) };
  }

var pair = getS1(preStart, preEnd, postStart, postEnd, aoi);
var preDb = pair.preDb, postDb = pair.postDb;

// ---------- DIFF & SLOPE ----------
var diffDb = postDb.subtract(preDb).rename('diffDb');
var slope = ee.Terrain.slope(ee.ImageCollection('COPERNICUS/DEM/GLO30').mosaic());
var flatMask = slope.lte(maxSlopeDeg);

// ---------- FLOOD MASK ----------
function floodMaskFromThreshold(diffDb, thrDb, flatMask, minClusterPx) {
    var raw = diffDb.lt(thrDb);
    var masked = raw.updateMask(flatMask);
    var labeled = masked.connectedPixelCount(100, true);
    var cleaned = masked.updateMask(labeled.gte(minClusterPx));
    return cleaned.rename('flood_' + thrDb.toString().replace('.', '_'));
  }

var floodLayers = thrDb_list.map(function (t) {
    return floodMaskFromThreshold(diffDb, t, flatMask, minClusterPx);
  });

var floodChosen = floodMaskFromThreshold(diffDb, CHOSEN_THR_DB, flatMask, minClusterPx);
var floodMask = floodChosen.selfMask().rename('flood');

// Result (from dissertation, Section 4.1):
// 108 pixels of water (~0.0069 km2), 81 people exposed, 22 buildings, 0.1 km roads.
// See dissertation.pdf Section 5 for full discussion of why this under-detected
// relative to the Copernicus EMS authoritative benchmark (copernicus_benchmark.js).
