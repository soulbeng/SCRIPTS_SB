// Define your area of interest (multiple features)
var features = [
  ee.Feature(ee.Geometry.Rectangle([-122.3, 37.4, -122.1, 37.6]), {name: 'Feature1'}),
  ee.Feature(ee.Geometry.Rectangle([-122.5, 37.2, -122.3, 37.4]), {name: 'Feature2'}),
  ee.Feature(ee.Geometry.Point([-122.2, 37.5]).buffer(1000), {name: 'Feature3'})
];

// Create a feature collection
var featureCollection = ee.FeatureCollection(features);

// Define date range
var startDate = '2023-01-01';
var endDate = '2023-12-31';

// Load Sentinel-2 imagery
var sentinel2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterDate(startDate, endDate)
  .filterBounds(featureCollection)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));

// Function to calculate NDVI
function addNDVI(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return image.addBands(ndvi);
}

// Add NDVI to all images
var sentinel2WithNDVI = sentinel2.map(addNDVI);

// Create median composite
var ndviComposite = sentinel2WithNDVI.select('NDVI').median();

// Clip to each feature and download
features.forEach(function(feature, index) {
  var featureName = feature.get('name').getInfo();
  var clippedNDVI = ndviComposite.clip(feature.geometry());
  
  // Export to Google Drive
  Export.image.toDrive({
    image: clippedNDVI,
    description: 'NDVI_' + featureName + '_2023',
    scale: 10,
    region: feature.geometry(),
    maxPixels: 1e9,
    fileFormat: 'GeoTIFF',
    formatOptions: {
      cloudOptimized: true
    }
  });
});

// Add layers to map for visualization
Map.centerObject(featureCollection, 10);
Map.addLayer(featureCollection, {color: 'red'}, 'Study Areas');
Map.addLayer(ndviComposite.clip(featureCollection), 
  {min: -1, max: 1, palette: ['blue', 'white', 'green']}, 'NDVI Composite');