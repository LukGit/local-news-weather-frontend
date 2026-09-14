// === src/components/MapWaterReports.js ===
import React, { Component } from 'react';
import { Map, Marker, GoogleApiWrapper, InfoWindow, Polygon } from 'google-maps-react';
import { withRouter } from 'react-router-dom';

import flooding64 from '../img/flooding64.png';
import flooding48 from '../img/flooding48.png';
import flooding24 from '../img/flooding24.png';
import warningS from '../img/warning16.png';
import warning16B from '../img/warning16B.png'; // NEW IMPORT


export class MapWaterReports extends Component {
  state = {
    centerGPS: this.props.gps || { lat: 20, lng: 0 },
    recenterGPS: null,
    activeMarker: null,
    showInfo: false,
    selectedFlood: {},
    selectedNWS: null,
    currentZoom: 3,
    polygons: {} 
  };

  componentDidMount() {
    if (this.props.activeSource === 'NWS') {
      this.setState({
        recenterGPS: { lat: 39.8283, lng: -98.5795 },
        currentZoom: 4
      });
    } else if (this.props.gps) {
      this.setState({ centerGPS: this.props.gps });
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.gps !== this.props.gps && this.props.activeSource === 'GDACS') {
      this.setState({ centerGPS: this.props.gps });
    }

    if (prevProps.activeSource !== this.props.activeSource) {
      if (this.props.activeSource === 'NWS') {
        this.setState({
          recenterGPS: { lat: 39.8283, lng: -98.5795 },
          currentZoom: 4,
          showInfo: false
        });
      } else {
        this.setState({
          recenterGPS: this.props.gps || { lat: 20, lng: 0 },
          currentZoom: 3,
          showInfo: false
        });
      }
    }
  }

  handleZoomChanged = (mapProps, map) => {
    if (map && map.getZoom() !== this.state.currentZoom) {
      this.setState({ currentZoom: map.getZoom() });
    }
  };

  handleMarkerClick = (props, marker, e) => {
    const feature = this.props.w_reports.find(f => f.properties.eventid === props.name);
    if (!feature) return;

    const lng = feature.geometry.coordinates[0];
    const lat = feature.geometry.coordinates[1];
    const eventId = feature.properties.eventid;
    const episodeId = feature.properties.episodeid || 1;

    if (!this.state.polygons[eventId]) {
      const polyURL = `https://www.gdacs.org/gdacsapi/api/polygons/getgeometry?eventtype=FL&eventid=${eventId}&episodeid=${episodeId}`;
      
      fetch(polyURL)
        .then(res => res.json())
        .then(geoData => {
          if (geoData && geoData.features) {
            const polyFeature = geoData.features.find(f => 
              f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
            );

            if (polyFeature) {
              const featureGeom = polyFeature.geometry;
              let paths = [];
              
              if (featureGeom.type === 'Polygon') {
                paths = featureGeom.coordinates.map(ring => 
                  ring.map(c => ({ lat: c[1], lng: c[0] }))
                );
              } else if (featureGeom.type === 'MultiPolygon') {
                paths = featureGeom.coordinates.map(poly => 
                  poly[0].map(c => ({ lat: c[1], lng: c[0] }))
                );
              }

              this.setState(prevState => ({
                polygons: { ...prevState.polygons, [eventId]: paths }
              }));
            }
          }
        })
        .catch(err => console.error(`Error fetching polygon for event ${eventId}:`, err));
    }

    this.setState(prevState => ({
      activeMarker: marker,
      showInfo: true,
      selectedFlood: feature.properties,
      selectedNWS: null,
      recenterGPS: { lat, lng },
      currentZoom: prevState.currentZoom < 9 ? 9 : prevState.currentZoom
    }));
  };

  handleNWSClick = (props, marker, report, center) => {
    this.setState(prevState => ({
      activeMarker: marker,
      showInfo: true,
      selectedNWS: report,
      selectedFlood: {},
      recenterGPS: center,
      currentZoom: prevState.currentZoom < 9 ? 9 : prevState.currentZoom
    }));
  };

  onMapClick = () => {
    if (this.state.showInfo) {
      this.setState({ showInfo: false });
    }
  };

  getAlertColor = (alertLevel) => {
    switch (alertLevel) {
      case 'Red': return '#ef4444';
      case 'Orange': return '#f97316';
      case 'Green': return '#22c55e';
      default: return '#6b7280';
    }
  };

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

