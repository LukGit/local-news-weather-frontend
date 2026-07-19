import React, { Component } from 'react';
import { connect } from 'react-redux';
import Navbar from './Navbar';
import MapFireReports from './MapFireReports';
import { addFireReport } from '../actions'; // Corrected action import
import { Label, Icon, Menu, Checkbox } from 'semantic-ui-react';

class FireReports extends Component {
  state = {
    sizeFilter: "All",
    centerGPS: null,
    largeFiresOnly: false // Added toggle tracker
  } 
  
  handleLargeFiresToggle = (e, { checked }) => {
  this.setState({ largeFiresOnly: checked });
}

  // Dedicated dynamic fetch pipeline for wildfire locations
  fetchActiveWildfires = () => {
    const params = new URLSearchParams({
      where: "poly_GISAcres >= 100",
      outFields: "OBJECTID,poly_IncidentName,poly_GISAcres",
      f: "geojson"
    });

    const NIFC_FIRE_URL = `https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters_Current/FeatureServer/0/query?${params.toString()}`;

    fetch(NIFC_FIRE_URL)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP network error: ${res.status}`);
        return res.json();
      })
      .then(geojsonData => {
        if (geojsonData.features) {
          const firePins = geojsonData.features.map(feature => {
            if (!feature.geometry || !feature.geometry.coordinates) return null;

            // Drill down to pull just the very first [Lng, Lat] pair to serve as the pin anchor
            const isMulti = feature.geometry.type === 'MultiPolygon';
            const firstCoord = isMulti ? feature.geometry.coordinates[0][0][0] : feature.geometry.coordinates[0][0];

            if (!firstCoord) return null;

            return {
              id: feature.properties.OBJECTID,
              name: feature.properties.poly_IncidentName || "Active Wildfire",
              acres: Math.round(feature.properties.poly_GISAcres || 0),
              position: { lat: firstCoord[1], lng: firstCoord[0] } // Google Maps shape: {lat, lng}
            };
          }).filter(Boolean); // Clear out any null records safely

          // Send firePins array straight to your Redux global state store
          this.props.addFireReport(firePins);
        }
      })
      .catch(err => console.error("Error fetching fire pins:", err));
  }

  componentDidMount() {
    // Check authentication first before triggering network traffic
    if (this.props.user.user) {
      this.setState({
        centerGPS: this.props.user.gps
      });
      // Fire off the API call directly on mount
      this.fetchActiveWildfires();
    }
  }

  render() {
    // Route guard checking global user authentication state
    if (!this.props.user.user){
      this.props.history.push('/login');
      return null;
    }
    const displayedFires = this.state.largeFiresOnly 
    ? this.props.f_reports.filter(fire => fire.acres >= 30000)
    : this.props.f_reports;

    return (
      <div>
        <Navbar/>
        <Menu inverted color='grey' size='mini'>
          <Menu.Item>
            <Label size='large' color='orange'> {/* Changed color to orange for visual thematic consistency */}
              <Icon name='fire'/> {/* Swap out lightning icon for a fire icon */}
              {this.props.f_reports.length > 0 ? ` Active fires: ${this.props.f_reports.length}` : "No active fires!"}
            </Label> 
          </Menu.Item>
          {/* ADD THE CHECKBOX INTERFACE ITEM RIGHT HERE */}
        <Menu.Item>
          <Checkbox 
            toggle 
            label={{ children: 'Large Fires Only (>30k acres)', style: { color: 'white' } }}
            checked={this.state.largeFiresOnly}
            onChange={this.handleLargeFiresToggle}
          />
        </Menu.Item>
        </Menu>
        
        {/* Render canvas passing down only the coordinates and configurations needed for pins */}
        <MapFireReports 
          f_reports={displayedFires} 
          gps={this.props.user.gps}
        />
      </div>
    );
  }
}

const mapStateToProps = state => {
  return { 
    f_reports: state.f_reports, // Assumes your reducer populates this state key via addFireReport action
    user: state.users
  };
}

export default connect(mapStateToProps, { addFireReport })(FireReports);