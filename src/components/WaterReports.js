// === src/components/WaterReports.js ===
import React, { Component } from 'react';
import { connect } from 'react-redux';
import Navbar from './Navbar';
import MapWaterReports from './MapWaterReports';
import { addWaterReport, addNWSReport } from '../actions';
import { Menu, Label, Icon, Popup, Checkbox, Button } from 'semantic-ui-react/dist/commonjs';

class WaterReports extends Component {
  state = {
    isLoading: false,
    lastUpdated: null,
    severeOnly: false,
    daysBack: 30,
    activeSource: 'GDACS' // 'GDACS' | 'NWS'
  }

  fetchFloodData = () => {
    this.setState({ isLoading: true });

    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const fromDateStr = formatDate(oneYearAgo);
    const toDateStr = formatDate(today);

    const GDACS_URL = `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=FL&fromdate=${fromDateStr}&todate=${toDateStr}`;

    fetch(GDACS_URL)
      .then(res => res.json())
      .then(geojsonData => {
        let floodEvents = [];
        if (geojsonData && geojsonData.features) {
          floodEvents = geojsonData.features;
        }
        
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

  fetchNWSData = () => {
    this.setState({ isLoading: true });

    const NWS_URL = "https://api.weather.gov/alerts/active?event=Flood%20Warning,Flash%20Flood%20Warning,Flood%20Advisory,Flash%20Flood%20Watch";

    fetch(NWS_URL)
      .then(res => res.json())
      .then(data => {
        let nwsWarnings = [];
        if (data && data.features) {
          // FIX: Only keep NWS alerts that contain valid map geometries
          nwsWarnings = data.features.filter(f => f.geometry && f.geometry.coordinates);
        }
        
        this.props.addNWSReport(nwsWarnings);
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        this.setState({
          isLoading: false,
          lastUpdated: timestamp
        });
      })
      .catch(err => {
        console.error("Error fetching NWS flood data:", err);
        this.setState({ isLoading: false });
      });
  }

  componentDidMount() {
    this._isMounted = true;
    this.fetchFloodData();
    this.fetchNWSData();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  handleSevereToggle = (e, { checked }) => {
    this.setState({ severeOnly: checked });
  }

  handleDaysSlider = (e) => {
    this.setState({ daysBack: Number(e.target.value) });
  }

  handleSourceChange = (source) => {
    this.setState({ activeSource: source });
  }

  render() {  
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.state.daysBack);

    const displayedFloods = this.props.w_reports.filter(f => {
      const eventDateStr = f.properties.fromdate || f.properties.todate;
      if (!eventDateStr) return false;
      
      const eventDate = new Date(eventDateStr);
      if (eventDate < cutoffDate) return false;

      if (this.state.severeOnly) {
        if (f.properties.alertlevel !== 'Orange' && f.properties.alertlevel !== 'Red') {
          return false;
        }
      }

      return true;
    });

    const activeCount = this.state.activeSource === 'GDACS' 
      ? displayedFloods.length 
      : (this.props.nws_reports ? this.props.nws_reports.length : 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
        <Navbar 
          onRefresh={() => {
            this.fetchFloodData();
            this.fetchNWSData();
          }} 
          isRefreshing={this.state.isLoading} 
        />
        <Menu inverted color='grey' size='mini' style={{ margin: 0, borderRadius: 0, flexShrink: 0, minHeight: 'auto'}}>
          {/* Source Toggle Controls */}
          <Menu.Item style={{ padding: '4px 8px' }}>
            <Button.Group size='mini'>
              <Button 
                color={this.state.activeSource === 'GDACS' ? 'blue' : 'grey'} 
                onClick={() => this.handleSourceChange('GDACS')}
              >
                Global (GDACS)
              </Button>
              <Button.Or />
              <Button 
                color={this.state.activeSource === 'NWS' ? 'blue' : 'grey'} 
                onClick={() => this.handleSourceChange('NWS')}
              >
                US Active (NWS)
              </Button>
            </Button.Group>
          </Menu.Item>

          <Menu.Item>
            <Label size='large' color='blue'> 
              <Icon name='tint'/> 
              {activeCount > 0 
                ? ` Active ${this.state.activeSource}: ${activeCount}` 
                : `No active ${this.state.activeSource} alerts`}
            </Label> 
          </Menu.Item>
          
          {/* Controls specific to GDACS Global feed */}
          {this.state.activeSource === 'GDACS' && (
            <>
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
            </>
          )}

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
            nws_reports={this.props.nws_reports}
            activeSource={this.state.activeSource} 
            gps={this.props.user.gps}
          />
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => {
  return { 
    // Safely access the nested reducer, defaulting to empty arrays if undefined
    w_reports: state.water?.w_reports || [], 
    nws_reports: state.water?.nws_reports || [],
    user: state.users 
  };
}

export default connect(mapStateToProps, { addWaterReport, addNWSReport })(WaterReports);

