// === src/components/MapWaterReports.js ===
import React, { Component } from 'react';
import { Map, Marker, GoogleApiWrapper, InfoWindow, Polygon } from 'google-maps-react';
import { withRouter } from 'react-router-dom';

import flooding64 from '../img/flooding64.png';
import flooding48 from '../img/flooding48.png';
import flooding24 from '../img/flooding24.png';
import warningS from '../img/warning16.png';
import warning16B from '../img/warning16B.png'; // NEW IMPORT
import waterdrop16 from '../img/waterdrop16.png';


export class MapWaterReports extends Component {
  state = {
    centerGPS: this.props.gps || { lat: 20, lng: 0 },
    recenterGPS: null,
    activeMarker: null,
    showInfo: false,
    selectedFlood: {},
    selectedNWS: null,
    currentZoom: 3,
    polygons: {},
    gaugeMarkers: [],
    selectedGauge: null,
    activeGaugeMarker: null 
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
    const eventType = report.title || "";
    const isRiverineFlood = eventType.toLowerCase().includes("flood warning") && 
                            !eventType.toLowerCase().includes("flash");

    // Baseline state: standard NWS InfoWindow and Polygon zoom
    const defaultState = {
      activeMarker: marker,
      showInfo: true,
      selectedNWS: report,
      selectedFlood: {},
      recenterGPS: center,
      currentZoom: this.state.currentZoom < 9 ? 9 : this.state.currentZoom,
      gaugeMarkers: [], // Clear any previous gauges
      selectedGauge: null,
      activeGaugeMarker: null
    };

    if (!isRiverineFlood) {
      this.setState(defaultState);
      return;
    }

    // Retrieve the raw geometry from props to calculate the BBox
    const rawFeature = this.props.nws_reports.find(r => r.id === report.id);
    if (!rawFeature || !rawFeature.geometry) {
      this.setState(defaultState);
      return;
    }

    const bbox = this.getPolygonBBox(rawFeature.geometry);
    if (!bbox) {
      this.setState(defaultState);
      return;
    }

    const usgsUrl = `https://waterservices.usgs.gov/nwis/iv/?format=json&bBox=${bbox}&parameterCd=00065,00060&siteStatus=active`;

    console.log("================ GAUGE DEBUG ================");
    console.log("1. Clicked Event:", report.title);
    console.log("2. Generated BBox:", bbox);
    console.log("3. Request URL:", usgsUrl);

    fetch(usgsUrl)
      .then(res => res.json())
      .then(usgsData => {
        const timeSeries = usgsData?.value?.timeSeries || [];

        if (timeSeries.length === 0) {
          this.setState(defaultState);
          return;
        }
        
        const gaugeDict = {};

        timeSeries.forEach(ts => {
          const sourceInfo = ts.sourceInfo;
          const valObj = ts.values[0]?.value[0];
          const lat = sourceInfo.geoLocation.geogLocation.latitude;
          const lng = sourceInfo.geoLocation.geogLocation.longitude;
          const siteId = sourceInfo.siteCode[0].value;

          // Use the buffered crosshair check to capture valid edge gauges
          if (this.isGaugeNearPolygon(lat, lng, rawFeature.geometry)) {
            if (!gaugeDict[siteId]) {
              gaugeDict[siteId] = {
                id: siteId,
                name: sourceInfo.siteName,
                lat: lat,
                lng: lng,
                value: `${valObj?.value || 'N/A'} ${ts.variable.unit.unitCode}`,
                variable: ts.variable.variableName.split(',')[0],
                time: valObj?.dateTime ? new Date(valObj.dateTime).toLocaleString() : ''
              };
            } else {
              // Append the second metric and its unit
              gaugeDict[siteId].value += ` | ${valObj?.value || 'N/A'} ${ts.variable.unit.unitCode}`;
              // Append the second variable name to the label
              gaugeDict[siteId].variable += ` / ${ts.variable.variableName.split(',')[0]}`;
            }
          }
        });

        const parsedGauges = Object.values(gaugeDict);

        if (parsedGauges.length === 0) {
          this.setState(defaultState);
          return;
        }

        this.setState({
          ...defaultState,
          gaugeMarkers: parsedGauges,
          currentZoom: 10 // Push zoom slightly closer to view the gauge array
        });
      })
      .catch(err => {
        console.error("USGS fetch error:", err);
        this.setState(defaultState);
      });
  };

