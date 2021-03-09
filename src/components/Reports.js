import React, { Component } from 'react';
import { connect } from 'react-redux';
import Navbar from './Navbar';
import MapReports from './MapReports'
import { addReport } from '../actions'
import { Label, Icon, Menu, Checkbox, Popup } from 'semantic-ui-react'

class Reports extends Component {
  state = {
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
    // fetch earthquake data from USGS
    const date1 = new Date()
    date1.setDate(date1.getDate() + 1)
    let d = date1.getDate();
    let m = date1.getMonth() + 1;
    let y = date1.getFullYear();
    const dateString =  y + '-' + (m <= 9 ? '0' + m : m) + '-' + (d <= 9 ? '0' + d : d)
    const date = new Date()
    date.setDate(date.getDate() - 1)
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
    if (!this.props.user.user){
      this.props.history.push('/login')
      return null
    }
    return (
      <div>
        <Navbar/>
        <Menu inverted color='grey' size='mini'>
        <Menu.Item>
        <Label size='large' color='grey'> 
        <Icon name='lightning'/>
        {this.props.reports.length > 0 ? "Significant eqrthquakes in the past 24hrs" : "No Earthquake In Last 24hrs!"}
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
        <MapReports reports={this.state.filterReports} zipcode={this.props.user.zipcode} gps={this.props.user.gps}/>
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
