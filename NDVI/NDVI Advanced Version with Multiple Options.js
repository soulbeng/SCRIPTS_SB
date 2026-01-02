// Function to calculate NDVI for different satellite sources
function getNDVI(image, source) {
  if (source === 'Sentinel-2') {
    return image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  } else if (source === 'Landsat-8') {
    return image.normalizedDifference(['B5', 'B4']).rename('NDVI');
  } else if (source === 'Landsat-9') {
    return image.normalizedDifference(['B5', 'B4']).rename('NDVI');
  } else if (source === 'MODIS') {
    return image.normalizedDifference(['sur_refl_b02', 'sur_refl_b01']).rename('NDVI');
  }
}

// Main function to process and download NDVI
function processAndDownloadNDVI(featureCollection, options) {
  var defaultOptions = {
    startDate: '2023-01-01',
    endDate: '2023-12-31',
    satellite: 'Sentinel-2',
    scale: 10,
    cloudFilter: 20,
    reducer: 'median' // 'median', 'mean', 'max'
  };
  
  var opts = ee.Dictionary(defaultOptions).combine(options);
  
  // Select appropriate image collection based on satellite
  var collection;
  if (opts.get('satellite') === 'Sentinel-2') {
    collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterDate(opts.get('startDate'), opts.get('endDate'))
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', opts.get('cloudFilter')));
  } else if (opts.get('satellite') === 'Landsat-8') {
    collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
      .filterDate(opts.get('startDate'), opts.get('endDate'));
  } else if (opts.get('satellite') === 'MODIS') {
    collection = ee.ImageCollection('MODIS/006/MOD09GA')
      .filterDate(opts.get('startDate'), opts.get('endDate'));
  }
  
  // Filter by bounds and calculate NDVI
  collection = collection.filterBounds(featureCollection);
  
  var withNDVI = collection.map(function(image) {
    return image.addBands(getNDVI(image, opts.get('satellite').getInfo()));
  });
  
  // Create composite based on reducer type
  var composite;
  if (opts.get('reducer') === 'median') {
    composite = withNDVI.select('NDVI').median();
  } else if (opts.get('reducer') === 'mean') {
    composite = withNDVI.select('NDVI').mean();
  } else if (opts.get('reducer') === 'max') {
    composite = withNDVI.select('NDVI').max();
  }
  
  return composite;
}

// Example usage with different options
var composite = processAndDownloadNDVI(featureCollection, {
  startDate: '2023-06-01',
  endDate: '2023-08-31',
  satellite: 'Sentinel-2',
  reducer: 'median'
});

// Export for each feature
featureCollection.toList(featureCollection.size()).evaluate(function(featuresList) {
  featuresList.forEach(function(feature, index) {
    var feat = ee.Feature(feature);
    var clipped = composite.clip(feat.geometry());
    
    Export.image.toDrive({
      image: clipped,
      description: 'NDVI_Feature_' + (index + 1),
      scale: 10,
      region: feat.geometry(),
      maxPixels: 1e9,
      fileFormat: 'GeoTIFF'
    });
  });
});

// Add to map
Map.addLayer(composite.clip(featureCollection), 
  {min: -1, max: 1, palette: ['red', 'yellow', 'green']}, 'NDVI');
Map.addLayer(featureCollection, {color: 'blue'}, 'Boundaries');