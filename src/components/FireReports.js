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
// Dedicated dynamic fetch pipeline for wildfire locations and perimeter geometries
  fetchActiveWildfires = () => {
    const params = new URLSearchParams({
      where: "poly_GISAcres >= 500",
      outFields: "OBJECTID,poly_IncidentName,poly_GISAcres,attr_PercentContained",
      outSR: "4326",
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

            const { type, coordinates } = feature.geometry;
            let allRings = []; // Will hold array of rings: [ [{lat, lng}, ...], [{lat, lng}, ...] ]

            if (type === 'Polygon') {
              // Standard Polygon: coordinates is [ [ [lng, lat], ... ] ]
              allRings = coordinates.map(ring => 
                ring.map(coord => ({ lat: coord[1], lng: coord[0] }))
              );
            } else if (type === 'MultiPolygon') {
              // MultiPolygon: coordinates is [ [ [ [lng, lat], ... ] ], [ [ [lng, lat], ... ] ] ]
              allRings = coordinates.map(poly => 
                poly[0].map(coord => ({ lat: coord[1], lng: coord[0] }))
              );
            }

            if (!allRings || !allRings.length || !allRings[0].length) return null;

            // Anchor the marker pin at the first coordinate of the first ring
            const firstCoord = allRings[0][0];

            return {
              id: feature.properties.OBJECTID,
              name: feature.properties.poly_IncidentName || "Active Wildfire",
              acres: Math.round(feature.properties.poly_GISAcres || 0),
              containment: feature.properties.attr_PercentContained ?? feature.properties.poly_PercentContained ?? null,
              position: firstCoord,
              perimeterRings: allRings // Store ALL polygon rings
            };
          }).filter(Boolean);

          this.props.addFireReport(firePins);
        }
      })
      .catch(err => console.error("Error fetching fire perimeters:", err));
  }

  componentDidMount() {
    this.fetchActiveWildfires();
  }

  render() {
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
    f_reports: state.f_reports, 
    user: state.users
  };
}

export default connect(mapStateToProps, { addFireReport })(FireReports);