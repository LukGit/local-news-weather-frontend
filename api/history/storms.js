// === api/history/storms.js ===
module.exports = async (req, res) => {
  const targetBasins = ['NA', 'EP', 'WP'];
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  try {
    const response = await fetch('https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/csv/ibtracs.last3years.list.v04r01.csv', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/csv, application/csv, text/plain'
      }
    });

    if (!response.ok) {
      throw new Error(`NOAA rejected the request: ${response.status} ${response.statusText}`);
    }
    
    const csvText = await response.text();
    const rows = csvText.split('\n');
    const storms = {};

    for (let i = 2; i < rows.length; i++) {
      const row = rows[i].trim();
      if (!row) continue;
      
      const cols = row.split(',');
      const sid = cols[0]?.trim();
      const basin = cols[3]?.trim();
      const name = cols[5]?.trim();
      const isoTimeStr = cols[6]?.trim();
      const nature = cols[7]?.trim();
      const lat = parseFloat(cols[8]);
      const lon = parseFloat(cols[9]);
      const wind = parseFloat(cols[23]) || parseFloat(cols[10]) || 0;

      if (!sid || !targetBasins.includes(basin) || isNaN(lat) || isNaN(lon)) continue;

      const obsDate = new Date(isoTimeStr);
      if (obsDate < oneYearAgo) continue;

      if (!storms[sid]) {
        storms[sid] = { id: sid, name: name || 'UNNAMED', basin: basin, segments: [] };
      }

      const storm = storms[sid];
      
      let currentStatus = "Unknown";
      if (nature === "ET" || nature === "DS") currentStatus = "Low";
      else if (wind >= 64) currentStatus = "Hurricane";
      else if (wind >= 34) currentStatus = "Tropical Storm";
      else currentStatus = "Depression";

      const lastSegment = storm.segments[storm.segments.length - 1];

      if (!lastSegment || lastSegment.status !== currentStatus) {
        const newSegment = {
          status: currentStatus,
          // ENRICHED: [lat, lon, wind, date]
          coordinates: [[lat, lon, wind, isoTimeStr]], 
          startDate: isoTimeStr,
          windSpeed: wind
        };
        
        // Stitch the tracks together so there are no visual gaps
        if (lastSegment && lastSegment.coordinates.length > 0) {
          const lastCoord = lastSegment.coordinates[lastSegment.coordinates.length - 1];
          newSegment.coordinates.unshift(lastCoord);
        }
        storm.segments.push(newSegment);
      } else {
        // ENRICHED: [lat, lon, wind, date]
        lastSegment.coordinates.push([lat, lon, wind, isoTimeStr]);
        if (wind > lastSegment.windSpeed) lastSegment.windSpeed = wind;
      }
    }

    const validStorms = Object.values(storms).filter(s => s.segments.length > 0);
    
    // Serve fresh data on every request
    res.status(200).json({ historyStorms: validStorms });

  } catch (error) {
    console.error("❌ BACKEND CRASH:", error);
    res.status(200).json({ 
      historyStorms: [], 
      DEBUG_ERROR: error.message || error.toString() 
    });
  }
};