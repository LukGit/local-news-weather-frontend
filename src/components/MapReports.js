import React, { Component } from 'react';
import { Map as GoogleMap, Marker, GoogleApiWrapper, InfoWindow, Polyline } from 'google-maps-react';
import quakeS from '../img/quake24.png';
import quakeM from '../img/quake36.png';
import quakeL from '../img/quake48.png';
import quakeX from '../img/quake64.png';
import { withRouter } from 'react-router-dom';
import plateData from '../data/tectonic-plates.json';

export class MapReports extends Component {
  state = {
    centerGPS: this.props.gps,
    filterReports: [],
    recenterGPS: null,
    qMarker: null,
    showInfo: false,
    quakePl: "",
    quakeMag: "",
    quakeDate: "",
    quakeAlert: "",
    quakeLink: "",
    quakeDepth: "",
    staticRenderTime: Date.now()
  };

  componentDidMount() {
    this._isMounted = true;
    this.setState({
      centerGPS: this.props.centerGPS || this.props.gps
    });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.centerGPS !== this.props.centerGPS && this.props.centerGPS) {
      this.setState({
        centerGPS: this.props.centerGPS,
        recenterGPS: this.props.centerGPS
      });
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  handleClick = (props, marker, e) => {
    const quake = this.props.reports.find(r => r.id === props.name);
    if (!quake) return;
    const Q_URL = quake.properties.detail;

    fetch(Q_URL)
      .then(resp => resp.json())
      .then(quakeResp => {
        if (!this._isMounted) return;

        const epicenterLng = quake.geometry.coordinates[0];
        const epicenterLat = quake.geometry.coordinates[1];
        const userLat = this.state.centerGPS?.lat;
        const userLng = this.state.centerGPS?.lng;

        let distanceFromHome = null;
        if (userLat && userLng) {
          distanceFromHome = this.calculateDistance(
            userLat,
            userLng,
            epicenterLat,
            epicenterLng
          );
        }

        const faultData = this.findNearestFault(epicenterLat, epicenterLng);
        this.setState({
          qMarker: marker,
          showInfo: true,
          quakePl: quake.properties.place,
          quakeMag: quake.properties.mag,
          quakeDate: new Date(quake.properties.time).toLocaleString(),
          quakeAlert: quake.properties.alert,
          quakeLink: quake.properties.url,
          quakeDepth: quake.geometry.coordinates[2],
          quakeDistance: distanceFromHome,
          nearestFaultDistance: faultData.distance,
          nearestFaultPath: faultData.path,
          quakeFeltCount: quakeResp.properties.felt,
          quakeTsunamiFlag: quakeResp.properties.tsunami,
          recenterGPS: { lat: epicenterLat, lng: epicenterLng }
        });
      })
      .catch(err => console.error("Error fetching detail:", err));
  };

  onMapDragEnd = () => {
    if (this.state.recenterGPS !== null) {
      this.setState({ recenterGPS: null });
    }
  };

  onMapClick = () => {
    if (this.state.showInfo) {
      this.setState({
        showInfo: false,
        nearestFaultPath: null
      });
    }
  };

  getDepthColor = (depth) => {
    if (depth === undefined || depth === null || depth === "") return '#6b7280';

    if (depth <= 70) {
      return '#ef4444';
    } else if (depth <= 300) {
      return '#f97316';
    } else {
      return '#3b82f6';
    }
  };

  getAlertColor = (alert) => {
    if (!alert || alert === "none") return '#6b7280';

    switch (alert.toLowerCase()) {
      case 'green':
        return '#22c55e';
      case 'yellow':
        return '#eab308';
      case 'orange':
        return '#f97316';
      case 'red':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;

    const R = 3958.8;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  findNearestFault = (quakeLat, quakeLng) => {
    let minDistance = Infinity;
    let closestPath = null;

    if (!plateData || !plateData.features) return { distance: null, path: null };

    plateData.features.forEach(feature => {
      const type = feature.geometry.type;
      const coords = feature.geometry.coordinates;

      const checkLineSegment = (lineCoords) => {
        let localMin = Infinity;
        lineCoords.forEach(pt => {
          const dist = this.calculateDistance(quakeLat, quakeLng, pt[1], pt[0]);
          if (dist < localMin) localMin = dist;
        });

        if (localMin < minDistance) {
          minDistance = localMin;
          closestPath = lineCoords.map(pt => ({ lat: pt[1], lng: pt[0] }));
        }
      };

      if (type === 'LineString') {
        checkLineSegment(coords);
      } else if (type === 'MultiLineString') {
        coords.forEach(line => checkLineSegment(line));
      }
    });

    return {
      distance: minDistance === Infinity ? null : minDistance,
      path: closestPath
    };
  };

  getSafeCenter = () => {
    const target = this.state.recenterGPS || this.props.gps;
    if (target && target.lat !== undefined && target.lng !== undefined) {
      const safeLat = parseFloat(target.lat);
      const safeLng = parseFloat(target.lng);
      if (!isNaN(safeLat) && !isNaN(safeLng)) {
        return { lat: safeLat, lng: safeLng };
      }
    }
    return { lat: 24.6405, lng: -93.9520 };
  };

  render() {
    return (
      <GoogleMap
        google={this.props.google}
        zoom={3}
        initialCenter={this.getSafeCenter()}
        center={this.state.recenterGPS}
        onDragend={this.onMapDragEnd}
        onClick={this.onMapClick}
      >
        {this.props.reports.map((r, index) => {
          let qIcon;
          if (r.properties.mag < 5) {
            qIcon = quakeS;
          } else if (r.properties.mag < 6.5) {
            qIcon = quakeM;
          } else if (r.properties.mag < 7.5) {
            qIcon = quakeL;
          } else {
            qIcon = quakeX;
          }

          const timePassedMs = this.state.staticRenderTime - r.properties.time;
          const hoursPassed = Math.round(timePassedMs / (1000 * 60 * 60));
          const calculatedOpacity = Math.max(0.25, 1 - (hoursPassed / 72));
          const isBouncing = this.props.activeIndex === index;

          return (
            <Marker
              key={isBouncing ? `${r.id}-bounce` : r.id}
              name={r.id}
              icon={qIcon}
              opacity={calculatedOpacity}
              position={r.cachedPosition}
              animation={isBouncing ? window.google.maps.Animation.BOUNCE : null}
              title={r.properties.place}
              onClick={this.handleClick}
            />
          );
        })}

        {this.state.showInfo && this.state.nearestFaultPath && (
          <Polyline
            path={this.state.nearestFaultPath}
            strokeColor="#dc2626"
            strokeOpacity={1.0}
            strokeWeight={4}
            geodesic={true}
            zIndex={100}
          />
        )}

        <InfoWindow
          marker={this.state.qMarker}
          visible={this.state.showInfo}
          onClose={() => this.setState({ showInfo: false, nearestFaultPath: null })}
        >
          <div style={{ minWidth: '220px', maxWidth: '280px', padding: '4px', fontFamily: 'system-ui, sans-serif' }}>
            {this.state.quakePl ? (
              <div>
                <h3 style={{ margin: '0 0 8px 0', paddingBottom: '6px', borderBottom: '1px solid #ddd', fontSize: '16px', lineHeight: '1.3' }}>
                  Magnitude {this.state.quakeMag} <br />
                  <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#555' }}>
                    {this.state.quakePl}
                  </span>
                </h3>

                {this.state.quakeTsunamiFlag === 1 && (
                  <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '6px', borderRadius: '4px', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', border: '1px solid #f87171' }}>
                    ⚠️ Tsunami Advisory/Watch Active
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
                  <span style={{ fontWeight: '600', color: '#555' }}>Depth:</span>
                  <span style={{ color: this.getDepthColor(this.state.quakeDepth), fontWeight: 'bold' }}>
                    {this.state.quakeDepth} km
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
                  <span style={{ fontWeight: '600', color: '#555' }}>Alert Level:</span>
                  <span style={{ color: this.getAlertColor(this.state.quakeAlert), fontWeight: 'bold', textTransform: 'capitalize' }}>
                    {this.state.quakeAlert === null ? "None" : this.state.quakeAlert}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
                  <span style={{ fontWeight: '600', color: '#555' }}>Proximity:</span>
                  <span style={{
                    fontWeight: this.state.quakeDistance && this.state.quakeDistance < 100 ? 'bold' : 'normal',
                    color: this.state.quakeDistance && this.state.quakeDistance < 100 ? '#dc2626' : 'inherit'
                  }}>
                    {this.state.quakeDistance !== null ? `${this.state.quakeDistance} mi` : 'GPS Unavailable'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
                  <span style={{ fontWeight: '600', color: '#555' }}>Felt Reports:</span>
                  <span>{this.state.quakeFeltCount ? this.state.quakeFeltCount.toLocaleString() : '0'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '13px', color: '#777', marginTop: '8px' }}>
                  <span style={{ fontWeight: '600' }}>Time:</span>
                  <span>{this.state.quakeDate}</span>
                </div>

                {this.state.quakeLink && (
                  <div style={{ marginTop: '10px', textAlign: 'center' }}>
                    <a
                      href={this.state.quakeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '13px', color: '#0066cc', textDecoration: 'none' }}
                    >
                      View USGS Event Detail
                    </a>
                  </div>
                )}
              </div>
            ) : null}

            {this.state.nearestFaultDistance !== null && (
              <div style={{ margin: '8px 0', padding: '6px', backgroundColor: '#fff7ed', borderRadius: '4px', border: '1px solid #fed7aa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ fontWeight: '600', color: '#c2410c' }}>Nearest Tectonic Boundary:</span>
                  <span style={{ fontWeight: 'bold', color: '#c2410c' }}>
                    {this.state.nearestFaultDistance} mi
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#9a3412', marginTop: '4px', lineHeight: '1.2' }}>
                  * Boundary proximity is provided for spatial reference and does not definitively establish geologic causation.
                </div>
              </div>
            )}
          </div>
        </InfoWindow>
      </GoogleMap>
    );
  }
}

export default GoogleApiWrapper({
  apiKey: process.env.REACT_APP_GOOGLE_API_KEY
})(withRouter(MapReports));
