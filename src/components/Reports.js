import React, { Component } from 'react';
import { connect } from 'react-redux';
import Navbar from './Navbar';
import MapReports from './MapReports'
import { addReport } from '../actions'
import { Label, Icon, Menu, Popup, Button, Progress } from 'semantic-ui-react'

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
    mg: 4,
    isLoading: false, // NEW
    lastUpdated: null, // NEW
    // NEW STATES FOR ANIMATION
    activeIndex: null,
    isPlaying: false
  }
    // Extracted fetch logic
  fetchEarthquakeData = () => {
    this.setState({ isLoading: true });

    // fetch earthquake data from USGS
    const date1 = new Date();
    date1.setDate(date1.getDate() + 1);
    let d = date1.getDate();
    let m = date1.getMonth() + 1;
    let y = date1.getFullYear();
    const dateString =  y + '-' + (m <= 9 ? '0' + m : m) + '-' + (d <= 9 ? '0' + d : d);
    
    const date = new Date();
    date.setDate(date.getDate() - 3);
    d = date.getDate();
    m = date.getMonth() + 1;
    y = date.getFullYear();
    const dateString1 =  y + '-' + (m <= 9 ? '0' + m : m) + '-' + (d <= 9 ? '0' + d : d);
    
    const Q_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=" + dateString1 + "&&endtime=" + dateString + "&eventtype=earthquake&minmagnitude=4";
    
    fetch(Q_URL)
      .then(resp => resp.json())
      .then(quakeResp => {
        this.props.addReport(quakeResp.features);
        
        // Capture timestamp
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        this.setState({
          centerGPS: this.props.gps,
          filterReports: this.props.reports,
          sizeFilter: "All",
          isLoading: false, // Stop spinner
          lastUpdated: timestamp // Set timestamp
        });
      })
      .catch(error => {
        console.error("Error fetching USGS data:", error);
        this.setState({ isLoading: false });
      });
  }

  componentDidMount () {
    // Execute on initial load
    this.fetchEarthquakeData();

    if (navigator.geolocation) {
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

  
  }

  handleMg = (e) => {
  this.setState({
    mg: Number(e.target.value) // Ensure value is a number for clean comparison
  });
}
  // NEW: Playback Logic
  playSeismicSequence = () => {
    // If already playing, act as a Stop button
    if (this.state.isPlaying) {
      clearInterval(this.playbackInterval);
      this.setState({ isPlaying: false, activeIndex: null });
      return;
    }

    // Get current filtered reports and sort chronologically (oldest first)
    const displayedReports = this.props.reports
      .filter(r => r.properties.mag >= this.state.mg)
      .sort((a, b) => a.properties.time - b.properties.time);

    if (displayedReports.length === 0) return;

    this.setState({ isPlaying: true, activeIndex: 0 });

    // Step through the array every 400ms
    this.playbackInterval = setInterval(() => {
      this.setState(prevState => {
        if (prevState.activeIndex >= displayedReports.length - 1) {
          clearInterval(this.playbackInterval);
          return { isPlaying: false, activeIndex: null };
        }
        return { activeIndex: prevState.activeIndex + 1 };
      });
    }, 750); // Adjust this MS value to make it faster or slower
  }

  // NEW HELPER METHOD: Only recalculates if new data arrives or slider moves
  getMemoizedReports = () => {
    if (
      !this.memoizedReports || 
      this.lastMg !== this.state.mg || 
      this.lastReports !== this.props.reports
    ) {
      this.memoizedReports = this.props.reports
        .filter(r => r.properties.mag >= this.state.mg)
        .sort((a, b) => a.properties.time - b.properties.time)
        // Pre-build the position object here so it never changes reference in the map
        .map(r => ({
          ...r,
          cachedPosition: { lat: r.geometry.coordinates[1], lng: r.geometry.coordinates[0] }
        }));
        
      this.lastMg = this.state.mg;
      this.lastReports = this.props.reports;
    }
    return this.memoizedReports;
  }
  // this shows the NavBar and the MapReports which is also passed the report items to display on map
  render() {
      // USE THE CACHED ARRAY HERE
    const displayedReports = this.getMemoizedReports();
    // NEW: Calculate progress percentage
    let progressPercent = 0;
    if (this.state.activeIndex !== null && displayedReports.length > 1) {
      progressPercent = (this.state.activeIndex / (displayedReports.length - 1)) * 100;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
        <Navbar 
          onRefresh={this.fetchEarthquakeData} 
          isRefreshing={this.state.isLoading} 
        />
        <Menu inverted color='grey' size='mini' style={{ margin: 0, borderRadius: 0, flexShrink: 0, minHeight: 'auto'}}>
        <Menu.Item>
        <Label size='large' color='orange'> 
        <Icon name='warning sign'/>
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
          {/* NEW: Play Button Menu Item */}
          {this.props.reports.length > 0 && (
            <Menu.Item>
              <Popup content='See events chronologically' trigger={
              <Button 
                icon={this.state.isPlaying ? 'stop' : 'play'} 
                color={this.state.isPlaying ? 'red' : 'green'}
                size='mini'
                content={this.state.isPlaying ? 'Stop' : 'Play Timeline'}
                onClick={this.playSeismicSequence} 
                compact
              />}
              />
            </Menu.Item>
          )}
          {/* NEW: Stretchy Progress Bar */}
          {this.state.activeIndex !== null && (
            <Menu.Item style={{ flexGrow: 1, padding: '0 20px' }}>
              <Progress 
                percent={progressPercent} 
                color='red' 
                size='tiny' 
                style={{ margin: 0, width: '30%' }}
                active={this.state.isPlaying} // Gives it a nice pulsing CSS effect while playing
              />
            </Menu.Item>
          )}
          {/* NEW: Right-aligned timestamp */}
          <Menu.Menu position='right'>
            {this.state.lastUpdated && (
              <Menu.Item style={{ color: '#ffb3b3' }}>
                Updated: {this.state.lastUpdated}
              </Menu.Item>
            )}
          </Menu.Menu>
        </Menu>
        <div style={{ flex: 1, position: 'relative', width: '100%' }}>
        <MapReports 
        reports={displayedReports}  
        centerGPS={this.state.centerGPS}
        activeIndex={this.state.activeIndex} // <-- MUST ADD THIS LINE
         />
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
