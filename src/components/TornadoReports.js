import React, { Component } from 'react';
import { connect } from 'react-redux';
import Navbar from './Navbar';
import { addTornadoReport } from '../actions';
import { Menu } from 'semantic-ui-react';
import MapTornadoReports from './MapTornadoReports'; 

class TornadoReports extends Component {
  state = {
    centerGPS: { lat: 41.8781, lng: -87.6298 }, 
    isLoading: true
  }

  componentDidMount() {
    fetch('https://api.weather.gov/alerts/active?event=Tornado%20Warning,Tornado%20Watch')
      .then(response => response.json())
      .then(data => {
        // FIX 1: Change const to let
        let warnings = data.features || []; 
        // FIX 2: Send the data to Redux so the map can render it!
        this.props.addTornadoReport(warnings); 
        this.setState({ isLoading: false });
          console.log("🌪️ NWS Tornado Warnings Loaded:", warnings.length);
        })
      .catch(error => {
        console.error("Error fetching NWS Tornado data:", error);
        this.setState({ isLoading: false });
      });
  }

  render() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Navbar />
        <Menu id="menu-head" color="red" size="mini" inverted style={{ margin: 0, borderRadius: 0 }}>
          <Menu.Item header>National Tornado Threat Level</Menu.Item>
          <Menu.Item>
            Active Warnings/Watches: {this.props.t_reports ? this.props.t_reports.length : 0}
          </Menu.Item>
        </Menu>
        <div style={{ flexGrow: 1, position: 'relative' }}>
          <MapTornadoReports t_reports={this.props.t_reports} gps={this.state.centerGPS} />
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => {
  return {
    t_reports: state.t_reports
  }
}

export default connect(mapStateToProps, { addTornadoReport })(TornadoReports);
