import React, { Component } from 'react';
import { Map, Marker, GoogleApiWrapper, InfoWindow, Polygon } from 'google-maps-react';
import { withRouter } from 'react-router-dom';

// Import your custom flood icons
import flooding64 from '../img/flooding64.png'; 
import flooding48 from '../img/flooding48.png'; 
import flooding24 from '../img/flooding24.png'; 

export class MapWaterReports extends Component {
  state = {
    centerGPS: this.props.gps || { lat: 0, lng: 0 },
    recenterGPS: null,
    activeMarker: null,
    showInfo: false,
    selectedFlood: {},
    currentZoom: 3,
    polygons: {} // Cache for lazy-loaded GDACS GeoJSON geometries
  };

  componentDidMount() {
    if (this.props.gps) {
      this.setState({ centerGPS: this.props.gps });
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.gps !== this.props.gps) {
      this.setState({ centerGPS: this.props.gps });
    }
  }

  // Track map zoom dynamically
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
            
            // FIX: Dynamically find the Polygon or MultiPolygon feature
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
            } else {
              console.warn(`No polygon data available for event ${eventId}.`);
            }
          }
        })
        .catch(err => console.error(`Error fetching polygon for event ${eventId}:`, err));
    }

    this.setState(prevState => ({
      activeMarker: marker,
      showInfo: true,
      selectedFlood: feature.properties,
      recenterGPS: { lat, lng },
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

  render() {
    const showPolygons = this.state.currentZoom >= 8; // Adjust threshold as needed

    return (
      <Map
        google={this.props.google}
        zoom={this.state.currentZoom}
        initialCenter={this.state.centerGPS}
        center={this.state.recenterGPS || this.state.centerGPS}
        onClick={this.onMapClick}
        onZoomChanged={this.handleZoomChanged} // Wire up zoom listener
      >
        
        {/* Render Active Flood Polygon Layer */}
        {showPolygons && this.state.selectedFlood && this.state.selectedFlood.eventid && this.state.polygons[this.state.selectedFlood.eventid] && 
          this.state.polygons[this.state.selectedFlood.eventid].map((ringCoords, ringIdx) => (
            <Polygon
              key={`flood-poly-${this.state.selectedFlood.eventid}-ring-${ringIdx}`}
              paths={ringCoords}
              strokeColor="#3b82f6"   // Solid blue border
              strokeOpacity={0.8}
              strokeWeight={2}
              fillColor="#60a5fa"     // Translucent blue fill
              fillOpacity={0.35}
              geodesic={true}
            />
          ))
        }

        {/* Render Point Markers */}
        {this.props.w_reports && this.props.w_reports.map((feature, index) => {
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

          const scaledSize = this.props.google 
            ? new this.props.google.maps.Size(iconWidth, iconHeight) 
            : null;
            
          const anchorPoint = this.props.google
            ? new this.props.google.maps.Point(iconWidth / 2, iconHeight / 2)
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

        {/* Info Window */}
        <InfoWindow
          marker={this.state.activeMarker}
          visible={this.state.showInfo}
          onClose={() => this.setState({ showInfo: false })}
        >
          <div style={{ minWidth: '220px', maxWidth: '280px', padding: '4px', fontFamily: 'system-ui, sans-serif' }}>
            
            {this.state.showInfo && this.state.selectedFlood && Object.keys(this.state.selectedFlood).length > 0 && (
              <>
                <h3 style={{ margin: '0 0 8px 0', paddingBottom: '6px', borderBottom: '1px solid #ddd', fontSize: '16px', lineHeight: '1.3' }}>
                  {this.state.selectedFlood.name || this.state.selectedFlood.eventname || "Flood Event"} <br/>
                  <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#555' }}>
                    {this.state.selectedFlood.country || "Unknown Region"} {this.state.selectedFlood.iso3 ? `(${this.state.selectedFlood.iso3})` : ''}
                  </span>
                </h3>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
                  <span style={{ fontWeight: '600', color: '#555' }}>Alert Level:</span>
                  <span style={{ color: this.getAlertColor(this.state.selectedFlood.alertlevel), fontWeight: 'bold' }}>
                    {this.state.selectedFlood.alertlevel || "Unknown"}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
                  <span style={{ fontWeight: '600', color: '#555' }}>Severity Score:</span>
                  <span>{this.state.selectedFlood.alertscore ?? 'N/A'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
                  <span style={{ fontWeight: '600', color: '#555' }}>Episode ID:</span>
                  <span>{this.state.selectedFlood.episodeid ?? '1'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '13px', color: '#777', marginTop: '8px' }}>
                  <span style={{ fontWeight: '600' }}>Active Period:</span>
                  <span>
                    {this.state.selectedFlood.fromdate ? new Date(this.state.selectedFlood.fromdate).toLocaleDateString() : '?'} 
                    {' to '} 
                    {this.state.selectedFlood.todate ? new Date(this.state.selectedFlood.todate).toLocaleDateString() : 'Present'}
                  </span>
                </div>

                {this.state.selectedFlood.description && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dotted #ccc', fontSize: '13px', lineHeight: '1.4', color: '#333' }}>
                    {this.state.selectedFlood.description}
                  </div>
                )}
                
                {this.state.selectedFlood.url && this.state.selectedFlood.url.report && (
                  <div style={{ marginTop: '10px', textAlign: 'center' }}>
                    <a 
                      href={this.state.selectedFlood.url.report} 
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
          </div>
        </InfoWindow>
      </Map>
    );
  }
}

export default GoogleApiWrapper({
  apiKey: process.env.REACT_APP_GOOGLE_API_KEY
})(withRouter(MapWaterReports));