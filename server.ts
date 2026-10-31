import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Increase payload limit for photo uploads
app.use(express.json({ limit: '25mb' }));

// In-memory cache for ArcGIS Scheduled Monuments queries
interface MonumentCacheEntry {
  timestamp: number;
  data: any;
}
const monumentCache = new Map<string, MonumentCacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

/**
 * Endpoint to query UK Scheduled Monuments (Historic England Layer 6 & Cadw)
 * Takes query params: minLon, minLat, maxLon, maxLat
 */
app.get('/api/monuments', async (req: Request, res: Response) => {
  try {
    const minLon = parseFloat(req.query.minLon as string);
    const minLat = parseFloat(req.query.minLat as string);
    const maxLon = parseFloat(req.query.maxLon as string);
    const maxLat = parseFloat(req.query.maxLat as string);

    if (isNaN(minLon) || isNaN(minLat) || isNaN(maxLon) || isNaN(maxLat)) {
      return res.status(400).json({ error: 'Valid bounding box coordinates (minLon, minLat, maxLon, maxLat) are required.' });
    }

    const cacheKey = `${minLon.toFixed(2)},${minLat.toFixed(2)},${maxLon.toFixed(2)},${maxLat.toFixed(2)}`;
    const cached = monumentCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json(cached.data);
    }

    const geom = JSON.stringify({
      xmin: minLon,
      ymin: minLat,
      xmax: maxLon,
      ymax: maxLat,
      spatialReference: { wkid: 4326 }
    });

    const arcgisUrl = `https://services-eu1.arcgis.com/ZOdPfBS3aqqDYPUQ/arcgis/rest/services/National_Heritage_List_for_England_NHLE_v02_VIEW/FeatureServer/6/query?where=1%3D1&geometry=${encodeURIComponent(geom)}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=OBJECTID,ListEntry,Name,SchedDate,hyperlink,area_ha&outSR=4326&f=geojson`;
    const cadwWfsUrl = `https://datamap.gov.wales/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=inspire-wg:Cadw_SAM&outputFormat=application/json&srsName=EPSG:4326&bbox=${minLon},${minLat},${maxLon},${maxLat},EPSG:4326&maxFeatures=200`;

    // Query both Historic England & Cadw concurrently
    const [heResult, cadwResult] = await Promise.allSettled([
      (async () => {
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), 6500);
        try {
          const resp = await fetch(arcgisUrl, { signal: c.signal });
          clearTimeout(t);
          if (!resp.ok) return [];
          const data = await resp.json();
          return (data.features || []).map((f: any) => ({
            ...f,
            properties: {
              ...f.properties,
              ListEntry: f.properties?.ListEntry ? String(f.properties.ListEntry).trim() : (f.properties?.OBJECTID ? String(f.properties.OBJECTID) : ''),
              Name: (f.properties?.Name || 'Protected Heritage Asset').trim(),
              SchedDate: f.properties?.SchedDate || '',
              hyperlink: f.properties?.hyperlink || '',
              authority: 'Historic England',
              country: 'England'
            }
          }));
        } catch {
          clearTimeout(t);
          return [];
        }
      })(),
      (async () => {
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), 6500);
        try {
          const resp = await fetch(cadwWfsUrl, { signal: c.signal });
          clearTimeout(t);
          if (!resp.ok) return [];
          const data = await resp.json();
          return (data.features || []).map((f: any) => ({
            ...f,
            properties: {
              ...f.properties,
              ListEntry: (f.properties?.SAMNumber || f.properties?.RecordNumber || '').toString().trim(),
              Name: (f.properties?.Name || 'Scheduled Ancient Monument (Wales)').trim(),
              SchedDate: f.properties?.DesignationDate || '',
              hyperlink: f.properties?.Report || 'https://cadw.gov.wales',
              authority: 'Cadw (Wales)',
              country: 'Wales',
              period: f.properties?.Period ? String(f.properties.Period).trim() : '',
              siteType: f.properties?.SiteType ? String(f.properties.SiteType).trim() : ''
            }
          }));
        } catch {
          clearTimeout(t);
          return [];
        }
      })()
    ]);

    const heFeatures = heResult.status === 'fulfilled' ? heResult.value : [];
    const cadwFeatures = cadwResult.status === 'fulfilled' ? cadwResult.value : [];
    const combinedFeatures = [...heFeatures, ...cadwFeatures];

    const geojsonData = {
      type: 'FeatureCollection',
      features: combinedFeatures
    };
    monumentCache.set(cacheKey, { timestamp: Date.now(), data: geojsonData });

    return res.json(geojsonData);
  } catch (error: any) {
    console.error('Error fetching Scheduled Monuments:', error?.message);
    return res.json({
      type: 'FeatureCollection',
      features: [],
      warning: 'Unable to reach external monuments endpoints: ' + (error?.message || 'timeout')
    });
  }
});

/**
 * Proxy for DataMapWales (Natural Resources Wales) 1m and 2m LiDAR tiles
 * Features seamless fallback: if 1m is requested in a rural Welsh quadrant without 1m,
 * it instantly falls back to 2m DTM/DSM so the user never sees blank tiles!
 */
app.get('/api/wales-lidar/:layer/:z/:x/:y.png', async (req: Request, res: Response) => {
  const { layer, z, x, y } = req.params;
  const zoom = parseInt(z, 10);
  if (isNaN(zoom) || zoom < 0 || zoom > 22) {
    return res.status(400).send('Invalid zoom');
  }

  // Validate layer name (dtm1m, dtm2m, dsm1m, dsm2m)
  const safeLayer = ['dtm1m', 'dtm2m', 'dsm1m', 'dsm2m'].includes(layer) ? layer : 'dtm2m';
  const type = safeLayer.startsWith('dsm') ? 'dsm' : 'dtm';

  const urlsToTry = [
    `https://datamapwales.azureedge.net/imagery/lidar/${safeLayer}/${z}/${x}/${y}.png`,
    `https://datamapwales.azureedge.net/imagery/lidar/${type}2m/${z}/${x}/${y}.png`,
    `https://lt.lidarmap.uk/l/wal/2m/${type}/${z}/${x}/${y}.png`
  ];

  for (const targetUrl of urlsToTry) {
    try {
      const resp = await fetch(targetUrl);
      if (resp.ok) {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        const buffer = Buffer.from(await resp.arrayBuffer());
        return res.send(buffer);
      }
    } catch {
      // try next
    }
  }

  return res.status(404).send('Wales LiDAR tile not found');
});

// Configure Vite middleware in development mode
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`TerraDetect server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
