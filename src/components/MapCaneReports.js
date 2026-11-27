import React, { Component } from 'react';
import { Map as GoogleMap, Marker, GoogleApiWrapper, InfoWindow, Polyline, Polygon, Circle } from 'google-maps-react';
import caneS from '../img/hts24.png';
import caneM from '../img/hts32.png';
import caneL from '../img/hts48.png';
import caneLow from '../img/hts16.png';
import { withRouter } from 'react-router-dom';
import { getEstimatedWindRadii } from '../utils/cycloneRadii';
import { fetchWindGridData, getWindBarbURI } from '../utils/windVectors';

export class MapCaneReports extends Component {
  state = {
    centerGPS: this.props.gps,
    filterReports: [],
    recenterGPS: this.props.gps || { lat: 24.6405, lng: -93.9520 },
    hMarker: null,
    showInfo: false,
    caneName: "",
    caneClass: "",
    caneIntensity: "",
    canePressure: "",
    caneSpeedDir: "",
    caneAdviceLink: "",
    caneUpdated: "",
    caneForecastLink: "",
    selectedStorm: null,
    currentZoom: 4,
    windVectors: [],
    selectedHistStorm: null,
    showHistInfo: false,
    histFrames: [],
    histFrameIndex: 0,
    mapBounds: null
  };

  componentWillUnmount() {
    this._isMounted = false;
    this.clearHistoryTimers();
  }

  componentDidMount() {
    this._isMounted = true;
    this.setState({ centerGPS: this.props.gps });
  }

  componentDidUpdate(prevProps) {
    const prevHistCount = prevProps.hist_reports ? prevProps.hist_reports.length : 0;
    const currentHistCount = this.props.hist_reports ? this.props.hist_reports.length : 0;

    // Wipe active storm overlays/KMZ when switching to historical view
    if (currentHistCount > 0 && prevHistCount === 0) {
      if (this.activeKmlLayer) {
        this.activeKmlLayer.setMap(null);
        this.activeKmlLayer = null;
      }
      if (this.state.selectedStorm || this.state.showInfo) {
        this.setState({ selectedStorm: null, showInfo: false });
      }
    }

    // Stop any running historical playback if the user switches basins or returns to Active
    if (prevProps.hist_reports !== this.props.hist_reports && this.state.selectedHistStorm) {
      this.stopHistoryPlayback();
      this.setState({ showHistInfo: false });
    }

    // Safely catch new GPS coordinates from the basin dropdown
    if (this.props.gps && this.props.gps.lat !== undefined && this.props.gps !== prevProps.gps) {
      const safeLat = parseFloat(this.props.gps.lat);
      const safeLng = parseFloat(this.props.gps.lng);

      if (!isNaN(safeLat) && !isNaN(safeLng)) {
        this.setState({
          recenterGPS: { lat: safeLat, lng: safeLng },
          currentZoom: 4
        });
      }
    }
  }

  clearHistoryTimers = () => {
    if (this.histStartTimeout) {
      clearTimeout(this.histStartTimeout);
      this.histStartTimeout = null;
    }
    if (this.histInterval) {
      clearInterval(this.histInterval);
      this.histInterval = null;
    }
  };

  handleZoomChanged = (mapProps, map) => {
    if (map && map.getZoom() !== this.state.currentZoom) {
      this.setState({ currentZoom: map.getZoom() });
    }
  };

  handleMapIdle = async (mapProps, map) => {
    if (this.props.hist_reports && this.props.hist_reports.length > 0) {
      if (this.state.windVectors.length > 0) {
        this.setState({ windVectors: [] });
      }
      this.lastWindBoundsStr = null;
      return;
    }

    if (map.getZoom() < 6) {
      if (this.state.windVectors.length > 0) {
        this.setState({ windVectors: [] });
      }
      this.lastWindBoundsStr = null;
      return;
    }

    const bounds = map.getBounds();
    if (!bounds) return;

    const boundsStr = bounds.toUrlValue();

    if (this.lastWindBoundsStr === boundsStr || this.isFetchingWind) {
      return;
    }

    this.isFetchingWind = true;
    this.lastWindBoundsStr = boundsStr;

    try {
      const windData = await fetchWindGridData(bounds, 5);
      if (this._isMounted && windData && windData.length > 0) {
        this.setState({ windVectors: windData });
      }
    } catch (err) {
      console.error("Wind data fetch error:", err);
    } finally {
      this.isFetchingWind = false;
    }
  };

