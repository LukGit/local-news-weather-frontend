import React, { Component } from 'react';
import { connect } from 'react-redux';
import Navbar from './Navbar';
import MapWaterReports from './MapWaterReports';
import { addWaterReport } from '../actions';
// STRICT CJS IMPORT RULE ENFORCED
import { Menu, Label, Icon, Popup, Checkbox } from 'semantic-ui-react/dist/commonjs';

class WaterReports extends Component {
  state = {
    isLoading: false,
    lastUpdated: null,
    severeOnly: false,
    daysBack: 30 // Default to the last 30 days
  }

  fetchFloodData = () => {
    this.setState({ isLoading: true });
    
    // 1. Calculate a strict 365-day historical window for the initial fetch
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);
    
    // Helper to format dates as YYYY-MM-DD for the GDACS API
    const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    const fromDateStr = formatDate(oneYearAgo);
    const toDateStr = formatDate(today);

    // Inject parameters into the endpoint
    const GDACS_URL = `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=FL&fromdate=${fromDateStr}&todate=${toDateStr}`;
    
    fetch(GDACS_URL)
      .then(res => res.json())
      .then(geojsonData => {
        let floodEvents = [];
        if (geojsonData && geojsonData.features) {
          floodEvents = geojsonData.features;
        }
        
        // Dispatch all 365 days of data directly to Redux
        this.props.addWaterReport(floodEvents);
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        this.setState({
          isLoading: false,
          lastUpdated: timestamp
        });
      })
      .catch(err => {
        console.error("Error fetching GDACS flood data:", err);
        this.setState({ isLoading: false });
      });
  }

  componentDidMount() {
    this.fetchFloodData();
  }

  handleSevereToggle = (e, { checked }) => {
    this.setState({ severeOnly: checked });
  }

  handleDaysSlider = (e) => {
    this.setState({ daysBack: Number(e.target.value) });
  }

  render() {
    // 2. Calculate the dynamic cutoff date based on the slider state
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.state.daysBack);

    // 3. Client-Side Filter: Apply both the Time Slider and the Severe Toggle
    const displayedFloods = this.props.w_reports.filter(f => {
      // Timeframe check
      const eventDateStr = f.properties.fromdate || f.properties.todate;
      if (!eventDateStr) return false;
      
      const eventDate = new Date(eventDateStr);
      if (eventDate < cutoffDate) return false; // Exclude if older than our slider setting

      // Severity check
      if (this.state.severeOnly) {
        if (f.properties.alertlevel !== 'Orange' && f.properties.alertlevel !== 'Red') {
          return false;
        }
      }

      return true;
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
        <Navbar 
          onRefresh={this.fetchFloodData} 
          isRefreshing={this.state.isLoading} 
        />
        <Menu inverted color='grey' size='mini' style={{ margin: 0, borderRadius: 0, flexShrink: 0, minHeight: 'auto'}}>
          <Menu.Item>
            <Label size='large' color='blue'> 
              <Icon name='tint'/> 
              {displayedFloods.length > 0 ? ` Visible Floods: ${displayedFloods.length}` : "No active floods!"}
            </Label> 
          </Menu.Item>
          
          {/* NEW: Timeframe Slider */}
          <Menu.Item>
            <Popup content='Adjust historical timeframe (1 to 365 days)' trigger={
              <div> 
                <div style={{ color: 'white', marginBottom: '4px', fontSize: '12px' }}>
                  Past {this.state.daysBack} Days
                </div>
                <input 
                  type='range' 
                  min={1} 
                  max={365} 
                  value={this.state.daysBack} 
                  onChange={this.handleDaysSlider}
                  style={{ cursor: 'pointer' }}
                />     
              </div> 
            }/>
          </Menu.Item>

          {/* Severe Toggle remains independent */}
          <Menu.Item>
            <Popup content='Show only Moderate (Orange) and Severe (Red) alerts' trigger={
              <Checkbox 
                toggle 
                label={{ children: 'Severe Alerts Only', style: { color: 'white' } }}
                checked={this.state.severeOnly}
                onChange={this.handleSevereToggle}
              />
            }/>
          </Menu.Item>

          <Menu.Menu position='right'>
            {this.state.lastUpdated && (
              <Menu.Item style={{ color: '#ffb3b3' }}>
                Updated: {this.state.lastUpdated}
              </Menu.Item>
            )}
          </Menu.Menu>
        </Menu>
        
        <div style={{ flex: 1, position: 'relative', width: '100%' }}>
          <MapWaterReports 
            w_reports={displayedFloods} 
            gps={this.props.user.gps}
          />
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => {
  return { 
    w_reports: state.w_reports,
    user: state.users 
  };
}

export default connect(mapStateToProps, { addWaterReport })(WaterReports);