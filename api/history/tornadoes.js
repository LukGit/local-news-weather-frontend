// api/history/tornadoes.js
const DAT_LINES_URL =
  'https://services.dat.noaa.gov/arcgis/rest/services/nws_damageassessmenttoolkit/DamageViewer/FeatureServer/1';

const CATALOG_FIELDS = [
  'objectid',
  'wfo',
  'event_id',
  'stormdate',
  'starttime',
  'endtime',
  'startlat',
  'startlon',
  'endlat',
  'endlon',
  'length',
  'width',
  'efscale',
  'efnum',
  'maxwind',
  'injuries',
  'fatalities',
  'comments',
].join(',');

function getRolling12MonthStart() {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function cleanNumber(val, allowZero = true) {
  if (val === null || val === undefined || val === -99) return null;
  if (!allowZero && val === 0) return null;
  return val;
}

function normalizeTornadoRecord(a) {
  if (
    typeof a.startlat !== 'number' ||
    typeof a.startlon !== 'number' ||
    (a.startlat === 0 && a.startlon === 0)
  ) {
    return null;
  }

  return {
    id: a.objectid,
    wfo: a.wfo || null,
    title: a.event_id || 'Surveyed Tornado',
    date: a.stormdate ? new Date(a.stormdate).toISOString() : null,
    startTime: a.starttime ? new Date(a.starttime).toISOString() : null,
    endTime: a.endtime ? new Date(a.endtime).toISOString() : null,
    startLat: a.startlat,
    startLng: a.startlon,
    endLat: cleanNumber(a.endlat, false),
    endLng: cleanNumber(a.endlon, false),
    lengthMi: cleanNumber(a.length, true),
    widthYd: cleanNumber(a.width, false),
    efScale: (a.efscale || 'EFU').trim().toUpperCase(),
    efNum: a.efnum !== null && a.efnum !== undefined && a.efnum >= 0 ? a.efnum : null,
    maxWind: cleanNumber(a.maxwind, false),
    injuries: cleanNumber(a.injuries, true) || 0,
    fatalities: cleanNumber(a.fatalities, true) || 0,
    comments: a.comments ? a.comments.trim() : null,
  };
}

async function fetchPaginatedCatalog(whereClause) {
  const allFeatures = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({
      where: whereClause,
      outFields: CATALOG_FIELDS,
      returnGeometry: 'false',
      orderByFields: 'stormdate ASC',
      resultOffset: String(offset),
      f: 'json',
    });

    const response = await fetch(`${DAT_LINES_URL}/query?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`NWS DAT catalog request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || 'NWS DAT ArcGIS query error');
    }

    const batch = data.features || [];
    allFeatures.push(...batch);
    offset += batch.length;
    hasMore = Boolean(data.exceededTransferLimit) && batch.length > 0;
  }

  return allFeatures
    .map((f) => normalizeTornadoRecord(f.attributes || {}))
    .filter(Boolean);
}

export default async function handler(req, res) {
  const { mode = 'catalog', id } = req.query;

  try {
    // Micro Drill-Down: single tornado surveyed LineString path
    if (id) {
      const objectId = parseInt(id, 10);
      if (Number.isNaN(objectId)) {
        return res.status(400).json({ error: 'Invalid numeric objectid' });
      }

      const params = new URLSearchParams({
        where: `objectid = ${objectId}`,
        outFields: CATALOG_FIELDS,
        returnGeometry: 'true',
        outSR: '4326',
        f: 'json',
      });

      const response = await fetch(`${DAT_LINES_URL}/query?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`NWS DAT detail request failed with status ${response.status}`);
      }

      const data = await response.json();
      const feature = data.features?.[0];
      if (!feature) {
        return res.status(404).json({ error: `Tornado track ${objectId} not found` });
      }

      const record = normalizeTornadoRecord(feature.attributes || {});
      const rawPath = feature.geometry?.paths?.[0] || [];
      const path = rawPath.map(([lng, lat]) => ({ lat, lng }));

      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
      return res.status(200).json({
        ...record,
        vertexCount: path.length,
        path,
      });
    }

    // Macro Distribution Layer: rolling 12-month touchdown catalog
    if (mode === 'catalog') {
      const windowStartUTC = getRolling12MonthStart();
      const whereClause = `UPPER(efscale) LIKE 'EF%' AND stormdate >= TIMESTAMP '${windowStartUTC}'`;
      const tornadoes = await fetchPaginatedCatalog(whereClause);

      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).json({
        windowStartUTC,
        count: tornadoes.length,
        tornadoes,
      });
    }

    return res.status(400).json({ error: 'Unsupported query parameters' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
