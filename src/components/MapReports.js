import React, { Component } from 'react';
import { Map, Marker, GoogleApiWrapper, InfoWindow } from 'google-maps-react';
import quakeS from '../img/quake24.png'
import quakeM from '../img/quake36.png'
import quakeL from '../img/quake48.png'
import quakeX from '../img/quake64.png'
import { withRouter } from 'react-router-dom'
import { Item } from 'semantic-ui-react'


export class MapReports extends Component {
  // map gps center is determined by zip code after login
  state = {
    centerGPS: this.props.gps,
    filterReports: [],
    recenterGPS: null,
    qMarker: "",
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
    this.setState({
      centerGPS: this.props.gps
    })
  }
  
handleClick = (props, marker, e) => {
    // this set the detail information of the quake and turn on the infowindow
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
      // Safely read user GPS from centerGPS or gps prop with optional chaining
      const userLat = this.props.centerGPS?.lat || this.props.gps?.lat;
      const userLng = this.props.centerGPS?.lng || this.props.gps?.lng;

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
    return (
      <Map google={this.props.google} 
      zoom={3}
      initialCenter={this.props.centerGPS}
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
          >
            <Item.Group>
              <Item>
                <Item.Content>
                <Item.Header>Origin Location</Item.Header>
                <Item.Description>{this.state.quakePl}</Item.Description>
                  </Item.Content>
                </Item>
              <Item>
                <Item.Content>
                <Item.Header>Date</Item.Header>
                <Item.Description>{this.state.quakeDate}</Item.Description>
                  </Item.Content>
                </Item>  
              <Item>
                <Item.Content>
                <Item.Header>Magnitude</Item.Header>
                <Item.Description>{this.state.quakeMag}</Item.Description>
                  </Item.Content>
                </Item>  
              <Item>
                <Item.Content>
                <Item.Header>Depth in Km</Item.Header>
                {/* Add inline styling here */}
                <Item.Description style={{ color: this.getDepthColor(this.state.quakeDepth), fontWeight: 'bold' }}>
                  {this.state.quakeDepth}
                </Item.Description>
                </Item.Content>
                </Item>
              <Item>
                <Item.Content>
                <Item.Header>Alert</Item.Header>
                <Item.Description style={{ color: this.getAlertColor(this.state.quakeAlert), fontWeight: 'bold' }}>
                  {this.state.quakeAlert === null ? "none" : this.state.quakeAlert}
                </Item.Description>
                  </Item.Content>
                </Item> 
              <Item>
                <Item.Content>
                <Item.Description as='a' content='Click to see event detail' href={this.state.quakeLink} target="_blank"></Item.Description>
                  </Item.Content>
                </Item>
              {/* NEW ITEM: Distance Triage Badge */}
              {this.state.quakeDistance !== null && (
              <Item>
                <Item.Content>
                  <Item.Header>Proximity</Item.Header>
                  <Item.Description style={{ 
                    fontWeight: this.state.quakeDistance < 100 ? 'bold' : 'normal',
                    color: this.state.quakeDistance < 100 ? '#dc2626' : 'inherit' 
                }}>
                  📍 {this.state.quakeDistance} miles from your location
                    </Item.Description>
                  </Item.Content>
                </Item>
              )}

              {/* NEW ITEM: Crowdsourced Reports & Tsunami Beacons */}
              {(Boolean(this.state.quakeFeltCount) || this.state.quakeTsunamiFlag === 1) && (
               <Item>
                 <Item.Content>
                  <Item.Header>Real-Time Impact Alerts</Item.Header>
                  <Item.Description>
                    {this.state.quakeFeltCount ? `💥 Felt by ${this.state.quakeFeltCount.toLocaleString()} people via "Did You Feel It?"` : ''} 
                    {this.state.quakeTsunamiFlag === 1 && (
                     <div style={{ color: '#dc2626', fontWeight: 'bold', marginTop: '5px' }}>
                        ⚠️ WARNING: Tsunami advisory/watch active for this event
                        </div>
                    )}
                  </Item.Description>
                  </Item.Content>
                </Item>
              )}
              </Item.Group>
          </InfoWindow>
      </Map>
    );
  }
}
// api key in .env file
export default GoogleApiWrapper({
  apiKey: process.env.REACT_APP_GOOGLE_API_KEY
})(withRouter(MapReports))