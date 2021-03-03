import React, { Component } from 'react';
import { Map, Marker, GoogleApiWrapper, InfoWindow } from 'google-maps-react';
import quakeS from '../img/quake24.png'
import quakeM from '../img/quake36.png'
import quakeL from '../img/quake48.png'
import quakeX from '../img/quake64.png'
import { withRouter } from 'react-router-dom'
import { Header, Label, Divider, Item } from 'semantic-ui-react'


export class MapReports extends Component {
  // map gps center is determined by zip code after login
  state = {
    centerGPS: this.props.gps,
    filterReports: [],
    recenterGPS: {},
    qMarker: "",
    showInfo: false,
    quakePl: "",
    quakeMag: "",
    quakeDate: "",
    quakeAlert: "",
    quakeLink:""
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
    const Q_URL = quake.properties.detail
    fetch(Q_URL)
    .then(resp => resp.json())
    .then(quakeResp => {
      console.log("quake detal", quakeResp.properties)
      this.setState({
        quakePl: quake.properties.place,
        quakeMag: quake.properties.mag,
        qMarker: marker,
        quakeDate: quakeResp.properties.products.origin[0].properties.eventtime,
        quakeAlert: quakeResp.properties.alert,
        quakeLink: quakeResp.properties.url,
        showInfo: true
      })
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
    return (
      <Map google={this.props.google} 
      zoom={3}
      initialCenter={this.state.centerGPS}
      center={this.state.recenterGPS}
      onClick={this.onMapClick}
      >
        {this.props.reports.map(r => {
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
          return <Marker
          key={r.id}
          name={r.id}
          icon={qIcon}
          position={{lat: r.geometry.coordinates[1], lng: r.geometry.coordinates[0]}}
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
                <Item.Header>Alert</Item.Header>
                <Item.Description>{this.state.quakeAlert === null ? "none" : this.state.quakeAlert}</Item.Description>
                  </Item.Content>
                </Item> 
              <Item>
                <Item.Content>
                <Item.Description as='a' content='Click to see event detail' href={this.state.quakeLink} target="_blank"></Item.Description>
                  </Item.Content>
                </Item>
              </Item.Group>
          </InfoWindow>
      </Map>
    );
  }
}

export default GoogleApiWrapper({
  apiKey: process.env.REACT_APP_GOOGLE_API_KEY
})(withRouter(MapReports))