  onMapClick = () => {
    if (this.state.showInfo || this.state.selectedGauge) {
      this.setState({ showInfo: false, selectedGauge: null, activeGaugeMarker: null });
    }
  }

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
getPolygonBBox = (geometry) => {
    if (!geometry || !geometry.coordinates) return null;
    
    // Flatten arrays depending on GeoJSON shape type
    const rawCoords = geometry.type === 'MultiPolygon' 
      ? geometry.coordinates.flat(2) 
      : geometry.coordinates.flat(1);

    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    rawCoords.forEach(([lng, lat]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });

    // Format strictly for the USGS bBox parameter
    return `${minLng.toFixed(4)},${minLat.toFixed(4)},${maxLng.toFixed(4)},${maxLat.toFixed(4)}`;
  };

  isGaugeInsidePolygon = (gaugeLat, gaugeLng, polygonCoords) => {
    let inside = false;
    // Standard ray-casting point-in-polygon algorithm
    for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
      const xi = polygonCoords[i][0], yi = polygonCoords[i][1];
      const xj = polygonCoords[j][0], yj = polygonCoords[j][1];

      const intersect = ((yi > gaugeLat) !== (yj > gaugeLat)) &&
          (gaugeLng < (xj - xi) * (gaugeLat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };
  isPointInGeoJSON = (lat, lng, geometry) => {
    if (!geometry || !geometry.coordinates) return false;
    
    if (geometry.type === 'Polygon') {
      return this.isGaugeInsidePolygon(lat, lng, geometry.coordinates[0]);
    }
    
    if (geometry.type === 'MultiPolygon') {
      for (let i = 0; i < geometry.coordinates.length; i++) {
        if (this.isGaugeInsidePolygon(lat, lng, geometry.coordinates[i][0])) {
          return true;
        }
      }
    }
    return false;
  };

  isGaugeNearPolygon = (lat, lng, geometry) => {
    // 1. Check the exact mathematical point first
    if (this.isPointInGeoJSON(lat, lng, geometry)) return true;

    // 2. Add a ~0.6 mile tolerance (Crosshair check) to catch shore/bridge gauges
    const offset = 0.01; 
    
    if (this.isPointInGeoJSON(lat + offset, lng, geometry)) return true; // North
    if (this.isPointInGeoJSON(lat - offset, lng, geometry)) return true; // South
    if (this.isPointInGeoJSON(lat, lng + offset, geometry)) return true; // East
    if (this.isPointInGeoJSON(lat, lng - offset, geometry)) return true; // West

    return false;
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
        {/* 3. USGS Gauge Markers (Rendered strictly inside active Riverine Flood Warnings) */}
        {activeSource === 'NWS' && this.state.gaugeMarkers.map(gauge => (
          <Marker
            key={`gauge-${gauge.id}`}
            position={{ lat: gauge.lat, lng: gauge.lng }}
            title={gauge.name}
            icon={{ url: waterdrop16 }}
            onClick={(props, marker, e) => this.setState({ 
              selectedGauge: gauge, 
              activeGaugeMarker: marker, // Anchor to the specific marker element
              showInfo: false 
            })}
          />
        ))}

        {/* ==================== USGS GAUGE INFO WINDOW ==================== */}
        {/* Render unconditionally, control via visibility and child rendering */}
        <InfoWindow
          marker={this.state.activeGaugeMarker}
          visible={!!this.state.selectedGauge}
          onClose={() => this.setState({ selectedGauge: null, activeGaugeMarker: null })}
        >
          {this.state.selectedGauge ? (
            <div style={{ minWidth: '200px', padding: '4px', fontFamily: 'system-ui, sans-serif' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#1e3a8a', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
                {this.state.selectedGauge.name}
              </h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '13px' }}>
                <span style={{ fontWeight: '600', color: '#555' }}>{this.state.selectedGauge.variable}:</span>
                <span style={{ fontWeight: 'bold' }}>{this.state.selectedGauge.value}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#777', marginTop: '6px', textAlign: 'right' }}>
                Updated: {this.state.selectedGauge.time}
              </div>
            </div>
          ) : <div />}
        </InfoWindow>

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