  handleClick = (props, marker, e) => {
    const cane = this.props.c_reports.find(r => r.id === props.name);
    if (!cane) return;

    let hClass = "Unknown";
    if (cane.classification === "HU") {
      hClass = "Hurricane";
    } else if (cane.classification === "TD") {
      hClass = "Tropical Depression";
    } else if (cane.classification === "STD") {
      hClass = "Subtropical Depression";
    } else if (cane.classification === "TS") {
      hClass = "Tropical Storm";
    } else if (cane.classification === "STS") {
      hClass = "Subtropical Storm";
    } else if (cane.classification === "PTC") {
      hClass = "Post-tropical Cyclone / Remnants";
    } else if (cane.classification === "TY") {
      hClass = "Typhoon";
    } else if (cane.classification === "PC") {
      hClass = "Potential Tropical Cyclone";
    } else {
      hClass = "Unclassified";
    }

    let hDir = "";
    if (cane.movementDir < 22.5) hDir = "N";
    else if (cane.movementDir < 45) hDir = "NNE";
    else if (cane.movementDir < 67.5) hDir = "NE";
    else if (cane.movementDir < 90) hDir = "ENE";
    else if (cane.movementDir < 112.5) hDir = "E";
    else if (cane.movementDir < 135) hDir = "ESE";
    else if (cane.movementDir < 157.5) hDir = "SE";
    else if (cane.movementDir < 180) hDir = "SSE";
    else if (cane.movementDir < 202.5) hDir = "S";
    else if (cane.movementDir < 225) hDir = "SSW";
    else if (cane.movementDir < 247.5) hDir = "SW";
    else if (cane.movementDir < 270) hDir = "WSW";
    else if (cane.movementDir < 292.5) hDir = "W";
    else if (cane.movementDir < 315) hDir = "WNW";
    else if (cane.movementDir < 337.5) hDir = "NW";
    else if (cane.movementDir < 360) hDir = "NNW";
    else hDir = "N";

    const mapInstance = marker.map || (marker.getMap && marker.getMap());
    if (mapInstance) {
      mapInstance.setZoom(7);
    }

    if (this.activeKmlLayer) {
      this.activeKmlLayer.setMap(null);
      this.activeKmlLayer = null;
    }

    const isNOAA = cane.initialWindExtent && cane.initialWindExtent.kmzFile;
    if (isNOAA && mapInstance && window.google) {
      this.activeKmlLayer = new window.google.maps.KmlLayer({
        url: cane.initialWindExtent.kmzFile,
        map: mapInstance,
        preserveViewport: true,
        suppressInfoWindows: true,
        clickable: false
      });
    }

    this.setState({
      caneName: cane.name,
      caneClass: hClass,
      caneIntensity: `${cane.intensity}mph`,
      caneSpeedDir: `${cane.movementSpeed}mph ${hDir}`,
      canePressure: `${cane.pressure}mbar`,
      caneAdviceLink: cane.publicAdvisory.url,
      caneForecastLink: cane.forecastAdvisory.url,
      caneUpdated: cane.lastUpdate,
      hMarker: marker,
      showInfo: true,
      recenterGPS: { lat: cane.latitudeNumeric, lng: cane.longitudeNumeric },
      selectedStorm: cane
    });
  };

