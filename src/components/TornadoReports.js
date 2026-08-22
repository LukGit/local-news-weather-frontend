import React, { Component } from 'react';
import { connect } from 'react-redux';
import Navbar from './Navbar';
import { addTornadoReport } from '../actions';
import { Menu, Button, Icon } from 'semantic-ui-react';
import MapTornadoReports from './MapTornadoReports'; 

class TornadoReports extends Component {
  state = {
    centerGPS: { lat: 41.8781, lng: -87.6298 }, 
    isLoading: true,
    lastUpdated: null // Add this to track the exact refresh time
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
        // Capture the exact time the fetch completed successfully
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.setState({ 
          isLoading: false,
          lastUpdated: timestamp
         });
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
          {/* Everything inside this wrapper gets pushed to the right */}
          <Menu.Menu position='right'>
            
            {/* Visual confirmation of the exact time data was fetched */}
            {this.state.lastUpdated && (
              <Menu.Item style={{ color: '#ffb3b3' }}>
                Updated: {this.state.lastUpdated}
              </Menu.Item>
            )}

            <Menu.Item>
              <Button 
                color='red' 
                icon 
                labelPosition='right' 
                onClick={this.fetchTornadoData}
                loading={this.state.isLoading}
                disabled={this.state.isLoading}
              >
                <Icon name='refresh' />
                Refresh Threat Data
              </Button>
            </Menu.Item>
            
          </Menu.Menu>
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
