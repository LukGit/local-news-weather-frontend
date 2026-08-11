import React, { Component } from 'react';
import { connect } from 'react-redux';
import Navbar from './Navbar';
import MapCaneReports from './MapCaneReports'
import { addCaneReport } from '../actions'
import { Label, Icon, Menu, Checkbox, Modal, Button, Item, Popup } from 'semantic-ui-react'

class CaneReports extends Component {
  state = {
    poopSizeSelect: "",
    filterHtsReports: [],
    htsOnly: false,
    sizeFilter: "All",
    weather: "",
    weatherIcon: "",
    forecast: "",
    forecastIcon: "",
    hourLine1: "",
    hourLine2: "",
    // New states to hold path arrays mapped by storm ID
    pastTracks: {},
    futureTracks: {},
    conePolygons: {}
  } 
  // Helper method to compute the layer offsets from the NOAA identifier
  getLayerNumFromStormId = (stormId, type) => {
    const basin = stormId.substring(0, 2).toUpperCase();
    const stormNum = parseInt(stormId.substring(2, 4), 10);

    const basinBaselines = {
      AT: 6,    // Atlantic
      EP: 136,  // East Pacific
      CP: 266   // Central Pacific
    };

    const startLayer = basinBaselines[basin];
    if (!startLayer) return null;

    const stormBlockStart = startLayer + ((stormNum - 1) * 26);
    
    if (type === 'future') return stormBlockStart + 1;
    if (type === 'past') return stormBlockStart + 6;
    if (type === 'cone') return stormBlockStart + 7; // Cone is offset +7
    return null;
  };

  // Dedicated dynamic fetch pipeline for tracks and cones
  fetchStormTracks = (storms) => {
    // 1. Fetch Cones Globally from the verified Summary Layer
    const globalConeUrl = `https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather_summary/MapServer/7/query?where=1%3D1&outFields=*&f=geojson`;
    
    fetch(globalConeUrl)
      .then(res => res.json())
      .then(geojsonData => {
        if (!geojsonData.features) return;

        // 2. Loop through active storms and map them to NOAA's dynamic "bin" slots
        storms.forEach(storm => {
          let targetBin = storm.id; // Fallback to raw ID (e.g., "ep062026")

          // Find this storm in the global cone layer
          const matchingFeature = geojsonData.features.find(feature => {
            const fileDateStr = feature.properties.idp_source || "";
            return fileDateStr.toLowerCase().includes(storm.id.toLowerCase()) || 
                   (feature.properties.stormid && feature.properties.stormid.toLowerCase() === storm.id.toLowerCase());
          });

          if (matchingFeature) {
            // Process and save the Cone Polygon
            if (matchingFeature.geometry?.coordinates) {
              const rawCoordinates = matchingFeature.geometry.coordinates[0];
              const cleanCoords = rawCoordinates.map(coord => ({ lat: coord[1], lng: coord[0] }));
              
              this.setState(prevState => ({
                conePolygons: { ...prevState.conePolygons, [storm.id]: cleanCoords }
              }));
            }
            
            // CRITICAL FIX: Extract the actual NOAA active map slot (e.g., "EP1", "AT2")
            if (matchingFeature.properties.binnumber) {
              targetBin = matchingFeature.properties.binnumber; 
            }
          }

          // 3. Fetch Line Tracks using targetBin (EP1 calculates to Layer 142 instead of 272!)
          const pastLayer = this.getLayerNumFromStormId(targetBin, 'past');
          const futureLayer = this.getLayerNumFromStormId(targetBin, 'future');

          // Helper to parse multiple segments and flatten them into ONE continuous array
          const parseTrackFeatures = (features) => {
            if (!features || !features.length) return [];
            return features.flatMap(feature => {
              if (!feature.geometry || !feature.geometry.coordinates) return [];
              
              const coords = feature.geometry.coordinates;
              const type = feature.geometry.type;

              if (type === "LineString") {
                return coords.map(c => ({ lat: c[1], lng: c[0] }));
              }
              if (type === "MultiLineString") {
                return coords.flat().map(c => ({ lat: c[1], lng: c[0] }));
              }
              return [];
            });
          };

          if (pastLayer) {
            const pastUrl = `https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather/MapServer/${pastLayer}/query?where=1%3D1&outFields=*&f=geojson`;
            fetch(pastUrl)
              .then(res => res.json())
              .then(trackData => {
                if (trackData.features && trackData.features.length > 0) {
                  this.setState(prevState => ({
                    // Store the flattened coordinates using the original storm.id
                    pastTracks: { ...prevState.pastTracks, [storm.id]: parseTrackFeatures(trackData.features) }
                  }));
                }
              }).catch(err => console.error(err));
          }

          if (futureLayer) {
            const futureUrl = `https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather/MapServer/${futureLayer}/query?where=1%3D1&outFields=*&f=geojson`;
            fetch(futureUrl)
              .then(res => res.json())
              .then(trackData => {
                if (trackData.features && trackData.features.length > 0) {
                  this.setState(prevState => ({
                    futureTracks: { ...prevState.futureTracks, [storm.id]: parseTrackFeatures(trackData.features) }
                  }));
                }
              }).catch(err => console.error(err));
          }
        });
      })
      .catch(err => console.error("Error fetching global storm forecast cones:", err));
  }

