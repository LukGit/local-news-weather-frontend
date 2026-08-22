import React, { Component } from 'react';
import { connect } from 'react-redux';
import Navbar from './Navbar';
import { addTornadoReport } from '../actions';
import { Menu, Button, Icon } from 'semantic-ui-react';
import MapTornadoReports from './MapTornadoReports'; 

class TornadoReports extends Component {
  state = {
    centerGPS: { lat: 41.8781, lng: -87.6298 }, 
    isLoading: true
  }
  fetchTornadoData = () => {
    this.setState({ isLoading: true });

    const past24Hours = new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString();
    const hr24URL = `https://api.weather.gov/alerts?event=Tornado%20Warning&start=${past24Hours}`;
    
    fetch(hr24URL)
      .then(response => response.json())
      .then(data => {
        let warnings = data.features || [];
        this.props.addTornadoReport(warnings);
        this.setState({ isLoading: false });
      })
      .catch(error => {
        console.error("Error fetching NWS Tornado data:", error);
        this.setState({ isLoading: false });
      });
  }
  componentDidMount() {
    this.fetchTornadoData();
  }

  render() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Navbar />
        <Menu id="menu-head" color="red" size="mini" inverted style={{ margin: 0, borderRadius: 0 }}>
          <Menu.Item header>National Tornado Threat Level</Menu.Item>
          <Menu.Item>
            Warnings in last 24hrs: {this.props.t_reports ? this.props.t_reports.length : 0}
          </Menu.Item>
          <Button 
            icon 
            labelPosition='right' 
            color="red"
            onClick={this.fetchTornadoData}
            loading={this.state.isLoading}
            disabled={this.state.isLoading}
          >
            <Icon name='refresh' />
            Refresh Threat Data
          </Button>
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
