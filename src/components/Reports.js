import React, { Component } from 'react';
import { connect } from 'react-redux';
import Navbar from './Navbar';
import MapReports from './MapReports'
import { addReport } from '../actions'
import { Label, Icon, Menu, Checkbox } from 'semantic-ui-react'

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
    hourLine2: ""
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

  handleLargeOnly = (e, { checked }) => {
    let filterX = []
    if (checked) {
      filterX = this.props.reports.filter(r => r.properties.mag > 7)
    } else {
      filterX = this.props.reports
    }
    this.setState({
      largeOnly: checked,
      filterReports: filterX
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
        <Icon name='hand point down'/>
        {this.props.user.user}, 
        {this.props.reports.length > 0 ? " Here are the significant eqrthquakes in the last 24hrs" : "No Earthquake In Last 24hrs!"}
        </Label> 
        </Menu.Item>
        {this.props.reports.length > 0 ?
        <Menu.Item>
          <Checkbox 
              checked={this.state.largeOnly}
              label='Large quake only'
              onClick={this.handleLargeOnly}
          /> 
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
