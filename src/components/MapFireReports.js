import React, { Component } from 'react';
import { Map, Marker, GoogleApiWrapper, InfoWindow, Polygon } from 'google-maps-react'; // added Polygon
import fire16 from '../img/fire16.png';
import fire32 from '../img/fire32.png';
import fire48 from '../img/fire48.png';
import fire64 from '../img/fire64.png';
import fire96 from '../img/fire96.png';

import { withRouter } from 'react-router-dom';
import { Item, Progress } from 'semantic-ui-react';

export class MapFireReports extends Component {
  state = {
    centerGPS: this.props.gps,
    recenterGPS: {},
    activeMarker: {},
    showInfo: false,
    fireName: "",
    fireAcres: 0,
    fireContain: 0,
    fireDuration: 0,
    costToDate: 0,
    finalCost: 0,
    currentZoom: 5, // ADDED: Track zoom level (defaults to initial map zoom)
    windVectors: []
  }
  
  componentDidMount () {
    this.setState({
      centerGPS: this.props.gps
    });
  }
  
  // ADDED: Listener to capture zoom changes dynamically
  handleZoomChanged = (mapProps, map) => {
    if (map) {
      this.setState({ currentZoom: map.getZoom() });
    }
  }

  // Custom click handler for Wildfires
  handleMarkerClick = (props, marker, e) => {
    this.setState({
      fireName: props.fire.name,
      fireAcres: props.fire.acres,
      fireContain: props.fire.containment,
      fireDuration: props.fire.daysBurning,
      activeMarker: marker,
      // ⚡ Add cost metrics to state
      costToDate: props.fire.costToDate,
      finalCost: props.fire.finalCost,
      rawCostToDate: props.fire.rawCostToDate,
      rawFinalCost: props.fire.rawFinalCost,
      showInfo: true,
      recenterGPS: props.position // Centers map on the fire when clicked
    });
  }

  onMapClick = (props) => {
    if (this.state.showInfo) {
      this.setState({
        showInfo: false
      });
    }
  }
// Dynamic Opacity: 0% contained = 1.0 (Full) | 100% contained = 0.25 (Subdued)
  getOpacity = (containment) => {
    if (containment === null || containment === undefined) return 1.0;
    
    const minOpacity = 0.10;
    const maxOpacity = 1.0;
    const opacity = maxOpacity - ((containment / 100) * (maxOpacity - minOpacity));
    
    return parseFloat(opacity.toFixed(2));
  };

