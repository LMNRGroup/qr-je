import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { geoNaturalEarth1, geoPath } from 'd3-geo';

const width = 1200;
const height = 600;
const padding = 20;

const worldPath = path.resolve('/Users/erwinprz/Downloads/custom.geo.json');
const prGeoPath = path.resolve('/Users/erwinprz/Downloads/PR.geo-2.json');
const outputPath = path.resolve('public/map.svg');

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));

const collectPolygons = (geo, bucket) => {
  if (!geo) return;
  if (geo.type === 'FeatureCollection') {
    geo.features.forEach((feature) => collectPolygons(feature, bucket));
    return;
  }
  if (geo.type === 'Feature') {
    collectPolygons(geo.geometry, bucket);
    return;
  }
  if (geo.type === 'GeometryCollection') {
    geo.geometries.forEach((geometry) => collectPolygons(geometry, bucket));
    return;
  }
  if (geo.type === 'Polygon') {
    bucket.push(geo.coordinates);
    return;
  }
  if (geo.type === 'MultiPolygon') {
    geo.coordinates.forEach((coords) => bucket.push(coords));
  }
};

const buildSvg = async () => {
  const world = await readJson(worldPath);
  const pr = await readJson(prGeoPath);

  const projection = geoNaturalEarth1();
  projection.fitExtent(
    [
      [padding, padding],
      [width - padding, height - padding],
    ],
    world
  );

  const pathGenerator = geoPath(projection);
  const worldFeatures = world.type === 'FeatureCollection' ? world.features : [];

  const worldPaths = worldFeatures
    .map((feature) => pathGenerator(feature))
    .filter(Boolean)
    .map((d) => `<path d="${d}" />`)
    .join('\n    ');

  const prPolygons = [];
  collectPolygons(pr, prPolygons);
  if (prPolygons.length === 0) {
    throw new Error('No Puerto Rico polygons found in PR.geo-2.json');
  }

  const prGeometry = { type: 'MultiPolygon', coordinates: prPolygons };
  const prPathData = pathGenerator(prGeometry);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <g id="world" fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">
    ${worldPaths}
  </g>
  <g id="pr" fill="none" stroke="#D4AF37" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">
    <path d="${prPathData}" />
  </g>
</svg>
`;

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, svg, 'utf8');
  console.log(`SVG written to ${outputPath}`);
};

buildSvg().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