  get24HourOpacity = (timestampStr, minOpacity = 0.20) => {
    if (!timestampStr) return minOpacity;
    const eventTime = new Date(timestampStr).getTime();
    const now = Date.now();
    const diffInMs = now - eventTime;
    
    if (diffInMs <= 0) return 1.0;
    const hoursPassed = diffInMs / (1000 * 60 * 60);
    if (hoursPassed >= 24) return minOpacity;
    
    const opacity = 1.0 - (hoursPassed / 24);
    return Math.max(minOpacity, opacity);
  };

    render() {
    const { activeSource, w_reports, nws_reports, google } = this.props;
    const { currentZoom, selectedFlood, selectedNWS, polygons } = this.state;
    const showPolygons = currentZoom >= 8;

    return (
      <Map
        google={google}
        zoom={currentZoom}
        initialCenter={this.state.centerGPS}
        center={this.state.recenterGPS || this.state.centerGPS}
        onClick={this.onMapClick}
        onZoomChanged={this.handleZoomChanged}
      >
        {/* ==================== GDACS LAYER ==================== */}
        {activeSource === 'GDACS' && showPolygons && selectedFlood && selectedFlood.eventid && polygons[selectedFlood.eventid] && 
          polygons[selectedFlood.eventid].map((ringCoords, ringIdx) => (
            <Polygon
              key={`flood-poly-${selectedFlood.eventid}-ring-${ringIdx}`}
              paths={ringCoords}
              strokeColor="#3b82f6"
              strokeOpacity={0.8}
              strokeWeight={2}
              fillColor="#60a5fa"
              fillOpacity={0.35}
              geodesic={true}
            />
          ))
        }

        {activeSource === 'GDACS' && w_reports && w_reports.map((feature, index) => {
          if (!feature.geometry || !feature.geometry.coordinates) return null;

          const lng = feature.geometry.coordinates[0];
          const lat = feature.geometry.coordinates[1];
          const alertLevel = feature.properties.alertlevel;

          let floodIcon;
          let iconWidth, iconHeight;

          if (alertLevel === 'Red') {
            floodIcon = flooding64;
            iconWidth = 48;
            iconHeight = 48;
          } else if (alertLevel === 'Orange') {
            floodIcon = flooding48;
            iconWidth = 36;
            iconHeight = 36;
          } else {
            floodIcon = flooding24;
            iconWidth = 24;
            iconHeight = 24;
          }

          const scaledSize = google 
            ? new google.maps.Size(iconWidth, iconHeight) 
            : null;
            
          const anchorPoint = google
            ? new google.maps.Point(iconWidth / 2, iconHeight / 2)
            : null;

          return (
            <Marker
              key={`flood-${feature.properties.eventid || index}`}
              name={feature.properties.eventid}
              position={{ lat, lng }}
              title={feature.properties.name || feature.properties.eventname || "Flood Event"}
              icon={{
                url: floodIcon,
                scaledSize: scaledSize,
                anchor: anchorPoint
              }}
              onClick={this.handleMarkerClick}
            />
          );
        })}

        {/* ==================== NWS LAYER ==================== */}
        {/* 1. Low Zoom View (< 8 Zoom): Centroid Markers */}
        {activeSource === 'NWS' && !showPolygons && nws_reports && nws_reports.map((report, idx) => {
          const coords = report.geometry && report.geometry.coordinates;
          if (!coords) return null;
          const center = this.getPolygonCentroid(coords);
          if (!center) return null;

          const eventType = report.properties.event || 'Flood Threat';
          const timestamp = report.properties?.sent || report.properties?.effective;
          const markerOpacity = this.get24HourOpacity(timestamp, 0.30);

          // MAP COLOR-CODED ICONS
          const isFlash = eventType.includes('Flash');
          const markerIcon = isFlash ? warningS : warning16B;

          return (
            <Marker
              key={`nws-centroid-${idx}`}
              position={center}
              title={report.properties.areaDesc || eventType}
              icon={{ url: markerIcon }}
              opacity={markerOpacity}
              onClick={(props, marker) => this.handleNWSClick(props, marker, {
                id: report.id, // <-- Capture the unique NWS feature ID
                title: eventType,
                area: report.properties.areaDesc,
                summary: report.properties.headline || report.properties.description,
                effective: report.properties.effective,
                expires: report.properties.expires,
                severity: report.properties.severity
              }, center)}
            />
          );
        })}

        {/* 2. Detailed View (>= 8 Zoom): NWS Warning Polygons */}
        {activeSource === 'NWS' && showPolygons && nws_reports && nws_reports.map((report, idx) => {
          if (!this.state.selectedNWS || this.state.selectedNWS.id !== report.id) return null;

          if (!report.geometry || !report.geometry.coordinates) return null;

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
          const isFlash = eventType.includes('Flash');
          const timestamp = report.properties?.sent || report.properties?.effective;
          const opacity = this.get24HourOpacity(timestamp, 0.25);

          return (
            <Polygon
              key={`nws-poly-${idx}`}
              paths={paths}
              options={{
                fillColor: isFlash ? '#dc2626' : '#2563eb',
                fillOpacity: opacity * 0.35,
                strokeColor: isFlash ? '#991b1b' : '#1d4ed8',
                strokeOpacity: opacity,
                strokeWeight: 2
              }}
            />
          );
        })}

        {/* ==================== INFO WINDOW ==================== */}
        <InfoWindow
          marker={this.state.activeMarker}
          visible={this.state.showInfo}
          onClose={() => this.setState({ showInfo: false })}
        >
          <div style={{ minWidth: '220px', maxWidth: '280px', padding: '4px', fontFamily: 'system-ui, sans-serif' }}>
            
            {/* GDACS Info Render */}
            {activeSource === 'GDACS' && selectedFlood && Object.keys(selectedFlood).length > 0 && (
              <>
                <h3 style={{ margin: '0 0 8px 0', paddingBottom: '6px', borderBottom: '1px solid #ddd', fontSize: '16px', lineHeight: '1.3' }}>
                  {selectedFlood.name || selectedFlood.eventname || "Flood Event"} <br/>
                  <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#555' }}>
                    {selectedFlood.country || "Unknown Region"} {selectedFlood.iso3 ? `(${selectedFlood.iso3})` : ''}
                  </span>
                </h3>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
                  <span style={{ fontWeight: '600', color: '#555' }}>Alert Level:</span>
                  <span style={{ color: this.getAlertColor(selectedFlood.alertlevel), fontWeight: 'bold' }}>
                    {selectedFlood.alertlevel || "Unknown"}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
                  <span style={{ fontWeight: '600', color: '#555' }}>Severity Score:</span>
                  <span>{selectedFlood.alertscore ?? 'N/A'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
                  <span style={{ fontWeight: '600', color: '#555' }}>Episode ID:</span>
                  <span>{selectedFlood.episodeid ?? '1'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '13px', color: '#777', marginTop: '8px' }}>
                  <span style={{ fontWeight: '600' }}>Active Period:</span>
                  <span>
                    {selectedFlood.fromdate ? new Date(selectedFlood.fromdate).toLocaleDateString() : '?'} 
                    {' to '} 
                    {selectedFlood.todate ? new Date(selectedFlood.todate).toLocaleDateString() : 'Present'}
                  </span>
                </div>

                {selectedFlood.description && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dotted #ccc', fontSize: '13px', lineHeight: '1.4', color: '#333' }}>
                    {selectedFlood.description}
                  </div>
                )}
                
                {selectedFlood.url && selectedFlood.url.report && (
                  <div style={{ marginTop: '10px', textAlign: 'center' }}>
                    <a 
                      href={selectedFlood.url.report} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ fontSize: '13px', color: '#0066cc', textDecoration: 'none' }}
                    >
                      View Official GDACS Report
                    </a>
                  </div>
                )}
              </>
            )}

            {/* NWS Info Render */}
            {activeSource === 'NWS' && selectedNWS && (
              <>
                <h3 style={{ margin: '0 0 8px 0', paddingBottom: '6px', borderBottom: '1px solid #ddd', fontSize: '16px', lineHeight: '1.3', color: '#2563eb' }}>
                  {selectedNWS.title}
                </h3>

                {selectedNWS.severity && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
                    <span style={{ fontWeight: '600', color: '#555' }}>Severity:</span>
                    <span style={{ fontWeight: 'bold' }}>{selectedNWS.severity}</span>
                  </div>
                )}

                {selectedNWS.area && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
                    <span style={{ fontWeight: '600', color: '#555', flexShrink: 0 }}>Location:</span>
                    <span style={{ fontWeight: 'bold', textAlign: 'right', marginLeft: '12px' }}>
                      {selectedNWS.area}
                    </span>
                  </div>
                )}

                {selectedNWS.summary && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dotted #ccc', fontSize: '13px', lineHeight: '1.4', color: '#333', maxHeight: '120px', overflowY: 'auto' }}>
                    {selectedNWS.summary}
                  </div>
                )}
              </>
            )}

          </div>
        </InfoWindow>
      </Map>
    );
  }
}

export default GoogleApiWrapper({ apiKey: process.env.REACT_APP_GOOGLE_API_KEY })(withRouter(MapWaterReports));