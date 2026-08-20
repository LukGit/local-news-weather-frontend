import React, { Component } from 'react';
import { Map, GoogleApiWrapper, Marker, Polygon, InfoWindow } from 'google-maps-react';
import { withRouter } from 'react-router-dom';
import tornadoS from '../img/tornado30.png';

class MapTornadoReports extends Component {
  state = {
    currentZoom: 5,
    touchdowns: [],
    selectedReport: null,
    activeMarker: null,
    showingInfoWindow: false
  };

  componentDidMount() {
    fetch('https://mesonet.agron.iastate.edu/geojson/lsr.php?recent=1440')
      .then(res => res.json())
      .then(data => {
          let twisters = [];
          if (data && data.features) {
            twisters = data.features.filter(
            f => f.properties && f.properties.typetext === 'TORNADO'
            );
          }
          this.setState({ touchdowns: twisters });
          console.log("🌪️ Confirmed Touchdowns (Last 24h):", twisters.length);
      })
      .catch(err => console.error("Error fetching LSR touchdown data:", err));
  }

  getPolygonCentroid = (coordinates) => {
    if (!coordinates || !coordinates[0]) return null;
      const pts = coordinates[0];
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
      
    // LOD Zoom Threshold
    const showDetailedPolygons = currentZoom >= 7;

    return (
      <Map
        google={google}
        zoom={currentZoom}
        initialCenter={gps}
        onZoomChanged={this.handleZoomChanged}
        style={{ width: '100%', height: '100%' }}
      >
      {/* 1. National View (< 7 Zoom): Centroid Markers (No custom icons, uses default red pin) */}
      {!showDetailedPolygons && t_reports && t_reports.map((report, idx) => {
        const coords = report.geometry && report.geometry.coordinates;
        if (!coords) return null;
          const center = this.getPolygonCentroid(coords);
        if (!center) return null;
        const eventType = report.properties.event || 'Tornado Threat';
        return (
          <Marker
            key={`centroid-${idx}`}
            position={center}
            title={report.properties.headline || eventType}
            onClick={(props, marker) => this.onMarkerClick(props, marker, {
            title: eventType,
            area: report.properties.areaDesc,
            summary: report.properties.headline || report.properties.description
            })}
          />
        );
      })}

      {/* 2. Regional View (>= 7 Zoom): Warning Polygons */}
      {showDetailedPolygons && t_reports && t_reports.map((report, idx) => {
        if (!report.geometry || !report.geometry.coordinates) return null;   
          const paths = report.geometry.coordinates[0].map(pt => ({
            lat: pt[1], lng: pt[0]
        }));
        const eventType = report.properties.event || '';
        const isWarning = eventType.includes('Warning');
        return (
          <Polygon
            key={`poly-${idx}`}
            paths={paths}
            options={{
              fillColor: isWarning ? '#FF0000' : '#FFA500',
              fillOpacity: 0.35,
              strokeColor: isWarning ? '#CC0000' : '#FF8C00',
              strokeOpacity: 0.9,
              strokeWeight: 2
            }}
          />
        );
      })}
      {/* 3. Spotter Touchdowns: Bouncing Pins */}
      {touchdowns.map((td, idx) => {
        const [lng, lat] = td.geometry.coordinates;
        const props = td.properties;
        return (
          <Marker
            key={`touchdown-${idx}`}
            position={{ lat, lng }}
            animation={google.maps.Animation.BOUNCE}
            icon={{
              url: tornadoS, // Path to your public folder asset
              scaledSize: new google.maps.Size(32, 32) // Keeps it cleanly sized
            }}
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
})(withRouter(MapTornadoReports))