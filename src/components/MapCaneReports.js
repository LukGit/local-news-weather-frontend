import React, { Component } from 'react';
import { Map, Marker, GoogleApiWrapper, InfoWindow, Polyline, Polygon } from 'google-maps-react';
import caneS from '../img/hts24.png'
import caneM from '../img/hts32.png'
import caneL from '../img/hts48.png'
import { withRouter } from 'react-router-dom'
//import { Item } from 'semantic-ui-react/dist/commonjs'


export class MapCaneReports extends Component {
  // map gps center is determined by zip code after login
  state = {
    centerGPS: this.props.gps,
    filterReports: [],
    recenterGPS: {},
    hMarker: null,
    showInfo: false,
    caneName: "",
    caneClass: "",
    caneIntensity: "",
    canePressure: "",
    caneSpeedDir: "",
    caneAdviceLink: "",
    caneUpdated: "",
    caneForecastLink: ""
  }
  
  componentDidMount () {
    // set center GPS to user registered GPS
    this.setState({
      centerGPS: this.props.gps
    })
  }
  
  handleClick = (props, marker, e) => {
    // this set the detail information of the quake and turn on the infowindow
    const cane = this.props.c_reports.find(r => r.id === props.name)
    let hClass = "Unknown"
    if (cane.classification === "HU") {
      hClass = "Hurricane"
    } else if (cane.classification === "TD") {
      hClass = "Tropical Depression"
    } else if (cane.classification === "STD") {
      hClass = "Subtropical Depression"
    } else if (cane.classification === "TS") {
      hClass = "Tropical Storm"
    } else if (cane.classification === "STS") {
      hClass = "Subtropical Storm"
    } else if (cane.classification === "PTC") {
      hClass = "Post-tropical Cyclone / Remnants"
    } else if (cane.classification === "TY") {
      hClass = "Typhoon"
    } else if (cane.classification === "PC") {
      hClass = "Potential Tropical Cyclone"
    } else {
      hClass = "Unclassified"
    }
  
  let hDir = ""
  if (cane.movementDir < 22.5) {
    hDir = "N"
  } else if (cane.movementDir < 45) {
    hDir = "NNE"
  } else if (cane.movementDir < 67.5) {
    hDir = "NE"
  } else if (cane.movementDir < 90) {
    hDir = "ENE"
  } else if (cane.movementDir < 112.5) {
    hDir = "E"
  } else if (cane.movementDir < 135) {
    hDir = "ESE"
  } else if (cane.movementDir < 157.5) {
    hDir = "SE"
  } else if (cane.movementDir < 180) {
    hDir = "SSE"
  } else if (cane.movementDir < 202.5) {
    hDir = "S"
  } else if (cane.movementDir < 225) {
    hDir = "SSW"
  } else if (cane.movementDir < 247.5) {
    hDir = "SW"
  } else if (cane.movementDir < 270) {
    hDir = "WSW"
  } else if (cane.movementDir < 292.5) {
    hDir = "W"
  } else if (cane.movementDir < 315) {
    hDir = "WNW"
  } else if (cane.movementDir < 337.5) {
    hDir = "NW"
  } else if (cane.movementDir < 360) {
    hDir = "NNW"
  } else {
    hDir = "N"
  }
    
  this.setState({
    caneName: cane.name,
    caneClass: hClass,
    caneIntensity: `${cane.intensity}mph`,
    caneSpeedDir: `${cane.movementSpeed}mph ${hDir}`,
    canePressure: `${cane.pressure}mbar`,
    caneAdviceLink: cane.publicAdvisory.url,
    caneForecastLink: cane.forecastAdvisory.url,
    caneUpdated: cane.lastUpdate,
    hMarker: marker,
    showInfo: true,
    recenterGPS: {lat: cane.latitudeNumeric, lng: cane.longitudeNumeric}
  })
  }
  onMapClick = (props) => {
    if (this.state.showInfo) {
      this.setState({
        showInfo: false
      })
    }
  }
  // this shows a map with tropical cyclones reports as markers on map
  // each report item from store is mapped to a marker on map based on gps data received from NHC
  // details of the cyclone is displayed via a infowindow when the marker is clicked
  // initialCenter is to set map center when map is initially loaded based on US location
  // center is to set the map center when map is recentered by a user click
  // Added new code to plot hurricane past and future tracks on the map 7/2/2026
  // Added new code to plot hurricane future path uncertainty cone on the map  7/14/2026
render() {
  
  const formatShortDate = (isoString) => {
    if (!isoString) return "Unknown";
    const d = new Date(isoString);
    // Outputs: "Sep 5, 19:58"
    return d.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute:'2-digit', 
      hour12: false 
    });
  };
    return (
      <Map 
        google={this.props.google} 
        zoom={4} 
        initialCenter={{lat: 24.64053936080381, lng: -93.95208035058195}} 
        center={this.state.recenterGPS} 
        onClick={this.onMapClick} 
      >
        {/* Forecast Cone Boundary Shading */}
        {this.props.c_reports.map(r => {
          const conePath = this.props.conePolygons ? this.props.conePolygons[r.id] : null;
          if (!conePath || conePath.length === 0) return null;
          
          return (
             <Polygon
               key={`cone-${r.id}`}
               paths={conePath}
               strokeColor="#dc2626" // Restored red boundary
               strokeOpacity={0.8}
               strokeWeight={2}      // Slightly thicker boundary
               fillColor="#dc2626"   // Transparent white fill
               fillOpacity={0.15}
             />
          );
        })}

        {/* Past Tracks */}
        {this.props.pastTracks && Object.keys(this.props.pastTracks).map(stormId => {
          const path = this.props.pastTracks[stormId];
          if (!path || path.length === 0) return null;
          
          return (
            <Polyline
              key={`past-${stormId}`}
              path={path}
              strokeColor="#000000"
              strokeOpacity={0.8}
              strokeWeight={3} // Increased from 2 to 4
            />
          );
        })}

        {/* Future Tracks */}
        {this.props.futureTracks && Object.keys(this.props.futureTracks).map(stormId => {
          const path = this.props.futureTracks[stormId];
          if (!path || path.length === 0) return null;
          
          return (
            <Polyline
              key={`future-${stormId}`}
              path={path}
              strokeColor="#dc2626"
              strokeOpacity={0.8}
              strokeWeight={3} // Increased from 2 to 4
            />
          );
        })}

        {/* Storm Markers */}
        {this.props.c_reports.map((r, index) => {
          let caneIcon;
          let anchorPoint;

          // Map NOAA classification directly to the correct icon and center anchor
          if (r.classification === "HU" || r.classification === "TY") {
            caneIcon = caneL; // 48px icon
            anchorPoint = this.props.google ? new this.props.google.maps.Point(24, 24) : null;
          } else if (r.classification === "TS" || r.classification === "STS") {
            caneIcon = caneM; // 32px icon
            anchorPoint = this.props.google ? new this.props.google.maps.Point(16, 16) : null;
          } else {
            // TD, STD, PTC, or unclassified
            caneIcon = caneS; // 24px icon
            anchorPoint = this.props.google ? new this.props.google.maps.Point(12, 12) : null;
          }

          return (
            <Marker
              key={`marker-${r.id}`}
              name={r.id}
              icon={{ 
                url: caneIcon,
                anchor: anchorPoint // Restores center alignment over the track vertex
              }}
              position={{ lat: r.latitudeNumeric, lng: r.longitudeNumeric }}
              title={r.name}
              onClick={this.handleClick}
            />
          );
        })}


        {/* Inside your InfoWindow block */}
        <InfoWindow
      marker={this.state.hMarker}
      visible={this.state.showInfo}
      onClose={() => this.setState({ showInfo: false })}
    >
      <div style={{ minWidth: '220px', padding: '4px', fontFamily: 'system-ui, sans-serif' }}>
        {this.state.caneName ? (
          <>
            {/* Header */}
            <h3 style={{ margin: '0 0 8px 0', paddingBottom: '6px', borderBottom: '1px solid #ddd', fontSize: '16px' }}>
              {this.state.caneName} <br/>
              <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#555' }}>{this.state.caneClass}</span>
            </h3>
            
            {/* Data Rows */}
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
              <span style={{ fontWeight: '600', color: '#555' }}>Intensity:</span>
              <span>{this.state.caneIntensity}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
              <span style={{ fontWeight: '600', color: '#555' }}>Pressure:</span>
              <span>{this.state.canePressure}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
              <span style={{ fontWeight: '600', color: '#555' }}>Movement:</span>
              <span>{this.state.caneSpeedDir}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '13px', color: '#777', marginTop: '8px' }}>
              <span style={{ fontWeight: '600' }}>Updated:</span>
              <span>{formatShortDate(this.state.caneUpdated)}</span>
            </div>
            
            {/* Advisory Link */}
            {this.state.caneAdviceLink && (
              <div style={{ marginTop: '10px', textAlign: 'center' }}>
                <a 
                  href={this.state.caneAdviceLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ fontSize: '13px', color: '#0066cc', textDecoration: 'none' }}
                >
                  View Official Advisory
                </a>
              </div>
            )}
          </>
        ) : null}
      </div>
    </InfoWindow>
      </Map>
    );
  }
}
// api key in .env file
export default GoogleApiWrapper({
  apiKey: process.env.REACT_APP_GOOGLE_API_KEY
})(withRouter(MapCaneReports))