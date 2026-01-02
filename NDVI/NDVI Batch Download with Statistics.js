// Function to calculate NDVI statistics for each feature
function calculateStats(feature) {
  var ndviImage = composite.clip(feature.geometry());
  var stats = ndviImage.reduceRegion({
    reducer: ee.Reducer.mean().combine({
      reducer2: ee.Reducer.stdDev(),
      sharedInputs: true
    }).combine({
      reducer2: ee.Reducer.minMax(),
      sharedInputs: true
    }),
    geometry: feature.geometry(),
    scale: 10,
    maxPixels: 1e9
  });
  
  return feature.set(stats);
}

// Calculate statistics
var featuresWithStats = featureCollection.map(calculateStats);

// Export statistics to CSV
Export.table.toDrive({
  collection: featuresWithStats,
  description: 'NDVI_Statistics',
  fileFormat: 'CSV'
});

// Print statistics
print('NDVI Statistics:', featuresWithStats);