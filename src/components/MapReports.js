import React, { Component } from 'react';
import { Map, Marker, GoogleApiWrapper, InfoWindow } from 'google-maps-react';
import quakeS from '../img/quake24.png'
import quakeM from '../img/quake36.png'
import quakeL from '../img/quake48.png'
import quakeX from '../img/quake64.png'
import { withRouter } from 'react-router-dom'
//import { Item } from 'semantic-ui-react/dist/commonjs'


export class MapReports extends Component {
  // map gps center is determined by zip code after login
  state = {
    centerGPS: this.props.gps,
    filterReports: [],
    recenterGPS: null,
    qMarker: null,
    showInfo: false,
    quakePl: "",
    quakeMag: "",
    quakeDate: "",
    quakeAlert: "",
    quakeLink:"",
    quakeDepth:"",
    staticRenderTime: Date.now() // NEW: Freeze the time when component loads
  }
  
  componentDidMount () {
    // set center GPS to user registered GPS
    // Initialize with whatever the parent has right now (even if it's null/pending)
    this.setState({
      centerGPS: this.props.centerGPS || this.props.gps
    });
  }
  
  // NEW: Catch the async browser geolocation when it finally arrives from the parent
  componentDidUpdate(prevProps) {
    if (prevProps.centerGPS !== this.props.centerGPS) {
      this.setState({
        centerGPS: this.props.centerGPS
      });
    }
  }
handleClick = (props, marker, e) => {
    // this set the detail information of the quake and turn on the infowindow
    // add default location
    //const userLat = this.props.centerGPS?.lat || this.props.gps?.lat || 41.8781;
    //const userLng = this.props.centerGPS?.lng || this.props.gps?.lng || -87.6298;
    const quake = this.props.reports.find(r => r.id === props.name)
    if (!quake) return;
    const Q_URL = quake.properties.detail
    fetch(Q_URL)
    .then(resp => resp.json())
    .then(quakeResp => {
      
      // NEW ADDITION: Calculate the dynamic mile distance using your helper formula
      // Note: USGS GeoJSON coordinates arrays are ordered as [Longitude, Latitude, Depth]
      const epicenterLng = quake.geometry.coordinates[0];
      const epicenterLat = quake.geometry.coordinates[1];
      // Safely read from the synced state instead of props
      const userLat = this.state.centerGPS?.lat;
      const userLng = this.state.centerGPS?.lng;
      // Only calculate distance if user location is valid
      let distanceFromHome = null;
      if (userLat && userLng) {
        distanceFromHome = this.calculateDistance(
          userLat,
          userLng,
          epicenterLat,
          epicenterLng
        );
      }
      this.setState({
        qMarker: marker,
        showInfo: true,
        quakePl: quake.properties.place,
        quakeMag: quake.properties.mag,
        quakeDate: new Date(quake.properties.time).toLocaleString(),
        quakeAlert: quake.properties.alert,
        quakeLink: quake.properties.url,
        quakeDepth: quake.geometry.coordinates[2],
        quakeDistance: distanceFromHome,
        quakeFeltCount: quakeResp.properties.felt,
        quakeTsunamiFlag: quakeResp.properties.tsunami,
        recenterGPS: { lat: epicenterLat, lng: epicenterLng }
      });     
    })
    .catch(err => console.error("Error fetching detail:", err));
}
  
  onMapClick = (props) => {
    if (this.state.showInfo) {
      this.setState({
        showInfo: false
      })
    }
  }
  // this new code is to add color distinction for quake depth
  getDepthColor = (depth) => {
    if (depth === undefined || depth === null || depth === "") return '#6b7280'; // Gray default
    
    if (depth <= 70) {
      return '#ef4444'; // Red for Shallow (0 - 70 km)
    } else if (depth <= 300) {
      return '#f97316'; // Orange for Intermediate (71 - 300 km)
    } else {
      return '#3b82f6'; // Blue for Deep (301 - 700 km)
    }
  }
  // this new code is to add color to the alerts
  getAlertColor = (alert) => {
    if (!alert || alert === "none") return '#6b7280'; // Gray for null/none
    
    switch (alert.toLowerCase()) {
      case 'green':
        return '#22c55e'; // Vibrant Green (no response needed)
      case 'yellow':
        return '#eab308'; // Amber/Yellow (local/regional impact)
      case 'orange':
        return '#f97316'; // Orange (national impact)
      case 'red':
        return '#ef4444'; // Red (international/severe impact)
      default:
        return '#6b7280';
    }
  }
  // Calculates distance between home base and epicenter in miles
  calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    
    const R = 3958.8; // Radius of the Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
      
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; 
    