  componentDidMount () {
    // fetch hurricane data from NOAA
    // test data API is https://www.nhc.noaa.gov/productexamples/NHC_JSON_Sample.json
    // real data site is https://www.nhc.noaa.gov/CurrentStorms.json
    const H_URL = "https://www.nhc.noaa.gov/CurrentStorms.json"
    // const H_URL = "https://www.nhc.noaa.gov/productexamples/NHC_JSON_Sample.json"
    // this fetch has a CORS problem because of the end point
    // this is circumvented using Moesif Origin & CORS Changer which is a plugin that allows you to send cross-domain requests. 
    // You can also override Request Origin and CORS headers. 
    // This must be turned on. Make sure blue on flag is shown on extension bar
    // Added hurricane track fetch to plot past and future tracks. 7/2/2026
    fetch(H_URL)
    .then(resp => resp.json())
    .then(caneResp => {
      this.props.addCaneReport(caneResp.activeStorms)
      this.setState({
        centerGPS: this.props.gps,
        filterHtsReports: this.props.c_reports,
        sizeFilter: "All"
      }, () => {
        // Kick off track downloads immediately once active storms load into state
        this.fetchStormTracks(caneResp.activeStorms);
        
      })
    })
  }

  handleHtsOnly = (e, { checked }) => {
    let filterX = []
    if (checked) {
      filterX = this.props.c_reports.filter(r => r.classification === "HU" || r.classification === "TS")
    } else {
      filterX = this.props.c_reports
    }
    this.setState({
      htsOnly: checked,
      filterHtsReports: filterX
    })
  }

  getWeather = () => {
    // Grab GPS coordinates from Redux state (or fallback)
    const gps = this.props.user.gps || { lat: 22.3193, lng: 114.1694 };
  
    // Format location string as "latitude,longitude"
    const locationParam = `${gps.lat},${gps.lng}`;

    // api key in .env file
    const W_URL = "https://api.weatherapi.com/v1/forecast.json?key=" + 
      process.env.REACT_APP_WEATHER_API_KEY + 
      "&days=2&q=" + locationParam;
    fetch(W_URL)
    .then(resp => resp.json())
    .then(weatherResp => {
      const weather_desc = `Temp: ${weatherResp.current.temp_f}F | ${weatherResp.current.condition.text} | Feels like: ${weatherResp.current.feelslike_f}F |
      Wind: ${weatherResp.current.wind_mph}mph ${weatherResp.current.wind_dir} | Gust: ${weatherResp.current.gust_mph}mph`
      const forecast_desc = `High Temp: ${weatherResp.forecast.forecastday[1].day.maxtemp_f}F | Low Temp: ${weatherResp.forecast.forecastday[1].day.mintemp_f}F | ${weatherResp.forecast.forecastday[1].day.condition.text} | 
      Rain Chance: ${weatherResp.forecast.forecastday[1].day.daily_chance_of_rain}% | Snow Chance: ${weatherResp.forecast.forecastday[1].day.daily_chance_of_snow}%`
      let d = new Date()
      let n = d.getHours() + 1
      let hourLine1 = ""
      let hourLine2 = ""
      if (n < 23) {
        hourLine1 = `${weatherResp.forecast.forecastday[0].hour[n].time} - Temp: ${weatherResp.forecast.forecastday[0].hour[n].temp_f}F | 
        ${weatherResp.forecast.forecastday[0].hour[n].condition.text} | Feels like: ${weatherResp.forecast.forecastday[0].hour[n].feelslike_f}F`
        hourLine2 = `${weatherResp.forecast.forecastday[0].hour[n + 1].time} - Temp: ${weatherResp.forecast.forecastday[0].hour[n + 1].temp_f}F | 
        ${weatherResp.forecast.forecastday[0].hour[n + 1].condition.text} | Feels like: ${weatherResp.forecast.forecastday[0].hour[n + 1].feelslike_f}F`
      } else if (n === 23) {
        hourLine1 = `${weatherResp.forecast.forecastday[0].hour[n].time} - Temp: ${weatherResp.forecast.forecastday[0].hour[n].temp_f}F | 
        ${weatherResp.forecast.forecastday[0].hour[n].condition.text} | Feels like: ${weatherResp.forecast.forecastday[0].hour[n].feelslike_f}F`
        hourLine2 = `${weatherResp.forecast.forecastday[1].hour[0].time} - Temp: ${weatherResp.forecast.forecastday[1].hour[0].temp_f}F | 
        ${weatherResp.forecast.forecastday[1].hour[0].condition.text} | Feels like: ${weatherResp.forecast.forecastday[1].hour[0].feelslike_f}F`
      } else {
        hourLine1 = `${weatherResp.forecast.forecastday[1].hour[0].time} - Temp: ${weatherResp.forecast.forecastday[1].hour[0].temp_f}F | 
        ${weatherResp.forecast.forecastday[1].hour[0].condition.text} | Feels like: ${weatherResp.forecast.forecastday[1].hour[0].feelslike_f}F`
        hourLine2 = `${weatherResp.forecast.forecastday[1].hour[1].time} - Temp: ${weatherResp.forecast.forecastday[1].hour[1].temp_f}F | 
        ${weatherResp.forecast.forecastday[1].hour[1].condition.text} | Feels like: ${weatherResp.forecast.forecastday[1].hour[1].feelslike_f}F`
      }
      this.setState({
        weather: weather_desc,
        forecast: forecast_desc,
        weatherIcon: weatherResp.current.condition.icon,
        forecastIcon: weatherResp.forecast.forecastday[1].day.condition.icon,
        hourLine1: hourLine1,
        hourLine2: hourLine2
      })
    })
  }
  // this shows the NavBar and the MapReports which is also passed the report items to display on map
  render() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
        <Navbar/>
        <Menu inverted color='grey' size='mini' style={{ margin: 0, borderRadius: 0, flexShrink: 0, minHeight: 'auto'}}>
        <Menu.Item>
        <Label size='large' color='orange'> 
        <Icon name='lightning'/>
        {this.props.c_reports.length > 0 ? ` Active cyclones: ${this.props.c_reports.length}` : "No active cyclones!"}
        </Label> 
        </Menu.Item>
        {this.props.c_reports.length > 0 ?
        <Menu.Item>
          <Popup content='Show only hurricanes and tropical storms' trigger={<Checkbox 
              toggle
              checked={this.state.htsOnly}
              label={{ children: 'Hurricanes/Tropical Storms Only', style: { color: 'white' } }}
              onClick={this.handleHtsOnly}
          /> } />
          </Menu.Item> : null}
        
