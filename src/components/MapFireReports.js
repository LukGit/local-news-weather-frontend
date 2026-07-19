import React, { Component } from 'react';
import { Map, Marker, GoogleApiWrapper, InfoWindow } from 'google-maps-react'; // Removed Polyline/Polygon
import fire16 from '../img/fire16.png';
import fire32 from '../img/fire32.png';
import fire48 from '../img/fire48.png';
import fire64 from '../img/fire64.png';
import fire96 from '../img/fire96.png';

import { withRouter } from 'react-router-dom';
import { Item } from 'semantic-ui-react';

export class MapFireReports extends Component {
  state = {
    centerGPS: this.props.gps,
    recenterGPS: {},
    activeMarker: {},
    showInfo: false,
    fireName: "",
    fireAcres: 0
  }
  
  componentDidMount () {
    this.setState({
      centerGPS: this.props.gps
    });
  }
  
  // Custom click handler for Wildfires
  handleMarkerClick = (props, marker, e) => {
    this.setState({
      fireName: props.fire.name,
      fireAcres: props.fire.acres,
      activeMarker: marker,
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

  render() {
    return (
      <Map 
        google={this.props.google} 
        zoom={5} 
        initialCenter={{lat: 39.8283, lng: -98.5795}} // Adjusted to center of the US
        center={this.state.recenterGPS}
        onClick={this.onMapClick}
      >
        {/* Render Wildfire Markers */}
        {this.props.f_reports && this.props.f_reports.map(fire => {
          
          // Dynamic 4-tier icon sizing logic
          let selectedIcon = fire16; // Default: Minor (< 1,000 acres)
  
          if (fire.acres >= 100000) {
            selectedIcon = fire96;   // 🆕 The Santa Ana / Mega-Fire Tier
          } else if (fire.acres >= 30000) {
            selectedIcon = fire64;   
          } else if (fire.acres >= 10000) {
            selectedIcon = fire48;   
          } else if (fire.acres >= 1000) {
            selectedIcon = fire32;   
          }

          return (
            <Marker
              key={`fire-pin-${fire.id}`}
              position={fire.position}
              title={fire.name}
              fire={fire} // Passing the custom fire object down to the marker props
              icon={{ url: selectedIcon }} 
              onClick={this.handleMarkerClick} 
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
          </Item.Group>
        </InfoWindow>
      </Map>
    );
  }
}

export default GoogleApiWrapper({
  apiKey: process.env.REACT_APP_GOOGLE_API_KEY
})(withRouter(MapFireReports));