    return Math.round(distance); // Returns clean integer miles
  }
  // this shows a map with earthquake reports as markers on map
  // each report item from store is mapped to a marker on map based on gps data received from USGS
  // details of the quake is displayed via a infowindow when the marker is clicked
  // initialCenter is to set map center when map is initially loaded based on user location
  // center is to set the map center when map is recentered by a user click
  // added opacity to have older quakes fade into the background
  render() {
    // Define a guaranteed fallback coordinate
    const safeCenter = { lat: 41.8781, lng: -87.6298 };

    return (
      <Map google={this.props.google} 
      zoom={3}
      // FIX: Provide the safe fallback to both center props
      initialCenter={this.props.centerGPS || safeCenter}
      /* Dynamic re-centering: uses click recenter if active, otherwise uses updated GPS */
      center={this.state.recenterGPS || this.props.centerGPS}
      onClick={this.onMapClick}
      >
        {this.props.reports.map((r, index) => {
          let qIcon
          if (r.properties.mag < 5) {
            qIcon = quakeS
          } else if (r.properties.mag < 6.5) {
            qIcon = quakeM
          } else if (r.properties.mag < 7.5){
            qIcon = quakeL
          } else {
            qIcon = quakeX
          }
          // Use the frozen time from state
          const timePassedMs = this.state.staticRenderTime - r.properties.time; 
          const hoursPassed = Math.round(timePassedMs / (1000 * 60 * 60));
          const calculatedOpacity = Math.max(0.25, 1 - (hoursPassed / 72));
          const isBouncing = this.props.activeIndex === index;
          return <Marker
          // THE FIX: Dynamically change the key to force this specific marker to instantly remount
          key={isBouncing ? `${r.id}-bounce` : r.id}
          name={r.id}
          icon={qIcon}
          opacity={calculatedOpacity} // --- APPLY OPACITY LAYER HERE ---
          position={r.cachedPosition}
          // The bounce trigger! (Use 1 if you are using @react-google-maps/api)
          animation={isBouncing ? window.google.maps.Animation.BOUNCE : null} 
          title={r.properties.place}
          onClick={this.handleClick}
          >
          </Marker>
        })}
            <InfoWindow 
          marker={this.state.qMarker} 
          visible={this.state.showInfo} 
          onClose={() => this.setState({ showInfo: false })}
        >
          <div style={{ minWidth: '220px', maxWidth: '280px', padding: '4px', fontFamily: 'system-ui, sans-serif' }}>
            {this.state.quakePl ? (
              <>
                {/* Header */}
                <h3 style={{ margin: '0 0 8px 0', paddingBottom: '6px', borderBottom: '1px solid #ddd', fontSize: '16px', lineHeight: '1.3' }}>
                  Magnitude {this.state.quakeMag} <br/>
                  <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#555' }}>
                    {this.state.quakePl}
                  </span>
                </h3>

                {/* Tsunami Warning Banner - Only renders if flag is active */}
                {this.state.quakeTsunamiFlag === 1 && (
                  <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '6px', borderRadius: '4px', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', border: '1px solid #f87171' }}>
                      ⚠️ Tsunami Advisory/Watch Active
                  </div>
                )}
                
                {/* Data Rows */}
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
                  <span style={{ fontWeight: '600', color: '#555' }}>Depth:</span>
                  <span style={{ color: this.getDepthColor(this.state.quakeDepth), fontWeight: 'bold' }}>
                    {this.state.quakeDepth} km
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
                  <span style={{ fontWeight: '600', color: '#555' }}>Alert Level:</span>
                  <span style={{ color: this.getAlertColor(this.state.quakeAlert), fontWeight: 'bold', textTransform: 'capitalize' }}>
                    {this.state.quakeAlert === null ? "None" : this.state.quakeAlert}
                  </span>
                </div>

                {/* Distance Triage */}
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
                  <span style={{ fontWeight: '600', color: '#555' }}>Proximity:</span>
                  <span style={{ 
                    fontWeight: this.state.quakeDistance && this.state.quakeDistance < 100 ? 'bold' : 'normal',
                    color: this.state.quakeDistance && this.state.quakeDistance < 100 ? '#dc2626' : 'inherit' 
                  }}>
                    {this.state.quakeDistance !== null ? `${this.state.quakeDistance} mi` : 'GPS Unavailable'}
                  </span>
                </div>

                {/* Felt Reports */}
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
                  <span style={{ fontWeight: '600', color: '#555' }}>Felt Reports:</span>
                  <span>{this.state.quakeFeltCount ? this.state.quakeFeltCount.toLocaleString() : '0'}</span>
                </div>
                
                {/* Date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '13px', color: '#777', marginTop: '8px' }}>
                  <span style={{ fontWeight: '600' }}>Time:</span>
                  <span>{this.state.quakeDate}</span> 
                </div>
                
                {/* Link */}
                {this.state.quakeLink && (
                  <div style={{ marginTop: '10px', textAlign: 'center' }}>
                    <a 
                      href={this.state.quakeLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ fontSize: '13px', color: '#0066cc', textDecoration: 'none' }}
                    >
                      View USGS Event Detail
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
})(withRouter(MapReports))