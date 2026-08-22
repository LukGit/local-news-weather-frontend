import React, { Component } from 'react';
import { Map, GoogleApiWrapper, Marker, Polygon, InfoWindow } from 'google-maps-react';
import { withRouter } from 'react-router-dom';
import tornadoS from '../img/tornado30.png';
import warningS from '../img/warning16.png';

class MapTornadoReports extends Component {
  state = {
    currentZoom: 5,
    touchdowns: [],
    selectedReport: null,
    activeMarker: null,
    showingInfoWindow: false
  };

  componentDidMount() {
    // IEM historical format for August 20, 2026 (YYYYMMDDHHMM)
    //const oldURL = 'https://mesonet.agron.iastate.edu/geojson/lsr.php?sts=202608200000&ets=202608210000';
    const lsrURL = 'https://mesonet.agron.iastate.edu/geojson/lsr.php?hours=24';
    fetch(lsrURL)
      .then(res => res.json())
      .then(data => {
          // Log 1: See if the endpoint returns ANY weather reports at all
          //console.log("📡 Raw NWS Spotter Reports (All Weather):", data.features ? data.features.length : 0);
          
          let twisters = [];
          if (data && data.features) {
            twisters = data.features.filter(
              f => f.properties && f.properties.typetext === 'TORNADO'
            );
          }
          this.setState({ touchdowns: twisters });
          
          // Log 2: The one I accidentally deleted!
          //console.log("🌪️ Confirmed Touchdowns (August 20):", twisters.length);
      })
      .catch(err => console.error("Error fetching LSR touchdown data:", err));
  }

  // RESTORED: Original center-of-mass math that survives MultiPolygons
  getPolygonCentroid = (coordinates) => {
    if (!coordinates || !coordinates.length) return null;
    
    const extractPoints = (arr) => {
      if (typeof arr[0] === 'number') return [arr]; 
      if (typeof arr[0][0] === 'number') return arr; 
      
      let pts = [];
      for (let i = 0; i < arr.length; i++) {
        pts = pts.concat(extractPoints(arr[i]));
      }
      return pts;
    };

    const pts = extractPoints(coordinates);
    if (pts.length === 0) return null;

    let sumLat = 0;
    let sumLng = 0;
    pts.forEach(pt => {
      sumLng += pt[0];
      sumLat += pt[1];
    });
    
    return { lat: sumLat / pts.length, lng: sumLng / pts.length };
  };

  handleZoomChanged = (mapProps, map) => {
      if (map && map.getZoom() !== this.state.currentZoom) {
        this.setState({ currentZoom: map.getZoom() });
      }
  };

  onMapClick = (props) => {
    if (this.state.showingInfoWindow) {
      this.setState({
        showingInfoWindow: false
      })
    }
  }
  onMarkerClick = (props, marker, report) => {
    this.setState({
      selectedReport: report,
      activeMarker: marker,
      showingInfoWindow: true
    });
  };

  onInfoWindowClose = () => {
    this.setState({
      showingInfoWindow: false,
      activeMarker: null,
      selectedReport: null
    });
  };