  /**
   * Expands raw 6-hour IBTrACS fixes into smooth interpolated frames while
   * keeping each frame locked to its parent observation's intensity & status.
   */
  buildInterpolatedFrames = (storm) => {
    const rawNodes = [];
    storm.segments.forEach((seg, segIndex) => {
      seg.coordinates.forEach((coord, rawPointIndex) => {
        rawNodes.push({
          lat: coord[0],
          lng: coord[1],
          wind: coord[2] !== undefined ? coord[2] : seg.windSpeed,
          dateStr: coord[3] !== undefined ? coord[3] : seg.startDate,
          status: seg.status,
          segIndex,
          rawPointIndex
        });
      });
    });

    if (rawNodes.length === 0) return [];
    if (rawNodes.length === 1) return [rawNodes[0]];

    // Adaptive frame budget: ~7s for short storms, ~14s for 31-day marathons like Nolo
    const totalFixes = rawNodes.length;
    const subSteps =
      totalFixes > 90 ? 2 :
      totalFixes > 45 ? 3 :
      totalFixes > 25 ? 4 : 5;

    const frames = [];

    for (let i = 0; i < rawNodes.length - 1; i++) {
      const a = rawNodes[i];
      const b = rawNodes[i + 1];

      // Shortest-path longitude delta across the International Date Line (±180°)
      let dLng = b.lng - a.lng;
      if (dLng > 180) dLng -= 360;
      if (dLng < -180) dLng += 360;
      const dLat = b.lat - a.lat;

      const isDuplicateBridge = Math.abs(dLat) < 1e-6 && Math.abs(dLng) < 1e-6;
      const stepsForLeg = isDuplicateBridge ? 1 : subSteps;

      for (let s = 0; s < stepsForLeg; s++) {
        const t = s / stepsForLeg;
        let interpLng = a.lng + dLng * t;
        if (interpLng > 180) interpLng -= 360;
        if (interpLng < -180) interpLng += 360;

        frames.push({
          lat: a.lat + dLat * t,
          lng: interpLng,
          wind: a.wind,
          dateStr: a.dateStr,
          status: a.status,
          segIndex: a.segIndex,
          rawPointIndex: a.rawPointIndex
        });
      }
    }

    // Push final terminal position
    frames.push(rawNodes[rawNodes.length - 1]);
    return frames;
  };

  handleHistClick = (props, marker, e) => {
    const hStorm = this.props.hist_reports.find(r => r.id === props.name);
    if (!hStorm) return;

    this.setState({
      showInfo: false,
      selectedStorm: null,
      showHistInfo: true
    });

    this.startHistoryPlayback(hStorm);
  };

  startHistoryPlayback = (storm) => {
    const allCoords = storm.segments.flatMap(seg => seg.coordinates);

    const bounds = new this.props.google.maps.LatLngBounds();
    allCoords.forEach(coord => {
      bounds.extend(new this.props.google.maps.LatLng(coord[0], coord[1]));
    });

    const frames = this.buildInterpolatedFrames(storm);
    if (frames.length === 0) return;

    this.clearHistoryTimers();

    this.setState({
      selectedHistStorm: storm,
      histFrames: frames,
      histFrameIndex: 0,
      mapBounds: bounds
    });

    // Brief 600ms beat so mapBounds framing settles before the storm starts moving
    this.histStartTimeout = setTimeout(() => {
      if (!this._isMounted) return;

      this.histInterval = setInterval(() => {
        if (!this._isMounted) {
          this.clearHistoryTimers();
          return;
        }

        this.setState(prevState => {
          if (!prevState.selectedHistStorm) {
            this.clearHistoryTimers();
            return null;
          }

          const nextIndex = prevState.histFrameIndex + 1;
          if (nextIndex < prevState.histFrames.length) {
            return { histFrameIndex: nextIndex };
          } else {
            this.clearHistoryTimers();
            return null;
          }
        });
      }, 60);
    }, 600);
  };

  stopHistoryPlayback = () => {
    this.clearHistoryTimers();
    this.setState({
      selectedHistStorm: null,
      histFrames: [],
      histFrameIndex: 0,
      mapBounds: null
    });
  };

