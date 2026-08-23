import React, { Component } from 'react';
import { connect } from 'react-redux';
import Navbar from './Navbar';
import MapFireReports from './MapFireReports';
import { addFireReport } from '../actions'; // Corrected action import
import { Label, Icon, Menu, Checkbox } from 'semantic-ui-react';

const getDaysBurning = (timestamp) => {
  if (!timestamp || isNaN(timestamp)) return "Unknown";

  const now = Date.now();
  const diffInMs = now - timestamp;
  const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (days < 0) return "Just started";
  if (days < 1) return "Started today";
  if (days === 1) return "1 day";
  return `${days} days`;
};

// Helper to format suppression costs into compact currency (e.g., $1.5M, $442K)
const formatFireCost = (cost) => {
  if (!cost || isNaN(cost) || cost === 0) return "N/A";

  // ⚡ Add Billions handler
  if (cost >= 1000000000) {
    const billions = (cost / 1000000000).toFixed(1);
    return `$${billions.replace(/\.0$/, '')}B`;
  }

  if (cost >= 1000000) {
    const millions = (cost / 1000000).toFixed(1);
    return `$${millions.replace(/\.0$/, '')}M`;
  }

  if (cost >= 1000) {
    return `$${Math.round(cost / 1000)}K`;
  }

  return `$${cost.toLocaleString()}`;
};


class FireReports extends Component {
  state = {
    sizeFilter: "All",
    centerGPS: null,
    largeFiresOnly: false, // Added toggle tracker
    isLoading: false,     // NEW
    lastUpdated: null     // NEW
  } 
  
  handleLargeFiresToggle = (e, { checked }) => {
  this.setState({ largeFiresOnly: checked });
}
// Dedicated dynamic fetch pipeline for wildfire locations and perimeter geometries
  fetchActiveWildfires = () => {
    this.setState({ isLoading: true }); 
    const params = new URLSearchParams({
      where: "poly_GISAcres >= 500",
      // Added attr_FireDiscoveryDateTime to outFields:
      outFields: "OBJECTID,poly_IncidentName,poly_GISAcres,attr_PercentContained,attr_FireDiscoveryDateTime,attr_EstimatedCostToDate,attr_EstimatedFinalCost",
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
            // Inside your fetchActiveWildfires .map() loop:
            const rawCostToDate = feature.properties.attr_EstimatedCostToDate || 0;
            // Safety net: ensure total is at least as big as the current cost
            const rawFinalCost = Math.max(rawCostToDate, feature.properties.attr_EstimatedFinalCost || 0);

            return {
              id: feature.properties.OBJECTID,
              name: feature.properties.poly_IncidentName || "Active Wildfire",
              acres: Math.round(feature.properties.poly_GISAcres || 0),
              containment: feature.properties.attr_PercentContained ?? feature.properties.poly_PercentContained ?? null,
              discoveryDate: feature.properties.poly_IncidentDiscoveryDateTime || null,
              daysBurning: getDaysBurning(feature.properties.attr_FireDiscoveryDateTime),
              // ⚡ Cost Data 
              costToDate: formatFireCost(rawCostToDate),
              finalCost: formatFireCost(rawFinalCost),
              rawCostToDate: rawCostToDate,
              rawFinalCost: rawFinalCost,
              position: firstCoord,
              perimeterRings: allRings // Store ALL polygon rings
            };
          }).filter(Boolean);

          this.props.addFireReport(firePins);
          const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          this.setState({ 
            isLoading: false,
            lastUpdated: timestamp 
          });
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
  // ⚡ Tally up the raw integers across all currently displayed fires
    const totalSpent = displayedFires.reduce((sum, fire) => sum + (fire.rawCostToDate || 0), 0);
    const totalBudget = displayedFires.reduce((sum, fire) => sum + (fire.rawFinalCost || 0), 0);
    // NEW: Find the Most Expensive Fire (by money used)
    const mostExpensiveFire = displayedFires.reduce((max, fire) => {
      const currentCost = fire.rawCostToDate || 0;
      const maxCost = max.rawCostToDate || 0;
      return currentCost > maxCost ? fire : max;
    }, displayedFires[0] || {});

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
        <Navbar
          onRefresh={this.fetchActiveWildfires} 
          isRefreshing={this.state.isLoading} 
        />
        <Menu inverted color='grey' size='mini' style={{ margin: 0, borderRadius: 0, flexShrink: 0, minHeight: 'auto'}}>
          <Menu.Item>
            <Label size='large' color='orange'> {/* Changed color to orange for visual thematic consistency */}
              <Icon name='fire'/> {/* Swap out lightning icon for a fire icon */}
              {this.props.f_reports.length > 0 ? ` Active fires: ${this.props.f_reports.length}` : "No active fires!"}
            </Label> 
          </Menu.Item>
          {/* ⚡ NEW: Display Aggregate Costs next to the fire count */}
        <Menu.Item>
          <div size='large' style={{ color: 'orange', fontWeight: 'bold', paddingLeft: '10px', fontSize: '1.0rem' }}>
            <Icon name='dollar sign' />
            Operations Budget: {formatFireCost(totalSpent)} / {formatFireCost(totalBudget)}
          </div>
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
        {/* NEW: Timestamp display pushed to the right */}
        <Menu.Menu position='right'>
          {this.state.lastUpdated && (
            <Menu.Item style={{ color: '#ffb3b3' }}>
              Updated: {this.state.lastUpdated}
            </Menu.Item>
          )}
        </Menu.Menu>
        </Menu>
        <div style={{ flex: 1, position: 'relative', width: '100%' }}>
        {/* Render canvas passing down only the coordinates and configurations needed for pins */}
        <MapFireReports 
          f_reports={displayedFires} 
          mostExpensiveFireName={mostExpensiveFire.name}
          gps={this.props.user.gps}
        />
        </div>
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