  handleMapIdle = async (mapProps, map) => {
    // STEP 1: The Zoom Gate
    // If we are zoomed out (less than 10), clear the wind arrows and stop.
    if (map.getZoom() < 10) {
        if (this.state.windVectors.length > 0) {
            this.setState({ windVectors: [] });
        }
        return;
    }

    // STEP 2: Extract Bounding Box
    const bounds = map.getBounds();
    if (!bounds) return;

    const ne = bounds.getNorthEast(); // Top-Right corner
    const sw = bounds.getSouthWest(); // Bottom-Left corner

    // STEP 3: Generate the 3x3 Grid
    const latDiff = ne.lat() - sw.lat();
    const lngDiff = ne.lng() - sw.lng();

    const lats = [];
    const lngs = [];

    // We slice the screen into thirds and grab the center of each slice (1/6, 3/6, 5/6)
    for (let i = 1; i <= 5; i += 2) {
        lats.push(sw.lat() + (latDiff * (i / 6)));
        lngs.push(sw.lng() + (lngDiff * (i / 6)));
    }

    // Create the cross-product grid of 9 coordinates
    const gridPoints = [];
    lats.forEach(lat => {
        lngs.forEach(lng => {
            gridPoints.push({ lat, lng });
        });
    });

    //console.log("🌪️ DEBUG: Generated 9 Wind Grid Points:", gridPoints);
    
     // STEP 3: The API Fetch (Open-Meteo)
    // Extract lats and lngs into comma-separated strings for the URL
    const latString = gridPoints.map(p => p.lat.toFixed(4)).join(',');
    const lngString = gridPoints.map(p => p.lng.toFixed(4)).join(',');
    
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latString}&longitude=${lngString}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=mph`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // STEP 4: Parse and Store Local State
        // Open-Meteo returns an array of objects for multiple coordinates
        if (Array.isArray(data)) {
            const windData = data.map((point) => ({
                lat: point.latitude,
                lng: point.longitude,
                speed: point.current.wind_speed_10m,
                direction: point.current.wind_direction_10m
            }));

            this.setState({ windVectors: windData });
            //console.log("🌪️ DEBUG: Wind Data Saved to State:", windData);
        }
    } catch (error) {
        console.error("Wind fetch failed:", error);
    }  
}
  // this shows a map with wildfires reports as markers on map
  // each report item from store is mapped to a marker on map based on gps data received from ARCGIS
  // details of the fire is displayed via a infowindow when the marker is clicked
  // initialCenter is to set map center when map is initially loaded using US location
  // center is to set the map center when map is recentered by a user click
  // When user zooms in bured area polygons are displayed
  // When user zooms in further win vectors are shown to indicate direction and force
  render() {
    // Show detailed boundary polygons only when zoomed into localized region (Zoom >= 9) 
    const showPerimeters = this.state.currentZoom >= 9;

    const getWindBarbURI = (speedMph, direction) => {
    const knots = speedMph * 0.868976; // NWS Barbs are strictly measured in knots
    let rounded = Math.round(knots / 5) * 5;
    
    // We use a 60x60 canvas. Center station is at (30,30). Staff points UP (North).
    let path = "M 30 30 L 30 5"; 
    let yOffset = 5; // Start drawing feathers near the top of the staff
    
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
        // NWS Rule: if it's the *only* feather, offset it down the staff slightly
        if (yOffset === 5) yOffset = 8;
        path += ` M 30 ${yOffset} L 35 ${yOffset - 3}`;
    }
    
    // If calm (under 3 knots), draw a simple circle station instead of a staff
    if (knots < 3) {
        path = "M 30 30 m -4 0 a 4 4 0 1 0 8 0 a 4 4 0 1 0 -8 0"; 
    }

    // Bake the Open-Meteo direction directly into the SVG transform
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
    
    // Return as a browser-readable Image URI
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;
};

    return (
      <Map 
        google={this.props.google} 
        zoom={5} 
        initialCenter={{lat: 39.8283, lng: -98.5795}} // Adjusted to center of the US
        center={this.state.recenterGPS}
        onClick={this.onMapClick}
        onZoomChanged={this.handleZoomChanged} // ADDED: Zoom event listener
        onIdle={this.handleMapIdle} // <--- ADDED HERE
      >
        {/* ADDED: Burn Perimeter Layer (Renders only when zoomed in >= 9) */}
        {/* Burn Perimeter Layer (Renders all rings for MultiPolygon fires) */}
        {showPerimeters && this.props.f_reports && this.props.f_reports.map(fire => {
          if (!fire.perimeterRings || fire.perimeterRings.length === 0) return null;

          return fire.perimeterRings.map((ringCoords, ringIdx) => (
            <Polygon
              key={`perimeter-${fire.id}-ring-${ringIdx}`}
              paths={ringCoords}
              strokeColor="#dc2626"   // Solid dark red border
              strokeOpacity={0.8}
              strokeWeight={2}
              fillColor="#ef4444"     // Translucent red fill
              fillOpacity={0.25}
              geodesic={true}
            />
          ));
        })}

        {/* Render Wildfire Markers */}
        {this.props.f_reports && this.props.f_reports.map(fire => {
          const containment = fire.containment ?? 0;
          const activeAcres = fire.acres * (1 - (containment / 100));
          // NEW: Check if this is the most expensive fire
          const isMostExpensive = this.props.mostExpensiveFireName === fire.name;
          // Dynamic 4-tier icon sizing logic
          let selectedIcon = fire16; // Default: Minor (< 1,000 acres)
  
          if (activeAcres >= 100000) {
            selectedIcon = fire96;   // 🆕 The Santa Ana / Mega-Fire Tier
          } else if (activeAcres >= 30000) {
            selectedIcon = fire64;   
          } else if (activeAcres >= 10000) {
            selectedIcon = fire48;   
          } else if (activeAcres >= 3000) {
            selectedIcon = fire32;   
          }
          const iconOpacity = this.getOpacity(fire.containment);
          return (
            <Marker
              key={`fire-pin-${fire.id}`}
              position={fire.position}
              title={fire.name}
              opacity={iconOpacity}   // Visual fading based on containment %
              fire={fire} // Passing the custom fire object down to the marker props
              icon={{ url: selectedIcon }} 
              onClick={this.handleMarkerClick} 
              // NEW: Apply a bouncing animation to the most expensive fire only
              animation={isMostExpensive ? this.props.google.maps.Animation.BOUNCE : null}
            />
          );
        })}
         {/* NEW: Wind Vectors Layer */}
    {this.state.windVectors.map((vector, index) => {
        // Shift rotation by 180 degrees so the arrow points TO the destination, not FROM the origin
        const arrowRotation = (vector.direction + 180) % 360;

        return (
            <Marker 
                key={`wind-${index}`}
                position={{ lat: vector.lat, lng: vector.lng }}
                icon={{
                    // Call our mathematical SVG generator
                    url: getWindBarbURI(vector.speed, vector.direction),
                    // Anchor perfectly on the (30,30) center coordinate
                    anchor: new this.props.google.maps.Point(30, 30) 
                }}
            />
        )
    })}

        {/* Simplified InfoWindow for Fires */}
        <InfoWindow
          marker={this.state.activeMarker}
          visible={this.state.showInfo}
        >
          <Item.Group>
            <Item>
              <Item.Content>
                <Item.Header>{this.state.fireName}</Item.Header>
              </Item.Content>
            </Item>
            <Item>
              <Item.Content>
                <Item.Header>Acres Burned</Item.Header>
                <Item.Description>
                  {this.state.fireAcres ? this.state.fireAcres.toLocaleString() : "Unknown"}
                </Item.Description>
              </Item.Content>
            </Item>  
            <Item>
              <Item.Content>
                <Item.Header>Days Burning</Item.Header>
                <Item.Description>
                  {this.state.fireDuration ? this.state.fireDuration : "Unknown"}
                </Item.Description>
              </Item.Content>
            </Item>  
            <Item>
              <Item.Content>
                <Item.Header>Containment</Item.Header>
                <Item.Description>
                   {this.state.fireContain !== null && this.state.fireContain !== undefined
                   ? `${this.state.fireContain.toLocaleString()}%` 
                  : "Unknown"}
                </Item.Description>
              </Item.Content>
            </Item>  
            {/* Render the Progress Bar only if cost data exists */}
            {this.state.rawFinalCost > 0 ? (
              <div style={{ marginTop: '15px' }}>
                <p style={{ marginBottom: '5px', fontSize: '0.9em' }}>
                  <strong>Used/Budget:</strong> {this.state.costToDate} / {this.state.finalCost}
                </p>
                <Progress 
                  value={this.state.rawCostToDate} 
                  total={this.state.rawFinalCost} 
                  color='orange' 
                  size='tiny' 
                  style={{ margin: 0 }}
                />
              </div>
            ) : null}
          </Item.Group>
        </InfoWindow>
      </Map>
    );
  }
}

export default GoogleApiWrapper({
  apiKey: process.env.REACT_APP_GOOGLE_API_KEY
})(withRouter(MapFireReports));