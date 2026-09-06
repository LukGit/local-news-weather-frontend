const AdmZip = require('adm-zip');
const { DOMParser } = require('@xmldom/xmldom');

module.exports = async function(req, res) {
    try {
        const HKO_ZIP_URL = 'https://data.weather.gov.hk/weatherAPI/hko_data/csdi/dataset/tc.zip';
        const response = await fetch(HKO_ZIP_URL);

        if (!response.ok) {
            return res.status(200).json({ activeStorms: [], pastTracks: {}, futureTracks: {} });
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const zip = new AdmZip(buffer);
        
        const activeStorms = [];
        const pastTracks = {};
        const futureTracks = {};

        zip.getEntries().forEach(entry => {
            if (!entry.isDirectory && entry.entryName.endsWith('.gml')) {
                const content = entry.getData().toString('utf8');
                const doc = new DOMParser().parseFromString(content, 'text/xml');
                
                const features = doc.getElementsByTagName('ogr:featureMember');
                
                let stormId = null;
                let stormName = 'Unknown';
                const past = [];
                const future = [];
                let latestPoint = null;

                for (let i = 0; i < features.length; i++) {
                    const tcNode = features[i].getElementsByTagName('ogr:tc')[0];
                    if (!tcNode) continue;

                    // 1. Extract Header Info (usually the first node)
                    const idNode = tcNode.getElementsByTagName('ogr:TropicalCycloneID')[0];
                    if (idNode) {
                        stormId = `HKO-${idNode.textContent}`;
                        const nameNode = tcNode.getElementsByTagName('ogr:TropicalCycloneEnglishName')[0];
                        if (nameNode) stormName = nameNode.textContent;
                        continue;
                    }

                    // 2. Extract Track Data
                    const latNode = tcNode.getElementsByTagName('ogr:Latitude')[0];
                    const lonNode = tcNode.getElementsByTagName('ogr:Longitude')[0];
                    const typeNode = tcNode.getElementsByTagName('ogr:InformationType')[0];
                    const windNode = tcNode.getElementsByTagName('ogr:MaximumWind')[0];

                    if (latNode && lonNode) {
                        // Strip 'N'/'S'/'E'/'W' and parse to float
                        const lat = parseFloat(latNode.textContent.replace(/[^0-9.-]/g, ''));
                        const lng = parseFloat(lonNode.textContent.replace(/[^0-9.-]/g, ''));
                        
                        // Convert km/h to mph for NOAA compatibility (1 km/h = 0.621371 mph)
                        let windMph = 0;
                        if (windNode) {
                            const windKmh = parseFloat(windNode.textContent.replace(/[^0-9.-]/g, ''));
                            windMph = Math.round(windKmh * 0.621371);
                        }

                        const pointData = { lat, lng, intensity: windMph };
                        const infoType = typeNode ? typeNode.textContent : 'PastInformation';

                        if (infoType === 'PastInformation' || infoType === 'CurrentInformation') {
                            past.push(pointData);
                            latestPoint = pointData; // Keep updating to find the most recent "Current" location
                        } else if (infoType === 'ForecastInformation' || infoType === 'Forecast') {
                            future.push(pointData);
                        }
                    }
                }

                // 3. Assemble the storm if valid data was found
                if (stormId && latestPoint) {
                    pastTracks[stormId] = past.map(p => ({ lat: p.lat, lng: p.lng }));
                    futureTracks[stormId] = future.map(p => ({ lat: p.lat, lng: p.lng }));

                    activeStorms.push({
                        id: stormId,
                        name: stormName,
                        classification: latestPoint.intensity >= 74 ? 'TY' : 'TS', // Basic classification fallback
                        latitudeNumeric: latestPoint.lat,
                        longitudeNumeric: latestPoint.lng,
                        intensity: latestPoint.intensity,
                        pressure: 980, // Default fallback
                        movementSpeed: 10,
                        movementDir: 0,
                        publicAdvisory: { url: 'https://www.hko.gov.hk/en/wxinfo/currwx/tc_pos.htm' },
                        forecastAdvisory: { url: 'https://www.hko.gov.hk/en/wxinfo/currwx/tc_pos.htm' },
                        lastUpdate: new Date().toISOString()
                    });
                }
            }
        });

        // Return the parsed payload formatted exactly like the NOAA payload
        res.status(200).json({
            message: "HKO Parsed Successfully",
            activeStorms,
            pastTracks,
            futureTracks
        });

    } catch (error) {
        console.error("GML Parsing Error:", error);
        res.status(500).json({ error: error.message });
    }
};