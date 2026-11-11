import React, { Component } from 'react';
import { Map, Marker, GoogleApiWrapper, InfoWindow, Polyline, Polygon, Circle } from 'google-maps-react';
import caneS from '../img/hts24.png'
import caneM from '../img/hts32.png'
import caneL from '../img/hts48.png'
import caneLow from '../img/hts16.png'
import { withRouter } from 'react-router-dom'
import { getEstimatedWindRadii } from '../utils/cycloneRadii';
//import { Item } from 'semantic-ui-react/dist/commonjs'
import { fetchWindGridData, getWindBarbURI } from '../utils/windVectors'; 


export class MapCaneReports extends Component {
  // map gps center is determined by zip code after login
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
    currentZoom: 4,     // NEW: Track zoom level
    windVectors: [],    // NEW: Track wind objects
    histSegmentIndex: 0, // New for storm history
    selectedHistStorm: null, //New for storm history focus
    showHistInfo: false, //New for storm history focus
    histSubStep: 0, // NEW: 0 = Start, 1 = Mid, 2 = End
    mapBounds: null, // NEW
  }
  
  componentWillUnmount() {
    this._isMounted = false;
    if (this.histInterval) {
      clearInterval(this.histInterval);
    }
  }

  componentDidMount () {
    this._isMounted = true; 
    this.setState({ centerGPS: this.props.gps });
  }

  componentDidUpdate(prevProps) {
    // 1. SAFE GUARD: Check history arrays without assuming they are defined
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

    // 2. Safely catch new GPS coordinates from the basin dropdown
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

  // NEW: Capture zoom changes dynamically
  handleZoomChanged = (mapProps, map) => {
    if (map && map.getZoom() !== this.state.currentZoom) {
      this.setState({ currentZoom: map.getZoom() });
    }
  }

  // NEW: Fetch wind data on map idle
  handleMapIdle = async (mapProps, map) => {
    // 1. Skip during history playback
    if (this.props.hist_reports && this.props.hist_reports.length > 0) {
      if (this.state.windVectors.length > 0) {
        this.setState({ windVectors: [] });
      }
      this.lastWindBoundsStr = null;
      return; 
    }

    // 2. Skip at zoomed-out levels (< 6)
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

    // 3. INFINITE LOOP GUARD: Skip if bounds haven't changed or a fetch is already in flight
    if (this.lastWindBoundsStr === boundsStr || this.isFetchingWind) {
      return;
    }

    this.isFetchingWind = true;
    this.lastWindBoundsStr = boundsStr;

    try {
      const windData = await fetchWindGridData(bounds, 5); 
      if (windData && windData.length > 0) {
        this.setState({ windVectors: windData });
      }
    } catch (err) {
      console.error("Wind data fetch error:", err);
    } finally {
      this.isFetchingWind = false;
    }
  }

  handleClick = (props, marker, e) => {
    // this set the detail information of the quake and turn on the infowindow
    const cane = this.props.c_reports.find(r => r.id === props.name)
    let hClass = "Unknown"
    if (cane.classification === "HU") {
      hClass = "Hurricane"
    } else if (cane.classification === "TD") {
      hClass = "Tropical Depression"
    } else if (cane.classification === "STD") {
      hClass = "Subtropical Depression"
    } else if (cane.classification === "TS") {
      hClass = "Tropical Storm"
    } else if (cane.classification === "STS") {
      hClass = "Subtropical Storm"
    } else if (cane.classification === "PTC") {
      hClass = "Post-tropical Cyclone / Remnants"
    } else if (cane.classification === "TY") {
      hClass = "Typhoon"
    } else if (cane.classification === "PC") {
      hClass = "Potential Tropical Cyclone"
    } else {
      hClass = "Unclassified"
    }
  
  let hDir = ""
  if (cane.movementDir < 22.5) {
    hDir = "N"
  } else if (cane.movementDir < 45) {
    hDir = "NNE"
  } else if (cane.movementDir < 67.5) {
    hDir = "NE"
  } else if (cane.movementDir < 90) {
    hDir = "ENE"
  } else if (cane.movementDir < 112.5) {
    hDir = "E"
  } else if (cane.movementDir < 135) {
    hDir = "ESE"
  } else if (cane.movementDir < 157.5) {
    hDir = "SE"
  } else if (cane.movementDir < 180) {
    hDir = "SSE"
  } else if (cane.movementDir < 202.5) {
    hDir = "S"
  } else if (cane.movementDir < 225) {
    hDir = "SSW"
  } else if (cane.movementDir < 247.5) {
    hDir = "SW"
  } else if (cane.movementDir < 270) {
    hDir = "WSW"
  } else if (cane.movementDir < 292.5) {
    hDir = "W"
  } else if (cane.movementDir < 315) {
    hDir = "WNW"
  } else if (cane.movementDir < 337.5) {
    hDir = "NW"
  } else if (cane.movementDir < 360) {
    hDir = "NNW"
  } else {
    hDir = "N"
  }
  
  // NEW: Trigger Map Auto-Zoom to level 7
  // The map instance is attached to the marker in google-maps-react
  const mapInstance = marker.map || (marker.getMap && marker.getMap());
  if (mapInstance) {
    mapInstance.setZoom(7);
  }

  // NEW: Native KML Layer Management (Bypass React Wrapper)
  // 1. Clear any existing KML layer from the map
  if (this.activeKmlLayer) {
    this.activeKmlLayer.setMap(null);
    this.activeKmlLayer = null;
  }
  // 2. If it's a NOAA storm with a KMZ, draw it using native Google Maps API
  const isNOAA = cane.initialWindExtent && cane.initialWindExtent.kmzFile;
  if (isNOAA && mapInstance && window.google) {
    this.activeKmlLayer = new window.google.maps.KmlLayer({
      url: cane.initialWindExtent.kmzFile,
      map: mapInstance,
      preserveViewport: true, // Prevents Google from overriding our zoom level 7
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
    recenterGPS: {lat: cane.latitudeNumeric, lng: cane.longitudeNumeric},
    selectedStorm: cane // NEW: Store full storm object to trigger polygon rendering
  })
  }
//handle storm history focus
  handleHistClick = (props, marker, e) => {
    const hStorm = this.props.hist_reports.find(r => r.id === props.name);
    if (!hStorm) return;

    this.setState({
      showInfo: false, 
      selectedStorm: null,
      showHistInfo: true
    });

    this.startHistoryPlayback(hStorm);
  }

  onMapClick = (props) => {
    if (this.state.showInfo) {
      this.setState({
        showInfo: false
      })
    }
  }
  startHistoryPlayback = (storm) => {
    const allCoords = storm.segments.flatMap(seg => seg.coordinates);
    
    // Create the box and stretch it
    const bounds = new this.props.google.maps.LatLngBounds();
    allCoords.forEach(coord => {
      bounds.extend(new this.props.google.maps.LatLng(coord[0], coord[1]));
    });

    this.setState({
      selectedHistStorm: storm,
      histSegmentIndex: 0,
      histSubStep: 0,
      mapBounds: bounds // Save the box to state
    });

    if (this.histInterval) clearInterval(this.histInterval);

    this.histInterval = setInterval(() => {
      if (!this._isMounted) return;

      this.setState(prevState => {
        if (!prevState.selectedHistStorm) {
          clearInterval(this.histInterval);
          return null;
        }

        const maxSegments = prevState.selectedHistStorm.segments.length;
        
        let nextSubStep = prevState.histSubStep + 1;
        let nextSegIndex = prevState.histSegmentIndex;

        // Roll over to the next segment after step 2
        if (nextSubStep > 2) {
          nextSubStep = 0;
          nextSegIndex += 1;
        }

        if (nextSegIndex < maxSegments) {
          return { histSegmentIndex: nextSegIndex, histSubStep: nextSubStep };
        } else {
          clearInterval(this.histInterval);
          return null;
        }
      });
    }, 1500); // Speed up tick rate for the 3-step flow
  }

  stopHistoryPlayback = () => {
    if (this.histInterval) clearInterval(this.histInterval);
    this.setState({
      selectedHistStorm: null,
      histSegmentIndex: 0,
      histSubStep: 0,
      mapBounds: null // Release the camera back to normal zoom
    });
  }

  getHistIcon = (status) => {
    let iconUrl = caneS;
    let anchorPoint = this.props.google ? new this.props.google.maps.Point(12, 12) : null;

    if (status === 'Hurricane') {
      iconUrl = caneL; // 48x48
      anchorPoint = this.props.google ? new this.props.google.maps.Point(24, 24) : null;
    } else if (status === 'Tropical Storm') {
      iconUrl = caneM; // 32x32
      anchorPoint = this.props.google ? new this.props.google.maps.Point(16, 16) : null;
    } else if (status === 'Low') {
      iconUrl = caneLow; // 16x16
      anchorPoint = this.props.google ? new this.props.google.maps.Point(8, 8) : null;
    }

    return {
      url: iconUrl,
      anchor: anchorPoint
    };
  }

  getSafeCenter = () => {
    // Check our local recenter state first, fallback to the prop
    const target = this.state.recenterGPS || this.props.gps;
    
    if (target && target.lat !== undefined && target.lng !== undefined) {
      const safeLat = parseFloat(target.lat);
      const safeLng = parseFloat(target.lng);
      
      if (!isNaN(safeLat) && !isNaN(safeLng)) {
        return { lat: safeLat, lng: safeLng };
      }
    }
    
    // Absolute fallback if everything fails (Gulf of Mexico)
    return { lat: 24.6405, lng: -93.9520 };
  }
  // this shows a map with tropical cyclones reports as markers on map
  // each report item from store is mapped to a marker on map based on gps data received from NHC
  // details of the cyclone is displayed via a infowindow when the marker is clicked
  // initialCenter is to set map center when map is initially loaded based on US location
  // center is to set the map center when map is recentered by a user click
  // Added new code to plot hurricane past and future tracks on the map 7/2/2026
  // Added new code to plot hurricane future path uncertainty cone on the map  7/14/2026
render() {
  // Determine if active storms should be visible
  console.log("CONE DATA SHAPE:", this.props.conePolygons);
  const showActive = !this.props.hist_reports || this.props.hist_reports.length === 0;

  const formatShortDate = (isoString) => {
    if (!isoString) return "Unknown";
    const d = new Date(isoString);
    // Outputs: "Sep 5, 19:58"
    return d.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute:'2-digit', 
      hour12: false 
    });
  };
    return (
      <Map 
        google={this.props.google} 
        zoom={this.state.currentZoom} // UPDATED 
        initialCenter={this.getSafeCenter()} 
        center={this.state.recenterGPS} 
        bounds={this.state.mapBounds || undefined}
        onClick={(mapProps, map, clickEvent) => {
          if (this.state.showInfo || this.state.selectedStorm) {
            this.setState({ showInfo: false, selectedStorm: null });
          }
          if (this.state.showHistInfo || this.state.selectedHistStorm) {
            this.setState({ showHistInfo: false, selectedHistStorm: null });
          }
        }}
      onZoomChanged={this.handleZoomChanged} // NEW
      onIdle={this.handleMapIdle}            // NEW 
      >
      {/* ========================================== */}
        {/* PHASE 0: ACTIVE STORM TELEMETRY            */}
        {/* ========================================== */}
        
        {/* Forecast Cone Boundary Shading */}
        {(!this.props.hist_reports || this.props.hist_reports.length === 0) && this.props.c_reports && this.props.c_reports.map(r => {
          const conePath = this.props.conePolygons ? this.props.conePolygons[r.id] : null;
          if (!conePath || conePath.length < 3) return null; // Safe guard for truncated 1-point arrays
          
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
        {showActive && this.props.c_reports && this.props.c_reports.map((r, index) => {
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
          
          const isPlaying = this.state.selectedHistStorm !== null;
          
          // If THIS storm is playing, completely hide its static gray track 
          // because the Phase 2 colored playback track replaces it.
          if (isPlaying && this.state.selectedHistStorm.id === storm.id) return null;

          // If another storm is playing, drop this one to 5% opacity. If nothing is playing, 40%.
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
        {/* The !this.state.selectedHistStorm gate instantly hides all static markers during playback */}
        {!showActive && !this.state.selectedHistStorm && this.props.hist_reports && this.props.hist_reports.map(storm => {
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

        {/* 3. HISTORICAL ISOLATED TRACK (3-Step Trailing Animation) */}
        {this.state.selectedHistStorm && this.state.selectedHistStorm.segments.slice(0, this.state.histSegmentIndex + 1).map((seg, idx) => {
          
          let coordsToDraw = seg.coordinates;
          
          // Apply the "halfway ahead" plotting rule for the active segment
          if (idx === this.state.histSegmentIndex) {
            const midIndex = Math.floor(seg.coordinates.length / 2);
            if (this.state.histSubStep === 0) {
              coordsToDraw = seg.coordinates.slice(0, midIndex + 1);
            } else if (this.state.histSubStep === 1 || this.state.histSubStep === 2) {
              coordsToDraw = seg.coordinates; 
            }
          }

          const path = coordsToDraw.map(c => ({ lat: c[0], lng: c[1] }));
          
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
              key={`hist-track-${this.state.selectedHistStorm.id}-${idx}`}
              path={path}
              strokeColor={trackColor}
              strokeOpacity={0.8}
              strokeWeight={weight}
              clickable={false}
            />
          );
        })}

        {/* 4. THE PLAYHEAD MARKER (3-Step Movement) */}
        {this.state.selectedHistStorm && (() => {
          const currentSeg = this.state.selectedHistStorm.segments[this.state.histSegmentIndex];
          const coords = currentSeg.coordinates;
          const midIndex = Math.floor(coords.length / 2);
          
          let currentCoord = coords[0];
          
          if (this.state.histSubStep === 1) {
            currentCoord = coords[midIndex];
          } else if (this.state.histSubStep === 2) {
            currentCoord = coords[coords.length - 1];
          }
          
          return (
            <Marker
              key={`playhead-${this.state.selectedHistStorm.id}-${this.state.histSegmentIndex}-${this.state.histSubStep}`}
              position={{ lat: currentCoord[0], lng: currentCoord[1] }}
              icon={this.getHistIcon(currentSeg.status)}
              clickable={false} 
            />
          );
        })()}

      {/* DYNAMIC COVERAGE LAYER (Wind Radii) */}
      {(!this.props.hist_reports || this.props.hist_reports.length === 0) && (() => {
        const storm = this.state.selectedStorm;
        
        // 1. THE CRASH PREVENTER: Abort if the state is emptying out
        if (!storm) return null; 

        const isNOAA = storm?.initialWindExtent?.kmzFile;
        if (isNOAA) return null;

        const lat = storm.latitudeNumeric || parseFloat(storm.latitude);
        const lng = storm.longitudeNumeric || parseFloat(storm.longitude);
        const rings = getEstimatedWindRadii(storm.intensity);

        return rings.map((ring) => (
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

        {/* NEW: Wind Vectors Layer */}
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
      {this.state.showInfo && (() => {
        const storm = this.state.selectedStorm;
        
        // 2. THE CRASH PREVENTER: Abort if the state is emptying out
        if (!storm) return null; 

        return (
        
        <InfoWindow
          marker={this.state.hMarker}
          visible={this.state.showInfo && (!this.props.hist_reports || this.props.hist_reports.length === 0)}
          onClose={() => this.setState({ showInfo: false, selectedStorm: null })}
        >
          {this.state.selectedStorm ? (
            <div style={{ width: '240px', padding: '4px', fontFamily: 'system-ui, sans-serif' }}>
              <h3 style={{ margin: '0 0 8px 0', paddingBottom: '6px', borderBottom: '1px solid #ddd', fontSize: '16px' }}>
                {this.state.caneName} <br/>
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
        )
    })()}
        {/* HISTORICAL STORM INFOWINDOW (Static Position, Dynamic Content) */}
        <InfoWindow
          position={(() => {
            if (!this.state.selectedHistStorm) return { lat: 0, lng: 0 };
            const segs = this.state.selectedHistStorm.segments;
            const lastSeg = segs[segs.length - 1];
            const lastCoord = lastSeg.coordinates[lastSeg.coordinates.length - 1];
            return { lat: lastCoord[0], lng: lastCoord[1] };
          })()}
          visible={this.state.showHistInfo && this.props.hist_reports && this.props.hist_reports.length > 0}
          onClose={() => {
            this.setState({ showHistInfo: false });
            this.stopHistoryPlayback();
          }}
        >
          {this.state.selectedHistStorm ? (() => {
            const hStorm = this.state.selectedHistStorm;
            
            const currentSeg = hStorm.segments[this.state.histSegmentIndex];
            const coords = currentSeg.coordinates;
            const midIndex = Math.floor(coords.length / 2);
            
            // 1. Identify exactly which coordinate array the marker is on
            let currentCoord = coords[0];
            if (this.state.histSubStep === 1) {
              currentCoord = coords[midIndex];
            } else if (this.state.histSubStep === 2) {
              currentCoord = coords[coords.length - 1];
            }

            // 2. Extract the enriched data! (Fallback to segment defaults if stitched)
            const liveWind = currentCoord[2] !== undefined ? currentCoord[2] : currentSeg.windSpeed;
            const liveDateStr = currentCoord[3] !== undefined ? currentCoord[3] : currentSeg.startDate;
            
            const currentDate = liveDateStr 
              ? new Date(liveDateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit', hour12: false })
              : "Unknown";

            // Find absolute max wind for historical context
            let maxWind = 0;
            hStorm.segments.forEach(seg => {
              if (seg.windSpeed > maxWind) maxWind = seg.windSpeed;
            });

            return (
              <div style={{ width: '240px', padding: '4px', fontFamily: 'system-ui, sans-serif' }}>
                <h3 style={{ margin: '0 0 8px 0', paddingBottom: '6px', borderBottom: '1px solid #ddd', fontSize: '16px' }}>
                  {hStorm.name} <br/>
                  <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#555' }}>
                    {hStorm.basin === 'NA' ? 'Atlantic' : hStorm.basin === 'EP' ? 'Eastern Pacific' : 'Western Pacific'} Basin
                  </span>
                </h3>

                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' }}>
                  <span style={{ fontWeight: '600', color: '#555' }}>Current Status:</span>
                  <span>{currentSeg.status}</span>
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

      </Map>
    );
  }
}
// api key in .env file
export default GoogleApiWrapper({
  apiKey: process.env.REACT_APP_GOOGLE_API_KEY
})(withRouter(MapCaneReports))