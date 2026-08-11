import React, { Component } from 'react';
import { connect } from 'react-redux';
import Navbar from './Navbar';
import MapReports from './MapReports'
import { addReport } from '../actions'
import { Label, Icon, Menu, Checkbox, Popup } from 'semantic-ui-react'

class Reports extends Component {
  state = {
    centerGPS: {lat: 41.8781, lng: -87.6298},
    poopSizeSelect: "",
    filterReports: [],
    largeOnly: false,
    sizeFilter: "All",
    weather: "",
    weatherIcon: "",
    forecast: "",
    forecastIcon: "",
    hourLine1: "",
    hourLine2: "",
    mg: 4
  }

  componentDidMount () {
    if (navigator.geolocation) {
    console.log("Requesting HTML5 Geolocation...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("GPS Success:", position.coords.latitude, position.coords.longitude);
        this.setState({
          centerGPS: {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
        });
      },
      (error) => {
        console.error("GPS Failed/Denied, code:", error.code, "message:", error.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  } else {
    console.warn("Geolocation is not supported by this browser.");
  }

    // fetch earthquake data from USGS
    const date1 = new Date()
    date1.setDate(date1.getDate() + 1)
    let d = date1.getDate();
    let m = date1.getMonth() + 1;
    let y = date1.getFullYear();
    const dateString =  y + '-' + (m <= 9 ? '0' + m : m) + '-' + (d <= 9 ? '0' + d : d)
    const date = new Date()
    // change date from 1 to 3 to match opacity calculation
    date.setDate(date.getDate() - 3 )
    d = date.getDate();
    m = date.getMonth() + 1;
    y = date.getFullYear();
    const dateString1 =  y + '-' + (m <= 9 ? '0' + m : m) + '-' + (d <= 9 ? '0' + d : d)
    const Q_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=" + dateString1 + "&&endtime=" + dateString + "&eventtype=earthquake&minmagnitude=4"
    fetch(Q_URL)
    .then(resp => resp.json())
    .then(quakeResp => {
      this.props.addReport(quakeResp.features)
      this.setState({
        centerGPS: this.props.gps,
        filterReports: this.props.reports,
        sizeFilter: "All"
      })
    })
  }

  handleMg = (e) => {
    let filterY = []
    filterY = this.props.reports.filter(r => r.properties.mag >= e.target.value)
    this.setState({
      mg: e.target.value,
      filterReports: filterY
    })
  }
  // this shows the NavBar and the MapReports which is also passed the report items to display on map
  render() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
        <Navbar />
        <Menu inverted color='grey' size='mini' style={{ margin: 0, borderRadius: 0, flexShrink: 0, minHeight: 'auto'}}>
        <Menu.Item>
        <Label size='large' color='orange'> 
        <Icon name='lightning'/>
        {this.props.reports.length > 0 ? ` Significant eqrthquakes in the past 72hrs: ${this.props.reports.length}` : "No Earthquake In Last 72hrs!"}
        </Label> 
        </Menu.Item>
        {this.props.reports.length > 0 ?
        <Menu.Item>
          <Popup content='Show only earthquakes at or over magnitude' trigger={
           <div> 
           <div>M {this.state.mg}</div>
           <input type='range' min={4} max={10} value={this.state.mg} onChange={this.handleMg}/>     
           </div> 
          }/>
          </Menu.Item> : null}
        </Menu>
        <div style={{ flex: 1, position: 'relative', width: '100%' }}>
        <MapReports 
        reports={this.state.filterReports.length > 0 ? this.state.filterReports : this.props.reports} 
        centerGPS={this.state.centerGPS} />
        </div>
      </div>
    )
  }
}

const mapStateToProps = state => {
  return { 
    reports: state.reports,
    user: state.users
   }
}

export default connect(mapStateToProps, { addReport })(Reports)
