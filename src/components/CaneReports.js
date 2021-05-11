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
    hourLine2: ""
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
    fetch(H_URL)
    .then(resp => resp.json())
    .then(caneResp => {
      this.props.addCaneReport(caneResp.activeStorms)
      this.setState({
        centerGPS: this.props.gps,
        filterHtsReports: this.props.c_reports,
        sizeFilter: "All"
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

  getWeather = (zip) => {
    // api key in .env file
    const W_URL = "https://api.weatherapi.com/v1/forecast.json?key=" + process.env.REACT_APP_WEATHER_API_KEY + "&days=2&q=" + zip
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
    if (!this.props.user.user){
      this.props.history.push('/login')
      return null
    }
    return (
      <div>
        <Navbar/>
        <Menu inverted color='grey' size='mini'>
        <Menu.Item>
        <Label size='large' color='grey'> 
        <Icon name='lightning'/>
        {this.props.c_reports.length > 0 ? " Active cyclones" : "No active cyclones!"}
        </Label> 
        </Menu.Item>
        {this.props.c_reports.length > 0 ?
        <Menu.Item>
          <Popup content='Show only hurricanes and tropical storms' trigger={<Checkbox 
              checked={this.state.htsOnly}
              label='Hurricanes/TS'
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
        <MapCaneReports c_reports={this.state.filterHtsReports} gps={this.props.user.gps}/>
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