// One-time script: strips the 6.2MB global REE GeoJSON down to a lean array.
// Output: frontend/public/ree-global-slim.json
// Format per entry: [lon, lat, status, depType, country, name]
// Run: node scripts/build-ree-slim.js

const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../data/MapKmlTools_MapKmlTools_Global_REE_occurrence_database.geojson');
const dest = path.join(__dirname, '../frontend/public/ree-global-slim.json');

const raw = JSON.parse(fs.readFileSync(src, 'utf8'));

const slim = raw.features
  .filter(f => f.geometry && f.geometry.coordinates)
  .map(f => {
    const [lon, lat] = f.geometry.coordinates;
    const p = f.properties;
    return [
      Math.round(lon * 10000) / 10000,
      Math.round(lat * 10000) / 10000,
      p.Status || '',
      p.Dep_Type || '',
      p.Country || '',
      p.Name || '',
    ];
  });

fs.writeFileSync(dest, JSON.stringify(slim));
const kb = Math.round(fs.statSync(dest).size / 1024);
console.log(`Written ${slim.length} features to ${dest} (${kb} KB)`);
