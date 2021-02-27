import React, { Component } from 'react';
import { Map, Marker, GoogleApiWrapper, InfoWindow } from 'google-maps-react';
import quakeS from '../img/quake24.png'
import quakeM from '../img/quake36.png'
import quakeL from '../img/quake48.png'
import { withRouter } from 'react-router-dom'
import { Header, Label, Divider } from 'semantic-ui-react'


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
    quakeAlert: ""
  }
  
  componentDidMount () {
    // set center GPS to user registered GPS
    this.setState({
      centerGPS: this.props.gps
    })
  }
  
  handleClick = (props, marker, e) => {
    // this set the recenter GPS when user clicks on poop report
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
        showInfo: true
      })
    })
    
  }
  // this shows a map with all the poop reports as markers on map
  // each report item from store is mapped to a marker on map based on gps extracted from report photo
  // initialCenter is to set map center when map is initially loaded
  // center is to set the map center when map is recentered by a user click
  render() {
    return (
      <Map google={this.props.google} 
      zoom={3}
      initialCenter={this.state.centerGPS}
      center={this.state.recenterGPS}
      >
        {this.props.reports.map(r => {
          let qIcon
          if (r.properties.mag < 5) {
            qIcon = quakeS
          } else if (r.properties.mag < 6) {
            qIcon = quakeM
          } else {
            qIcon = quakeL
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
            <Header size='small'>Earthquake Detail</Header>
            <Header size='tiny'>{this.state.quakePl}</Header>
            <Divider horizontal hidden ></Divider>
            <Label>Date: {this.state.quakeDate}</Label>
            <Divider horizontal hidden ></Divider>
            <Label>Magnitude: {this.state.quakeMag}</Label>
            <Divider horizontal hidden ></Divider>
            <Label>Alert: {this.state.quakeAlert === null ? "none" : this.state.quakeAlert}</Label>
            </InfoWindow>
      </Map>
    );
  }
}

export default GoogleApiWrapper({
  apiKey: 'AIzaSyDAAA0HEZLvUa2hQ-54gAG5TXheH1-pEZY'
})(withRouter(MapReports))