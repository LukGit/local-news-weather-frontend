import React, { Component } from 'react';
import {
  Map as GoogleMap,
  GoogleApiWrapper,
  Marker,
  Polygon,
  Polyline,
  InfoWindow
} from 'google-maps-react';
import { withRouter } from 'react-router-dom';
import tornadoS from '../img/tornado30.png';
import warningS from '../img/warning16.png';
import { densifyPath, buildTaperedSwathPolygon } from '../utils/tornadoSwath';

const EF_STYLES = {
  EF0: { color: '#38bdf8', radius: 5, zIndex: 10 },
  EF1: { color: '#22c55e', radius: 6, zIndex: 20 },
  EF2: { color: '#eab308', radius: 7, zIndex: 30 },
  EF3: { color: '#f97316', radius: 8, zIndex: 40 },
  EF4: { color: '#ef4444', radius: 9, zIndex: 50 },
  EF5: { color: '#991b1b', radius: 11, zIndex: 60 },
  EFU: { color: '#94a3b8', radius: 5, zIndex: 5 }
};

const US_NATIONAL_CENTER = { lat: 39.5, lng: -98.35 };

class MapTornadoReports extends Component {
  state = {
    currentZoom: 5,
    touchdowns: [],
    selectedReport: null,
    activeMarker: null,
    showingInfoWindow: false,
    recenterGPS: null,
    isLoadingTrack: false,
    activeReplayStorm: null,
    replayStepIndex: 0,
    isReplaying: false
  };

  componentDidMount() {
    this._isMounted = true;
    const lsrURL = 'https://mesonet.agron.iastate.edu/geojson/lsr.php?hours=24';
    fetch(lsrURL)
      .then(res => res.json())
      .then(data => {
        if (!this._isMounted) return;
        let twisters = [];
        if (data && data.features) {
          twisters = data.features.filter(
            f => f.properties && f.properties.typetext === 'TORNADO'
          );
        }
        this.setState({ touchdowns: twisters });
      })
      .catch(err => console.error('Error fetching LSR touchdown data:', err));
  }