  getHistIcon = (status) => {
    let iconUrl = caneS;
    let anchorPoint = this.props.google ? new this.props.google.maps.Point(12, 12) : null;

    if (status === 'Hurricane') {
      iconUrl = caneL;
      anchorPoint = this.props.google ? new this.props.google.maps.Point(24, 24) : null;
    } else if (status === 'Tropical Storm') {
      iconUrl = caneM;
      anchorPoint = this.props.google ? new this.props.google.maps.Point(16, 16) : null;
    } else if (status === 'Low') {
      iconUrl = caneLow;
      anchorPoint = this.props.google ? new this.props.google.maps.Point(8, 8) : null;
    }

    return {
      url: iconUrl,
      anchor: anchorPoint
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
    const showActive = !this.props.hist_reports || this.props.hist_reports.length === 0;
    const { selectedHistStorm, histFrames, histFrameIndex } = this.state;
    const currentFrame =
      selectedHistStorm && histFrames.length > 0
        ? histFrames[Math.min(histFrameIndex, histFrames.length - 1)]
        : null;

    const formatShortDate = (isoString) => {
      if (!isoString) return "Unknown";
      const d = new Date(isoString);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    };

    return (
      <GoogleMap
        google={this.props.google}
        zoom={this.state.currentZoom}
        initialCenter={this.getSafeCenter()}
        center={this.state.recenterGPS}
        bounds={this.state.mapBounds || undefined}
        onClick={() => {
          if (this.state.showInfo || this.state.selectedStorm) {
            this.setState({ showInfo: false, selectedStorm: null });
          }
          if (this.state.showHistInfo || this.state.selectedHistStorm) {
            this.setState({ showHistInfo: false });
            this.stopHistoryPlayback();
          }
        }}
        onZoomChanged={this.handleZoomChanged}
        onIdle={this.handleMapIdle}
      >
        {/* ========================================== */}
        {/* PHASE 0: ACTIVE STORM TELEMETRY            */}
        {/* ========================================== */}

        {/* 1. Forecast Cone Boundary Shading */}
        {showActive && this.props.c_reports && this.props.c_reports.map(r => {
          const conePath = this.props.conePolygons ? this.props.conePolygons[r.id] : null;
          if (!conePath || conePath.length < 3) return null;

          return (
            <Polygon
              key={`cone-${r.id}`}
              paths={conePath}
              strokeColor="#dc2626"
              strokeOpacity={0.8}
              strokeWeight={2}
              fillColor="#dc2626"
              fillOpacity={0.15}
              clickable={false}
            />
          );
        })}

        {/* 2. Past Tracks */}
        {showActive && this.props.pastTracks && Object.keys(this.props.pastTracks).map(stormId => {
          const path = this.props.pastTracks[stormId];
          if (!path || path.length === 0) return null;
          return (
            <Polyline
              key={`past-${stormId}`}
              path={path}
              strokeColor="#000000"
              strokeOpacity={0.8}
              strokeWeight={3}
            />
          );
        }).filter(Boolean)}

        {/* 3. Future Tracks */}
        {showActive && this.props.futureTracks && Object.keys(this.props.futureTracks).map(stormId => {
          const path = this.props.futureTracks[stormId];
          if (!path || path.length === 0) return null;
          return (
            <Polyline
              key={`future-${stormId}`}
              path={path}
              strokeColor="#dc2626"
              strokeOpacity={0.8}
              strokeWeight={3}
            />
          );
        }).filter(Boolean)}

        {/* 4. Active Storm Markers */}
        {showActive && this.props.c_reports && this.props.c_reports.map(r => {
          let caneIcon = caneS;
          let anchorPoint = this.props.google ? new this.props.google.maps.Point(12, 12) : null;

          if (r.classification === "HU" || r.classification === "TY") {
            caneIcon = caneL;
            anchorPoint = this.props.google ? new this.props.google.maps.Point(24, 24) : null;
          } else if (r.classification === "TS" || r.classification === "STS") {
            caneIcon = caneM;
            anchorPoint = this.props.google ? new this.props.google.maps.Point(16, 16) : null;
          }

          return (
            <Marker
              key={`marker-${r.id}`}
              name={r.id}
              icon={{ url: caneIcon, anchor: anchorPoint }}
              position={{ lat: r.latitudeNumeric, lng: r.longitudeNumeric }}
              title={r.name}
              onClick={this.handleClick}
            />
          );
        }).filter(Boolean)}

        {/* ========================================== */}
        {/* PHASE 1: HISTORICAL SEASON OVERVIEW        */}
        {/* ========================================== */}

        {/* 1. Historical Static Tracks */}
        {!showActive && this.props.hist_reports && this.props.hist_reports.map(storm => {
          if (!storm.segments || storm.segments.length === 0) return null;

          const isPlaying = selectedHistStorm !== null;
          if (isPlaying && selectedHistStorm.id === storm.id) return null;

          const trackOpacity = isPlaying ? 0.05 : 0.4;

          return (
            <Polyline
              key={`hist-poly-${storm.id}`}
              path={storm.segments.flatMap(s => s.coordinates).map(c => ({ lat: c[0], lng: c[1] }))}
              strokeColor="#9ca3af"
              strokeOpacity={trackOpacity}
              strokeWeight={2}
              clickable={false}
            />
          );
        }).filter(Boolean)}

        {/* 2. Historical Genesis Markers */}
        {!showActive && !selectedHistStorm && this.props.hist_reports && this.props.hist_reports.map(storm => {
          if (!storm.segments || storm.segments.length === 0) return null;

          const firstSeg = storm.segments[0];
          const genesisCoord = firstSeg.coordinates[0];

          return (
            <Marker
              key={`hist-mark-${storm.id}`}
              name={storm.id}
              position={{ lat: genesisCoord[0], lng: genesisCoord[1] }}
              icon={this.getHistIcon(firstSeg.status)}
              title={storm.name}
              onClick={this.handleHistClick}
            />
          );
        }).filter(Boolean)}

        {/* 3. HISTORICAL ISOLATED TRACK (Smooth Continuous Trailing Path) */}
        {selectedHistStorm && currentFrame && selectedHistStorm.segments.slice(0, currentFrame.segIndex + 1).map((seg, idx) => {
          let path = [];

          // Bridge cleanly from the previous segment's final point if coordinates do not overlap
          if (idx > 0) {
            const prevSeg = selectedHistStorm.segments[idx - 1];
            const prevLast = prevSeg.coordinates[prevSeg.coordinates.length - 1];
            const currFirst = seg.coordinates[0];
            if (prevLast && currFirst && (prevLast[0] !== currFirst[0] || prevLast[1] !== currFirst[1])) {
              path.push({ lat: prevLast[0], lng: prevLast[1] });
            }
          }

          if (idx < currentFrame.segIndex) {
            seg.coordinates.forEach(c => path.push({ lat: c[0], lng: c[1] }));
          } else {
            // Active segment: draw up to the current synoptic fix plus the interpolated playhead
            seg.coordinates
              .slice(0, currentFrame.rawPointIndex + 1)
              .forEach(c => path.push({ lat: c[0], lng: c[1] }));

            const lastPt = path[path.length - 1];
            if (!lastPt || lastPt.lat !== currentFrame.lat || lastPt.lng !== currentFrame.lng) {
              path.push({ lat: currentFrame.lat, lng: currentFrame.lng });
            }
          }

          if (path.length < 2) return null;

          let trackColor = "#3b82f6";
          let weight = 2;

          if (seg.status === "Hurricane") {
            trackColor = "#dc2626";
            weight = 4;
          } else if (seg.status === "Tropical Storm") {
            trackColor = "#f97316";
            weight = 3;
          }

          return (
            <Polyline
              key={`hist-track-${selectedHistStorm.id}-${idx}`}
              path={path}
              strokeColor={trackColor}
              strokeOpacity={0.85}
              strokeWeight={weight}
              clickable={false}
            />
          );
        })}

        {/* 4. THE PLAYHEAD MARKER (Stable key prevents flicker during 60ms glide) */}
        {selectedHistStorm && currentFrame && (
          <Marker
            key={`playhead-${selectedHistStorm.id}`}
            position={{ lat: currentFrame.lat, lng: currentFrame.lng }}
            icon={this.getHistIcon(currentFrame.status)}
            clickable={false}
          />
        )}

        {/* DYNAMIC COVERAGE LAYER (Wind Radii) */}
        {showActive && (() => {
          const storm = this.state.selectedStorm;
          if (!storm) return null;

          const isNOAA = storm?.initialWindExtent?.kmzFile;
          if (isNOAA) return null;

          const lat = storm.latitudeNumeric || parseFloat(storm.latitude);
          const lng = storm.longitudeNumeric || parseFloat(storm.longitude);
          const rings = getEstimatedWindRadii(storm.intensity);

          return rings.map(ring => (
            <Circle
              key={`ring-${storm.id}-${ring.speedKt}`}
              center={{ lat, lng }}
              radius={ring.radiusMeters}
              fillColor={ring.fillColor}
              fillOpacity={ring.fillOpacity}
              strokeColor={ring.strokeColor}
              strokeOpacity={0.8}
              strokeWeight={1.5}
              clickable={false}
            />
          ));
        })()}

        {/* Wind Vectors Layer */}
        {this.state.windVectors.map((vector, index) => (
          <Marker
            key={`wind-${index}`}
            position={{ lat: vector.lat, lng: vector.lng }}
            icon={{
              url: getWindBarbURI(vector.speed, vector.direction),
              anchor: this.props.google ? new this.props.google.maps.Point(30, 30) : null
            }}
            clickable={false}
          />
        ))}

        {/* Active Storm InfoWindow */}
        {this.state.showInfo && (() => {
          const storm = this.state.selectedStorm;
          if (!storm) return null;

          return (
            <InfoWindow
              marker={this.state.hMarker}
              visible={this.state.showInfo && showActive}
              onClose={() => this.setState({ showInfo: false, selectedStorm: null })}
            >
              {this.state.selectedStorm ? (
                <div style={{ width: '240px', padding: '4px', fontFamily: 'system-ui, sans-serif' }}>
                  <h3 style={{ margin: '0 0 8px 0', paddingBottom: '6px', borderBottom: '1px solid #ddd', fontSize: '16px' }}>
                    {this.state.caneName} <br />
                    <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#555' }}>{this.state.caneClass}</span>
                  </h3>

                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
                    <span style={{ fontWeight: '600', color: '#555' }}>Intensity:</span>
                    <span>{this.state.caneIntensity}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
                    <span style={{ fontWeight: '600', color: '#555' }}>Pressure:</span>
                    <span>{this.state.canePressure}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
                    <span style={{ fontWeight: '600', color: '#555' }}>Movement:</span>
                    <span>{this.state.caneSpeedDir}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '13px', color: '#777', marginTop: '8px' }}>
                    <span style={{ fontWeight: '600' }}>Updated:</span>
                    <span>{this.state.caneUpdated ? formatShortDate(this.state.caneUpdated) : "Unknown"}</span>
                  </div>

                  <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '11px', lineHeight: '1.4', color: '#475569' }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px', color: '#334155' }}>Wind Field Coverage</div>
                    {this.state.selectedStorm?.initialWindExtent?.kmzFile ? (
                      <span>Displays exact 34, 50, and 64-knot asymmetric wind boundaries provided by real-time NOAA telemetry.</span>
                    ) : (
                      <span>Displays estimated 34, 50, and 64-knot boundaries calculated from standard meteorological models. These are structural approximations based on storm intensity, not exact measured data.</span>
                    )}
                  </div>

                  {this.state.caneAdviceLink && (
                    <div style={{ marginTop: '12px', textAlign: 'center' }}>
                      <a href={this.state.caneAdviceLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>
                        View Official Advisory
                      </a>
                    </div>
                  )}
                </div>
              ) : <div />}
            </InfoWindow>
          );
        })()}

        {/* HISTORICAL STORM INFOWINDOW (Static Position, Dynamic Content) */}
        <InfoWindow
          position={(() => {
            if (!selectedHistStorm) return { lat: 0, lng: 0 };
            const segs = selectedHistStorm.segments;
            const lastSeg = segs[segs.length - 1];
            const lastCoord = lastSeg.coordinates[lastSeg.coordinates.length - 1];
            return { lat: lastCoord[0], lng: lastCoord[1] };
          })()}
          visible={this.state.showHistInfo && !showActive}
          onClose={() => {
            this.setState({ showHistInfo: false });
            this.stopHistoryPlayback();
          }}
        >
          {selectedHistStorm && currentFrame ? (() => {
            const hStorm = selectedHistStorm;
            const liveWind = currentFrame.wind;
            const currentDate = currentFrame.dateStr
              ? new Date(currentFrame.dateStr).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })
              : "Unknown";

            let maxWind = 0;
            hStorm.segments.forEach(seg => {
              if (seg.windSpeed > maxWind) maxWind = seg.windSpeed;
            });

            return (
              <div style={{ width: '240px', padding: '4px', fontFamily: 'system-ui, sans-serif' }}>
                <h3 style={{ margin: '0 0 8px 0', paddingBottom: '6px', borderBottom: '1px solid #ddd', fontSize: '16px' }}>
                  {hStorm.name} <br />
                  <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#555' }}>
                    {hStorm.basin === 'NA' ? 'Atlantic' : hStorm.basin === 'EP' ? 'Eastern Pacific' : 'Western Pacific'} Basin
                  </span>
                </h3>

                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
                  <span style={{ fontWeight: '600', color: '#555' }}>Current Status:</span>
                  <span>{currentFrame.status}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
                  <span style={{ fontWeight: '600', color: '#555' }}>Live Wind:</span>
                  <span style={{ color: '#dc2626', fontWeight: 'bold' }}>{liveWind > 0 ? `${liveWind} knots` : "Unknown"}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
                  <span style={{ fontWeight: '600', color: '#555' }}>Live Date:</span>
                  <span>{currentDate}</span>
                </div>

                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #ccc', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#777' }}>
                  <span>Overall Peak:</span>
                  <span>{maxWind > 0 ? `${maxWind} knots` : "Unknown"}</span>
                </div>
              </div>
            );
          })() : <div />}
        </InfoWindow>
      </GoogleMap>
    );
  }
}

export default GoogleApiWrapper({
  apiKey: process.env.REACT_APP_GOOGLE_API_KEY
})(withRouter(MapCaneReports));
