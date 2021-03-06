import React, { Component } from 'react';
import { Map, Marker, GoogleApiWrapper, InfoWindow } from 'google-maps-react';
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
    hMarker: marker,
    showInfo: true
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
  render() {
    console.log("In map render", this.props.c_reports)
    return (
      <Map google={this.props.google} 
      zoom={3}
      initialCenter={this.state.centerGPS}
      center={this.state.recenterGPS}
      onClick={this.onMapClick}
      >
        {this.props.c_reports.map(r => {
          let hIcon
          if (r.classification === "HU") {
            hIcon = caneL
          } else if (r.classification === "TS" || r.classification === "STS") {
            hIcon = caneM
          } else {
            hIcon = caneS
          }
          return <Marker
          key={r.id}
          name={r.id}
          icon={hIcon}
          position={{lat: r.latitudeNumeric, lng: r.longitudeNumeric}}
          onClick={this.handleClick}
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