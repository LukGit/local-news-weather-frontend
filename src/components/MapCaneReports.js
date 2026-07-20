import React, { Component } from 'react';
import { Map, Marker, GoogleApiWrapper, InfoWindow, Polyline, Polygon } from 'google-maps-react';
import caneS from '../img/hts24.png'
import caneM from '../img/hts32.png'
import caneL from '../img/hts48.png'
import { withRouter } from 'react-router-dom'
import { Item } from 'semantic-ui-react'


export class MapCaneReports extends Component {
  // map gps center is determined by zip code after login
  state = {
    centerGPS: this.props.gps,
    filterReports: [],
    recenterGPS: {},
    hMarker: "",
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
  // this shows a map with earthquake reports as markers on map
  // each report item from store is mapped to a marker on map based on gps data received from USGS
  // details of the quake is displayed via a infowindow when the marker is clicked
  // initialCenter is to set map center when map is initially loaded
  // center is to set the map center when map is recentered by a user click
  // Added new code to plot hurricane past and future tracks on the map 7/2/2026
  // Added new code to plot hurricane future path uncertainty cone on the map  7/14/2026
  render() {
    // --- DEBUGGING BLOCK START ---
    //console.log("=== HURRICANE CONE TELEMETRY CHECK ===");
    //console.log("Total c_reports incoming:", this.props.c_reports ? this.props.c_reports.length : 0);
    //console.log("Raw conePolygons keys available:", Object.keys(this.props.conePolygons || {}));
    
    //this.props.c_reports.forEach(r => {
    //  const path = this.props.conePolygons[r.id];
    //  console.log(`Storm: ${r.name || r.id} (${r.id}) | Cone Array Size:`, path ? path.length : "UNDEFINED / MISSING");
    //  if (path && path.length > 0) {
    //    console.log(`Sample coordinate for ${r.id}:`, path[0]);
    //  }
    //});
    //console.log("======================================");
    // --- DEBUGGING BLOCK END ---
    return (
      <Map google={this.props.google} 
      zoom={4}
      initialCenter={{lat: 24.64053936080381, lng: -93.95208035058195}}
      center={this.state.recenterGPS}
      onClick={this.onMapClick}
      >
        {/* ADDED: Dynamic Forecast Cone Boundary Shading */}
        {this.props.c_reports.map(r => {
          const conePath = this.props.conePolygons[r.id];
          if (!conePath || conePath.length === 0) return null;

          return (
            <Polygon
              key={`cone-${r.id}`}
              paths={conePath} // google-maps-react uses "paths" for polygons
              strokeColor="#dc2626"
              strokeOpacity={0.5}
              strokeWeight={2}
              fillColor="#dc2626"
              fillOpacity={0.15} // Translucent caution overlay
              geodesic={true}
            />
          );
        })}
        {/* ADDED: Loop to draw the Past Tracks Line (Solid Black) */}
        {this.props.c_reports.map(r => {
          const pastPath = this.props.pastTracks[r.id];
          if (!pastPath || pastPath.length === 0) return null;

          // Clone path array so we don't accidentally mutate the underlying parent state
          const connectedPastPath = [...pastPath];
          // Connect the trail directly to the storm's current marker location
          connectedPastPath.push({ lat: r.latitudeNumeric, lng: r.longitudeNumeric });

          return (
            <Polyline
              key={`past-${r.id}`}
              path={connectedPastPath}
              strokeColor="#000000"
              strokeOpacity={0.8}
              strokeWeight={3}
              geodesic={true}
            />
          );
        })}

        {/* ADDED: Loop to draw the Future Tracks Line (Solid Red) */}
        {this.props.c_reports.map(r => {
          const futurePath = this.props.futureTracks[r.id];
          if (!futurePath || futurePath.length === 0) return null;

          // Forecast data typically originates right at the current marker coordinate, 
          // but we add it manually here as a safeguard to prevent gaps
          const connectedFuturePath = [{ lat: r.latitudeNumeric, lng: r.longitudeNumeric }, ...futurePath];

          return (
            <Polyline
              key={`future-${r.id}`}
              path={connectedFuturePath}
              strokeColor="#dc2626"
              strokeOpacity={0.9}
              strokeWeight={3}
              geodesic={true}
            />
          );
        })}
      
        {this.props.c_reports.map(r => {
          let hIcon
          let iconSize = 24; // Default baseline pixels for caneS
          if (r.classification === "HU") {
            hIcon = caneL
            iconSize = 48
          } else if (r.classification === "TS" || r.classification === "STS") {
            hIcon = caneM
            iconSize = 32
          } else {
            hIcon = caneS
            iconSize = 24
          }
          return <Marker
          key={r.id}
          name={r.id}
          title={r.name}
          position={{lat: r.latitudeNumeric, lng: r.longitudeNumeric}}
          onClick={this.handleClick}
          icon={{
                url: hIcon,
                // Scales the physical image footprint boundary
                scaledSize: new this.props.google.maps.Size(iconSize, iconSize),
                // Crucial fix: Sets the anchor map projection to exactly half the height/width to center icon on GPS location
                anchor: new this.props.google.maps.Point(iconSize / 2, iconSize / 2)
          }}
          >
          </Marker>
        })}
        <InfoWindow
          marker={this.state.hMarker}
          visible={this.state.showInfo}
          >
            <Item.Group>
              <Item>
                <Item.Content>
                <Item.Header>{this.state.caneName}</Item.Header>
                  </Item.Content>
                </Item>
              <Item>
                <Item.Content>
                <Item.Header>Classification</Item.Header>
                <Item.Description>{this.state.caneClass}</Item.Description>
                  </Item.Content>
                </Item>  
              <Item>
                <Item.Content>
                <Item.Header>Intensity</Item.Header>
                <Item.Description>{this.state.caneIntensity}</Item.Description>
                  </Item.Content>
                </Item>  
              <Item>
                <Item.Content>
                <Item.Header>Air Pressure</Item.Header>
                <Item.Description>{this.state.canePressure}</Item.Description>
                  </Item.Content>
                </Item> 
              <Item>
                <Item.Content>
                <Item.Header>Speed/Direction</Item.Header>
                <Item.Description>{this.state.caneSpeedDir}</Item.Description>
                  </Item.Content>
                </Item>
              <Item>
                <Item.Content>
                <Item.Description as='a' content='Click to see advisory' href={this.state.caneAdviceLink} target="_blank"></Item.Description>
                  </Item.Content>
                </Item>
              <Item>
                <Item.Content>
                <Item.Description as='a' content='Click to see detail forecast' href={this.state.caneForecastLink} target="_blank"></Item.Description>
                  </Item.Content>
                </Item>
              <Item>
                <Item.Content>
                <Item.Description>Update: {this.state.caneUpdated}</Item.Description>
                  </Item.Content>
                </Item>
              </Item.Group>
          </InfoWindow>
      </Map>
    );
  }
}
// api key in .env file
export default GoogleApiWrapper({
  apiKey: process.env.REACT_APP_GOOGLE_API_KEY
})(withRouter(MapCaneReports))