  componentDidUpdate(prevProps) {
    if (prevProps.isHistoryMode !== this.props.isHistoryMode) {
      this.clearReplayAnimation();
      this.setState({
        showingInfoWindow: false,
        activeMarker: null,
        selectedReport: null,
        activeReplayStorm: null,
        isReplaying: false,
        replayStepIndex: 0,
        recenterGPS: this.props.isHistoryMode ? { ...US_NATIONAL_CENTER } : null,
        currentZoom: this.props.isHistoryMode ? 4 : 5
      });
    } else if (
      this.props.isHistoryMode &&
      prevProps.historyWindow !== this.props.historyWindow
    ) {
      this.clearReplayAnimation();
      this.setState({
        showingInfoWindow: false,
        activeMarker: null,
        selectedReport: null,
        activeReplayStorm: null,
        isReplaying: false,
        replayStepIndex: 0
      });
    } else if (prevProps.resetTrigger !== this.props.resetTrigger) {
      this.clearReplayAnimation();
      this.setState({
        showingInfoWindow: false,
        activeMarker: null,
        selectedReport: null,
        activeReplayStorm: null,
        isReplaying: false,
        replayStepIndex: 0,
        recenterGPS: { ...US_NATIONAL_CENTER },
        currentZoom: 4
      });
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.clearReplayAnimation();
  }

  clearReplayAnimation = () => {
    if (this.replayStartTimeout) {
      clearTimeout(this.replayStartTimeout);
      this.replayStartTimeout = null;
    }
    if (this.replayFallbackTimeout) {
      clearTimeout(this.replayFallbackTimeout);
      this.replayFallbackTimeout = null;
    }
    if (this.idleListener && this.props.google) {
      this.props.google.maps.event.removeListener(this.idleListener);
      this.idleListener = null;
    }
    if (this.replayInterval) {
      clearInterval(this.replayInterval);
      this.replayInterval = null;
    }
  };

  onMapReady = (mapProps, map) => {
    this.mapInstance = map;
  };

  getPolygonCentroid = (coordinates) => {
    if (!coordinates || !coordinates.length) return null;

    const extractPoints = (arr) => {
      if (typeof arr[0] === 'number') return [arr];
      if (typeof arr[0][0] === 'number') return arr;

      let pts = [];
      for (let i = 0; i < arr.length; i++) {
        pts = pts.concat(extractPoints(arr[i]));
      }
      return pts;
    };

    const pts = extractPoints(coordinates);
    if (pts.length === 0) return null;

    let sumLat = 0;
    let sumLng = 0;
    pts.forEach(pt => {
      sumLng += pt[0];
      sumLat += pt[1];
    });

    return { lat: sumLat / pts.length, lng: sumLng / pts.length };
  };

  getEfDotIcon = (efScale, muted = false) => {
    const style = EF_STYLES[efScale] || EF_STYLES.EFU;
    const r = muted ? 4 : style.radius;
    const size = r * 2 + 4;
    const center = size / 2;
    const fillColor = muted ? '#64748b' : style.color;
    const fillOpacity = muted ? '0.55' : '0.88';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${center}" cy="${center}" r="${r}" fill="${fillColor}" fill-opacity="${fillOpacity}" stroke="#ffffff" stroke-width="1.2" />
    </svg>`;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
    };
  };

  handleZoomChanged = (mapProps, map) => {
    if (map && map.getZoom() !== this.state.currentZoom) {
      this.setState({ currentZoom: map.getZoom() });
    }
  };

  onMapClick = () => {
    if (this.state.showingInfoWindow) {
      this.setState({
        showingInfoWindow: false
      });
    }
  };

  onMarkerClick = (props, marker, report, shouldAutoZoom = true) => {
    this.clearReplayAnimation();
    this.setState({
      selectedReport: report,
      activeMarker: marker,
      showingInfoWindow: true,
      activeReplayStorm: null,
      isReplaying: false,
      replayStepIndex: 0,
      recenterGPS: props.position,
      currentZoom:
        shouldAutoZoom && this.state.currentZoom < 9 ? 9 : this.state.currentZoom
    });
  };

  onInfoWindowOpen = () => {
    const btn = document.getElementById('replay-swath-btn');
    if (btn) {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleReplaySwath();
      };
    }
  };

  onInfoWindowClose = () => {
    this.setState({
      showingInfoWindow: false,
      activeMarker: null,
      selectedReport: null
    });
  };

  frameStormBounds = (points) => {
    const { google } = this.props;
    if (!this.mapInstance || !google || !points || points.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    points.forEach(pt => bounds.extend(pt));

    google.maps.event.addListenerOnce(this.mapInstance, 'bounds_changed', () => {
      if (!this._isMounted || !this.mapInstance) return;
      const z = this.mapInstance.getZoom();
      const cappedZoom = z > 14 ? 14 : z;
      if (z > 14) {
        this.mapInstance.setZoom(14);
      }
      const center = this.mapInstance.getCenter();
      if (center) {
        this.setState({
          currentZoom: cappedZoom,
          recenterGPS: { lat: center.lat(), lng: center.lng() }
        });
      }
    });

    this.mapInstance.fitBounds(bounds);
  };

  handleReplaySwath = () => {
    const { selectedReport, isLoadingTrack } = this.state;
    if (!selectedReport || !selectedReport.rawStorm || isLoadingTrack) return;

    const storm = selectedReport.rawStorm;
    const efStyle = EF_STYLES[storm.efScale] || EF_STYLES.EFU;

    this.clearReplayAnimation();
    this.setState({
      showingInfoWindow: false,
      activeMarker: null,
      isLoadingTrack: true
    });

    fetch(`/api/history/tornadoes?id=${storm.id}`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch track for storm ${storm.id}`);
        return res.json();
      })
      .then(data => {
        if (!this._isMounted) return;

        let rawPath = Array.isArray(data.path) ? data.path : [];
        if (rawPath.length < 2 && storm.endLat && storm.endLng) {
          rawPath = [
            { lat: storm.startLat, lng: storm.startLng },
            { lat: storm.endLat, lng: storm.endLng }
          ];
        }

        if (rawPath.length < 2) {
          this.setState({ isLoadingTrack: false });
          return;
        }

        const widthYd = data.widthYd !== undefined ? data.widthYd : storm.widthYd;
        const densified = densifyPath(rawPath);
        const ghostSwath = buildTaperedSwathPolygon(
          densified,
          widthYd,
          densified.length
        );

        const replayStorm = {
          id: storm.id,
          dateKey: storm.date ? storm.date.slice(0, 10) : null,
          efScale: storm.efScale,
          efColor: efStyle.color,
          widthYd,
          densifiedPath: densified,
          ghostSwath
        };

        this.setState(
          {
            isLoadingTrack: false,
            activeReplayStorm: replayStorm,
            replayStepIndex: 0,
            isReplaying: false
          },
          () => {
            this.frameStormBounds(
              ghostSwath.length > 0 ? ghostSwath : densified
            );
            this.scheduleSwathPlayback(densified.length);
          }
        );
      })
      .catch(err => {
        console.error('Error loading tornado track:', err);
        if (this._isMounted) {
          this.setState({ isLoadingTrack: false });
        }
      });
  };

  scheduleSwathPlayback = (totalSteps) => {
    const { google } = this.props;
    let playbackLaunched = false;

    const launchWithBeat = (beatMs) => {
      if (playbackLaunched || !this._isMounted) return;
      playbackLaunched = true;

      if (this.replayFallbackTimeout) {
        clearTimeout(this.replayFallbackTimeout);
        this.replayFallbackTimeout = null;
      }
      if (this.idleListener && google) {
        google.maps.event.removeListener(this.idleListener);
        this.idleListener = null;
      }

      this.replayStartTimeout = setTimeout(() => {
        if (!this._isMounted) return;
        this.setState({ isReplaying: true, replayStepIndex: 1 });
        this.startSwathPlayback(totalSteps);
      }, beatMs);
    };

    if (this.mapInstance && google) {
      this.idleListener = google.maps.event.addListenerOnce(
        this.mapInstance,
        'idle',
        () => launchWithBeat(1200) // adjust start playback timing here
      );
    }

    // Fallback in case the map was already framed and 'idle' does not re-fire
    this.replayFallbackTimeout = setTimeout(() => launchWithBeat(0), 1300);
  };

  startSwathPlayback = (totalSteps) => {
    this.clearReplayAnimation();
    this.replayInterval = setInterval(() => {
      if (!this._isMounted) {
        this.clearReplayAnimation();
        return;
      }

      this.setState(prevState => {
        const nextStep = prevState.replayStepIndex + 1;
        if (nextStep >= totalSteps) {
          this.clearReplayAnimation();
          return {
            replayStepIndex: totalSteps - 1,
            isReplaying: false
          };
        }
        return { replayStepIndex: nextStep };
      });
    }, 55);
  };

  formatSurveyDate = (isoStr) => {
    if (!isoStr) return 'Unknown';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  render() {
    const {
      currentZoom,
      touchdowns,
      selectedReport,
      activeReplayStorm,
      replayStepIndex
    } = this.state;
    const { t_reports, hist_tornadoes, isHistoryMode, google, gps } = this.props;

    const showDetailedPolygons = currentZoom >= 9;

    const get24HourOpacity = (timestampStr, minOpacity = 0.20) => {
      if (!timestampStr) return minOpacity;

      const eventTime = new Date(timestampStr).getTime();
      const now = Date.now();
      const diffInMs = now - eventTime;

      if (diffInMs <= 0) return 1.0;

      const hoursPassed = diffInMs / (1000 * 60 * 60);
      if (hoursPassed >= 24) return minOpacity;

      const opacity = 1.0 - (hoursPassed / 24);
      return Math.max(minOpacity, opacity);
    };

    let activePolylinePath = [];
    let activeSwathPolygon = [];
    let vortexPosition = null;

    if (isHistoryMode && activeReplayStorm) {
      const endIdx = Math.min(
        replayStepIndex + 1,
        activeReplayStorm.densifiedPath.length
      );
      activePolylinePath = activeReplayStorm.densifiedPath.slice(0, endIdx);
      activeSwathPolygon = buildTaperedSwathPolygon(
        activePolylinePath,
        activeReplayStorm.widthYd,
        activeReplayStorm.densifiedPath.length
      );
      vortexPosition = activePolylinePath[activePolylinePath.length - 1];
    }

    return (
      <GoogleMap
        google={google}
        zoom={this.state.currentZoom}
        initialCenter={gps}
        onReady={this.onMapReady}
        onZoomChanged={this.handleZoomChanged}
        center={this.state.recenterGPS || gps}
        onClick={this.onMapClick}
        style={{ width: '100%', height: '100%' }}
      >
        {/* 1. National View (< 9 Zoom): Live Warning Centroid Markers */}
        {!isHistoryMode && !showDetailedPolygons && t_reports && t_reports.map((report, idx) => {
          const coords = report.geometry && report.geometry.coordinates;
          if (!coords) return null;
          const center = this.getPolygonCentroid(coords);
          if (!center) return null;
          const eventType = report.properties.event || 'Tornado Threat';
          const timestamp = report.properties?.sent || report.properties?.effective;
          const markerOpacity = get24HourOpacity(timestamp, 0.20);

          return (
            <Marker
              key={`centroid-${idx}`}
              position={center}
              title={report.properties.areaDesc || eventType}
              icon={{ url: warningS }}
              opacity={markerOpacity}
              onClick={(props, marker) => this.onMarkerClick(props, marker, {
                title: eventType,
                area: report.properties.areaDesc,
                summary: report.properties.headline || report.properties.description
              })}
            />
          );
        })}

        {/* 2. Regional View (>= 9 Zoom): Live Warning Polygons */}
        {!isHistoryMode && showDetailedPolygons && t_reports && t_reports.map((report, idx) => {
          if (!report.geometry || !report.geometry.coordinates) return null;

          const paths = [];
          const extractPaths = (arr) => {
            if (typeof arr[0][0] === 'number') {
              paths.push(arr.map(pt => ({ lat: pt[1], lng: pt[0] })));
            } else {
              arr.forEach(extractPaths);
            }
          };
          extractPaths(report.geometry.coordinates);

          const eventType = report.properties.event || '';
          const isWarning = eventType.includes('Warning');
          const timestamp = report.properties?.sent || report.properties?.effective;
          const opacity = get24HourOpacity(timestamp, 0.20);

          return (
            <Polygon
              key={`poly-${idx}`}
              paths={paths}
              options={{
                fillColor: isWarning ? '#FF0000' : '#FFA500',
                fillOpacity: opacity * 0.35,
                strokeColor: isWarning ? '#CC0000' : '#FF8C00',
                strokeOpacity: opacity,
                strokeWeight: 2
              }}
            />
          );
        })}

        {/* 3. Live Spotter Touchdowns: Bouncing Pins */}
        {!isHistoryMode && touchdowns.map((td, idx) => {
          const [lng, lat] = td.geometry.coordinates;
          const props = td.properties;
          const timestamp = td.properties?.valid;
          const markerOpacity = get24HourOpacity(timestamp, 0.30);

          return (
            <Marker
              key={`touchdown-${idx}`}
              position={{ lat, lng }}
              animation={google.maps.Animation.BOUNCE}
              title={`${props.city || ''}, ${props.state || ''}`}
              icon={{
                url: tornadoS,
                scaledSize: new google.maps.Size(32, 32)
              }}
              opacity={markerOpacity}
              onClick={(propsObj, marker) => this.onMarkerClick(propsObj, marker, {
                title: 'Confirmed Tornado Touchdown',
                area: `${props.city || ''}, ${props.state || ''}`,
                summary: props.remark || 'NWS Spotter Report',
                mag: props.magnitude
              })}
            />
          );
        })}

        {/* 4. Season Review Mode: Rolling 12-Month NWS DAT Touchdowns */}
        {isHistoryMode && hist_tornadoes && hist_tornadoes.map((t) => {
          const efStyle = EF_STYLES[t.efScale] || EF_STYLES.EFU;
          const isSameDayNeighbor =
            activeReplayStorm &&
            activeReplayStorm.id !== t.id &&
            activeReplayStorm.dateKey &&
            t.date &&
            t.date.slice(0, 10) === activeReplayStorm.dateKey;

          return (
            <Marker
              key={`hist-${t.id}`}
              position={{ lat: t.startLat, lng: t.startLng }}
              title={`${t.title} (${t.efScale})`}
              icon={this.getEfDotIcon(t.efScale, Boolean(isSameDayNeighbor))}
              zIndex={isSameDayNeighbor ? 4 : efStyle.zIndex}
              onClick={(propsObj, marker) => this.onMarkerClick(
                propsObj,
                marker,
                {
                  isHistorical: true,
                  rawStorm: t,
                  id: t.id,
                  title: t.title,
                  efScale: t.efScale,
                  efColor: efStyle.color,
                  date: this.formatSurveyDate(t.date),
                  maxWind: t.maxWind ? `${t.maxWind} mph` : 'N/A',
                  length: t.lengthMi !== null ? `${t.lengthMi.toFixed(2)} mi` : 'N/A',
                  width: t.widthYd !== null ? `${t.widthYd} yd` : 'N/A',
                  wfo: t.wfo || 'N/A',
                  summary: t.comments || 'No NWS narrative available.'
                },
                false
              )}
            />
          );
        })}

        {/* 5A. Season Review Replay: Ghost Scar Full Footprint */}
        {isHistoryMode && activeReplayStorm && activeReplayStorm.ghostSwath.length > 0 && (
          <Polygon
            paths={activeReplayStorm.ghostSwath}
            options={{
              fillColor: activeReplayStorm.efColor,
              fillOpacity: 0.08,
              strokeColor: activeReplayStorm.efColor,
              strokeOpacity: 0.45,
              strokeWeight: 1,
              zIndex: 70
            }}
          />
        )}

        {/* 5B. Season Review Replay: Progressive Tapered Damage Swath */}
        {isHistoryMode && activeReplayStorm && activeSwathPolygon.length > 0 && (
          <Polygon
            paths={activeSwathPolygon}
            options={{
              fillColor: activeReplayStorm.efColor,
              fillOpacity: 0.32,
              strokeColor: activeReplayStorm.efColor,
              strokeOpacity: 0.85,
              strokeWeight: 1.5,
              zIndex: 80
            }}
          />
        )}

        {/* 5C. Season Review Replay: Surveyed Centerline Track */}
        {isHistoryMode && activeReplayStorm && activePolylinePath.length > 1 && (
          <Polyline
            path={activePolylinePath}
            options={{
              strokeColor: activeReplayStorm.efColor,
              strokeOpacity: 0.95,
              strokeWeight: 3,
              zIndex: 90
            }}
          />
        )}

        {/* 5D. Season Review Replay: Moving Vortex Marker (anchored at funnel tip) */}
        {isHistoryMode && activeReplayStorm && vortexPosition && (
          <Marker
            position={vortexPosition}
            icon={{
              url: tornadoS,
              scaledSize: new google.maps.Size(34, 34),
              anchor: new google.maps.Point(17, 34)
            }}
            zIndex={100}
          />
        )}

        {/* 6. Details Popup */}
        <InfoWindow
          marker={this.state.activeMarker}
          visible={this.state.showingInfoWindow}
          onOpen={this.onInfoWindowOpen}
          onClose={this.onInfoWindowClose}
        >
          <div style={{ minWidth: '240px', maxWidth: '300px', padding: '4px', fontFamily: 'system-ui, sans-serif' }}>
            {selectedReport ? (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    margin: '0 0 8px 0',
                    paddingBottom: '6px',
                    borderBottom: '1px solid #ddd'
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '15px', lineHeight: '1.3', color: '#dc2626' }}>
                    {selectedReport.title}
                  </h3>
                  {selectedReport.efScale && (
                    <span
                      style={{
                        backgroundColor: selectedReport.efColor || '#64748b',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        marginLeft: '8px',
                        flexShrink: 0
                      }}
                    >
                      {selectedReport.efScale}
                    </span>
                  )}
                </div>

                {selectedReport.area && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '13px' }}>
                    <span style={{ fontWeight: '600', color: '#555', flexShrink: 0 }}>Location:</span>
                    <span style={{ fontWeight: 'bold', textAlign: 'right', marginLeft: '12px' }}>
                      {selectedReport.area}
                    </span>
                  </div>
                )}

                {selectedReport.isHistorical && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0', fontSize: '13px' }}>
                      <span style={{ fontWeight: '600', color: '#555' }}>Date:</span>
                      <span style={{ fontWeight: 'bold' }}>{selectedReport.date}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0', fontSize: '13px' }}>
                      <span style={{ fontWeight: '600', color: '#555' }}>Peak Wind:</span>
                      <span style={{ fontWeight: 'bold' }}>{selectedReport.maxWind}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0', fontSize: '13px' }}>
                      <span style={{ fontWeight: '600', color: '#555' }}>Path Length:</span>
                      <span style={{ fontWeight: 'bold' }}>{selectedReport.length}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0', fontSize: '13px' }}>
                      <span style={{ fontWeight: '600', color: '#555' }}>Max Width:</span>
                      <span style={{ fontWeight: 'bold' }}>{selectedReport.width}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0', fontSize: '13px' }}>
                      <span style={{ fontWeight: '600', color: '#555' }}>NWS Office:</span>
                      <span style={{ fontWeight: 'bold' }}>{selectedReport.wfo}</span>
                    </div>

                    <button
                      id="replay-swath-btn"
                      type="button"
                      onClick={this.handleReplaySwath}
                      style={{
                        marginTop: '8px',
                        width: '100%',
                        padding: '6px 10px',
                        backgroundColor: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Replay Swath
                    </button>
                  </div>
                )}

                {selectedReport.summary && (
                  <div
                    style={{
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px dotted #ccc',
                      fontSize: '12px',
                      lineHeight: '1.4',
                      color: '#333',
                      maxHeight: '130px',
                      overflowY: 'auto'
                    }}
                  >
                    {selectedReport.summary}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </InfoWindow>
      </GoogleMap>
    );
  }
}

export default GoogleApiWrapper({
  apiKey: process.env.REACT_APP_GOOGLE_API_KEY
})(withRouter(MapTornadoReports));
