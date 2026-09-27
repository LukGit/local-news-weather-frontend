/**
 * Calculates a dynamic cross-product grid of coordinates within a map's bounding box
 * and fetches live wind speed and direction data from Open-Meteo.
 * 
 * @param {Object} bounds - Google Maps LatLngBounds object
 * @param {number} gridDensity - The N x N grid size (e.g., 3 = 3x3 grid, 5 = 5x5 grid)
 * @returns {Array} Array of wind data objects with lat, lng, speed, and direction
 */
export const fetchWindGridData = async (bounds, gridDensity = 3) => {
    if (!bounds) return [];

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    const latDiff = ne.lat() - sw.lat();
    const lngDiff = ne.lng() - sw.lng();

    const lats = [];
    const lngs = [];

    // Dynamically slice the grid based on the requested density 
    for (let i = 1; i <= gridDensity; i++) {
        const fraction = (2 * i - 1) / (2 * gridDensity);
        lats.push(sw.lat() + (latDiff * fraction));
        lngs.push(sw.lng() + (lngDiff * fraction));
    }

    const gridPoints = [];
    lats.forEach(lat => {
        lngs.forEach(lng => {
            gridPoints.push({ lat, lng });
        });
    });

    const latString = gridPoints.map(p => p.lat.toFixed(4)).join(',');
    const lngString = gridPoints.map(p => p.lng.toFixed(4)).join(',');

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latString}&longitude=${lngString}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=mph`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (Array.isArray(data)) {
            return data.map((point) => ({
                lat: point.latitude,
                lng: point.longitude,
                speed: point.current.wind_speed_10m,
                direction: point.current.wind_direction_10m
            }));
        }
        return [];
    } catch (error) {
        console.error("Wind fetch failed:", error);
        return [];
    }
};

/**
 * Generates an SVG data URI for a standard NWS wind barb.
 * 
 * @param {number} speedMph - Wind speed in miles per hour
 * @param {number} direction - Meteorological wind direction in degrees
 * @returns {string} Data URI of the generated SVG
 */
export const getWindBarbURI = (speedMph, direction) => {
    const knots = speedMph * 0.868976; 
    let rounded = Math.round(knots / 5) * 5;

    let path = "M 30 30 L 30 5"; 
    let yOffset = 5; 

    // 50 knots (Triangle pennants)
    const fifties = Math.floor(rounded / 50);
    rounded -= fifties * 50;
    for (let i = 0; i < fifties; i++) {
        path += ` M 30 ${yOffset} L 40 ${yOffset + 2} L 30 ${yOffset + 6} Z`;
        yOffset += 7;
    }

    // 10 knots (Long feathers)
    const tens = Math.floor(rounded / 10);
    rounded -= tens * 10;
    for (let i = 0; i < tens; i++) {
        path += ` M 30 ${yOffset} L 40 ${yOffset - 4}`;
        yOffset += 5;
    }

    // 5 knots (Short feathers)
    const fives = Math.floor(rounded / 5);
    if (fives > 0) {
        if (yOffset === 5) yOffset = 8;
        path += ` M 30 ${yOffset} L 35 ${yOffset - 3}`;
    }

    // Calm
    if (knots < 3) {
        path = "M 30 30 m -4 0 a 4 4 0 1 0 8 0 a 4 4 0 1 0 -8 0"; 
    }

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
            <g transform="rotate(${direction}, 30, 30)">
                <path d="${path}" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" />
                <circle cx="30" cy="30" r="3.5" fill="#FFFFFF" />
                
                <path d="${path}" fill="#222222" stroke="#222222" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
                <circle cx="30" cy="30" r="2" fill="#222222" />
            </g>
        </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;
};