  render() {
    const { currentZoom, touchdowns } = this.state;
    const { t_reports, google, gps } = this.props;
      
    const showDetailedPolygons = currentZoom >= 9;
    //console.log("touchdowns:", touchdowns)
    /**
 * Calculates dynamic opacity based on a 24-hour rolling window.
 * @param {string|number} timestampStr - ISO string or epoch timestamp
 * @param {number} minOpacity - Minimum visibility floor (default 0.20)
 * @returns {number} Normalized opacity value between minOpacity and 1.0
 */
const get24HourOpacity = (timestampStr, minOpacity = 0.20) => {
  if (!timestampStr) return minOpacity;

  const eventTime = new Date(timestampStr).getTime();
  const now = Date.now();
  const diffInMs = now - eventTime;

  // Handle future timestamp anomalies or clock skew
  if (diffInMs <= 0) return 1.0;

  const hoursPassed = diffInMs / (1000 * 60 * 60);

  // Expired beyond 24 hours
  if (hoursPassed >= 24) return minOpacity;

  // Linear decay formula over 24 hours
  const opacity = 1.0 - (hoursPassed / 24);

  return Math.max(minOpacity, opacity);
};
    return (
      <Map
        google={google}
        zoom={currentZoom}
        initialCenter={gps}
        onZoomChanged={this.handleZoomChanged}
        onClick={this.onMapClick}
        style={{ width: '100%', height: '100%' }}
      >
      {/* 1. National View (< 9 Zoom): Centroid Markers */}
      {!showDetailedPolygons && t_reports && t_reports.map((report, idx) => {
        const coords = report.geometry && report.geometry.coordinates;
        if (!coords) return null;
        const center = this.getPolygonCentroid(coords);
        if (!center) return null;
        const eventType = report.properties.event || 'Tornado Threat';
          // Extract timestamp and calculate opacity
        const timestamp = report.properties?.sent || report.properties?.effective;
        const markerOpacity = get24HourOpacity(timestamp, 0.20);
        return (
          <Marker
            key={`centroid-${idx}`}
            position={center}
            title={report.properties.areaDesc || eventType}
            icon={{
                url: warningS,
             }}
            opacity={markerOpacity} // Apply dynamic fading here
            onClick={(props, marker) => this.onMarkerClick(props, marker, {
              title: eventType,
              area: report.properties.areaDesc,
              summary: report.properties.headline || report.properties.description
            })}
          />
        );
      })}

      {/* 2. Regional View (>= 9 Zoom): Warning Polygons */}
      {showDetailedPolygons && t_reports && t_reports.map((report, idx) => {
        if (!report.geometry || !report.geometry.coordinates) return null;   
        
        // Safely extract paths for both Polygon and MultiPolygon
        const paths = [];
        const extractPaths = (arr) => {
            if (typeof arr[0][0] === 'number') {
                paths.push(arr.map(pt => ({ lat: pt[1], lng: pt[0] })));
            } else {
                arr.forEach(extractPaths);
            }
        };
        extractPaths(report.geometry.coordinates);

        const eventType = report.properties.event || '';
        const isWarning = eventType.includes('Warning');
        const timestamp = report.properties?.sent || report.properties?.effective;
        const opacity = get24HourOpacity(timestamp, 0.20);

        return (
          <Polygon
            key={`poly-${idx}`}
            paths={paths}
            options={{
              fillColor: isWarning ? '#FF0000' : '#FFA500',
              fillOpacity: opacity * 0.35, // Keep fill lighter than border
              strokeColor: isWarning ? '#CC0000' : '#FF8C00',
              strokeOpacity: opacity,
              strokeWeight: 2
            }}
          />
        );
      })}

      {/* 3. Spotter Touchdowns: Bouncing Pins */}
      {touchdowns.map((td, idx) => {
        const [lng, lat] = td.geometry.coordinates;
        const props = td.properties;
        const timestamp = td.properties?.valid;
        const markerOpacity = get24HourOpacity(timestamp, 0.30);

        return (
          <Marker
            key={`touchdown-${idx}`}
            position={{ lat, lng }}
            animation={google.maps.Animation.BOUNCE}
            icon={{
              url: tornadoS,
              scaledSize: new google.maps.Size(32, 32)
            }}
            opacity={markerOpacity}
            onClick={(propsObj, marker) => this.onMarkerClick(propsObj, marker, {
              title: '🌪️ Confirmed Tornado Touchdown',
              area: `${props.city || ''}, ${props.state || ''}`,
              summary: props.remark || 'NWS Spotter Report',
              mag: props.magnitude
            })}
          />
        );
      })}
      
      {/* 4. Details Popup */}
      <InfoWindow
        marker={this.state.activeMarker}
        visible={this.state.showingInfoWindow}
        onClose={this.onInfoWindowClose}
      >
        <div style={{ padding: '4px', maxWidth: '280px' }}>
          {this.state.selectedReport && (
            <>
              <h4 style={{ margin: '0 0 6px 0', color: '#D9534F' }}>
                {this.state.selectedReport.title}
              </h4>
              {this.state.selectedReport.area && (
                <p style={{ margin: '0 0 6px 0', fontWeight: 'bold', fontSize: '0.85rem' }}>
                  📍 {this.state.selectedReport.area}
                </p>
              )}
              <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.3' }}>
                {this.state.selectedReport.summary}
              </p>
            </>
          )}
        </div>
      </InfoWindow>
      </Map>
    );
  }
}

export default GoogleApiWrapper({
  apiKey: process.env.REACT_APP_GOOGLE_API_KEY
})(withRouter(MapTornadoReports));
