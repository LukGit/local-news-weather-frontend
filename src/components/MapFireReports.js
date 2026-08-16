import React, { Component } from 'react';
import { Map, Marker, GoogleApiWrapper, InfoWindow, Polygon } from 'google-maps-react'; // added Polygon
import fire16 from '../img/fire16.png';
import fire32 from '../img/fire32.png';
import fire48 from '../img/fire48.png';
import fire64 from '../img/fire64.png';
import fire96 from '../img/fire96.png';

import { withRouter } from 'react-router-dom';
import { Item, Progress } from 'semantic-ui-react';

export class MapFireReports extends Component {
  state = {
    centerGPS: this.props.gps,
    recenterGPS: {},
    activeMarker: {},
    showInfo: false,
    fireName: "",
    fireAcres: 0,
    fireContain: 0,
    fireDuration: 0,
    costToDate: 0,
    finalCost: 0,
    currentZoom: 5 // ADDED: Track zoom level (defaults to initial map zoom)
  }
  
  componentDidMount () {
    this.setState({
      centerGPS: this.props.gps
    });
  }
  
  // ADDED: Listener to capture zoom changes dynamically
  handleZoomChanged = (mapProps, map) => {
    if (map) {
      this.setState({ currentZoom: map.getZoom() });
    }
  }

  // Custom click handler for Wildfires
  handleMarkerClick = (props, marker, e) => {
    this.setState({
      fireName: props.fire.name,
      fireAcres: props.fire.acres,
      fireContain: props.fire.containment,
      fireDuration: props.fire.daysBurning,
      activeMarker: marker,
      // ⚡ Add cost metrics to state
      costToDate: props.fire.costToDate,
      finalCost: props.fire.finalCost,
      rawCostToDate: props.fire.rawCostToDate,
      rawFinalCost: props.fire.rawFinalCost,
      showInfo: true,
      recenterGPS: props.position // Centers map on the fire when clicked
    });
  }

  onMapClick = (props) => {
    if (this.state.showInfo) {
      this.setState({
        showInfo: false
      });
    }
  }
// Dynamic Opacity: 0% contained = 1.0 (Full) | 100% contained = 0.25 (Subdued)
  getOpacity = (containment) => {
    if (containment === null || containment === undefined) return 1.0;
    
    const minOpacity = 0.10;
    const maxOpacity = 1.0;
    const opacity = maxOpacity - ((containment / 100) * (maxOpacity - minOpacity));
    
    return parseFloat(opacity.toFixed(2));
  };

  render() {
    // Show detailed boundary polygons only when zoomed into localized region (Zoom >= 9) 
    const showPerimeters = this.state.currentZoom >= 9;
    return (
      <Map 
        google={this.props.google} 
        zoom={5} 
        initialCenter={{lat: 39.8283, lng: -98.5795}} // Adjusted to center of the US
        center={this.state.recenterGPS}
        onClick={this.onMapClick}
        onZoomChanged={this.handleZoomChanged} // ADDED: Zoom event listener
      >
        {/* ADDED: Burn Perimeter Layer (Renders only when zoomed in >= 9) */}
        {/* Burn Perimeter Layer (Renders all rings for MultiPolygon fires) */}
        {showPerimeters && this.props.f_reports && this.props.f_reports.map(fire => {
          if (!fire.perimeterRings || fire.perimeterRings.length === 0) return null;

          return fire.perimeterRings.map((ringCoords, ringIdx) => (
            <Polygon
              key={`perimeter-${fire.id}-ring-${ringIdx}`}
              paths={ringCoords}
              strokeColor="#dc2626"   // Solid dark red border
              strokeOpacity={0.8}
              strokeWeight={2}
              fillColor="#ef4444"     // Translucent red fill
              fillOpacity={0.25}
              geodesic={true}
            />
          ));
        })}

        {/* Render Wildfire Markers */}
        {this.props.f_reports && this.props.f_reports.map(fire => {
          const containment = fire.containment ?? 0;
          const activeAcres = fire.acres * (1 - (containment / 100));
          // NEW: Check if this is the most expensive fire
          const isMostExpensive = this.props.mostExpensiveFireName === fire.name;
          // Dynamic 4-tier icon sizing logic
          let selectedIcon = fire16; // Default: Minor (< 1,000 acres)
  
          if (activeAcres >= 100000) {
            selectedIcon = fire96;   // 🆕 The Santa Ana / Mega-Fire Tier
          } else if (activeAcres >= 30000) {
            selectedIcon = fire64;   
          } else if (activeAcres >= 10000) {
            selectedIcon = fire48;   
          } else if (activeAcres >= 3000) {
            selectedIcon = fire32;   
          }
          const iconOpacity = this.getOpacity(fire.containment);
          return (
            <Marker
              key={`fire-pin-${fire.id}`}
              position={fire.position}
              title={fire.name}
              opacity={iconOpacity}   // Visual fading based on containment %
              fire={fire} // Passing the custom fire object down to the marker props
              icon={{ url: selectedIcon }} 
              onClick={this.handleMarkerClick} 
              // NEW: Apply a bouncing animation to the most expensive fire only
              animation={isMostExpensive ? this.props.google.maps.Animation.BOUNCE : null}
            />
          );
        })}

        {/* Simplified InfoWindow for Fires */}
        <InfoWindow
          marker={this.state.activeMarker}
          visible={this.state.showInfo}
        >
          <Item.Group>
            <Item>
              <Item.Content>
                <Item.Header>{this.state.fireName}</Item.Header>
              </Item.Content>
            </Item>
            <Item>
              <Item.Content>
                <Item.Header>Acres Burned</Item.Header>
                <Item.Description>
                  {this.state.fireAcres ? this.state.fireAcres.toLocaleString() : "Unknown"}
                </Item.Description>
              </Item.Content>
            </Item>  
            <Item>
              <Item.Content>
                <Item.Header>Days Burning</Item.Header>
                <Item.Description>
                  {this.state.fireDuration ? this.state.fireDuration : "Unknown"}
                </Item.Description>
              </Item.Content>
            </Item>  
            <Item>
              <Item.Content>
                <Item.Header>Containment</Item.Header>
                <Item.Description>
                   {this.state.fireContain !== null && this.state.fireContain !== undefined
                   ? `${this.state.fireContain.toLocaleString()}%` 
                  : "Unknown"}
                </Item.Description>
              </Item.Content>
            </Item>  
            {/* Render the Progress Bar only if cost data exists */}
            {this.state.rawFinalCost > 0 ? (
              <div style={{ marginTop: '15px' }}>
                <p style={{ marginBottom: '5px', fontSize: '0.9em' }}>
                  <strong>Used/Budget:</strong> {this.state.costToDate} / {this.state.finalCost}
                </p>
                <Progress 
                  value={this.state.rawCostToDate} 
                  total={this.state.rawFinalCost} 
                  color='orange' 
                  size='tiny' 
                  style={{ margin: 0 }}
                />
              </div>
            ) : null}
          </Item.Group>
        </InfoWindow>
      </Map>
    );
  }
}

export default GoogleApiWrapper({
  apiKey: process.env.REACT_APP_GOOGLE_API_KEY
})(withRouter(MapFireReports));