        <Modal size='tiny' trigger={<Menu.Item>
          <Popup content='See local weather forecast' trigger={
          <Button animated='fade' 
          onClick={() => this.getWeather(`${this.props.user.zipcode}`)} size='medium' floated='right' inverted color="grey">
            <Button.Content visible>
              <Icon name='sun'/>
              </Button.Content>
            <Button.Content hidden>
            Weather
            </Button.Content>
          </Button>} /></Menu.Item>} closeIcon>
          <Modal.Content>
            <Item.Group>
              <Item>
              <Item.Content>
                <Item.Header>Your Neighborhood Weather and Forecast</Item.Header>
              </Item.Content>
              </Item>
            <Item>
              <Item.Content>
                <Item.Header>Current Condition</Item.Header>
                <Item.Image src={this.state.weatherIcon} size="tiny" /> 
                <Item.Content>{this.state.weather}</Item.Content> 
              </Item.Content>
            </Item>
            <Item>
              <Item.Content>
                <Item.Header>Tomorrow's Forecast</Item.Header>
                <Item.Image src={this.state.forecastIcon} size="tiny" /> 
                <Item.Content>{this.state.forecast}</Item.Content> 
              </Item.Content>
            </Item>
            <Item>
              <Item.Content>
                <Item.Header>Hourly Forecast</Item.Header> 
                <Item.Content>{this.state.hourLine1}</Item.Content> 
                <Item.Content>{this.state.hourLine2}</Item.Content>
              </Item.Content>
            </Item>
            </Item.Group>
          </Modal.Content>
        </Modal>

        </Menu>
        {/* Pass the track state records down via props to the map layout */}
        <div style={{ flex: 1, position: 'relative', width: '100%' }}>
        <MapCaneReports 
          c_reports={this.state.filterHtsReports} 
          gps={this.props.user.gps}
          pastTracks={this.state.pastTracks}
          futureTracks={this.state.futureTracks}
          conePolygons={this.state.conePolygons}
        />
        </div>
      </div>
    )
  }
}

const mapStateToProps = state => {
  return { 
    c_reports: state.c_reports,
    user: state.users
   }
}

export default connect(mapStateToProps, { addCaneReport })(CaneReports)