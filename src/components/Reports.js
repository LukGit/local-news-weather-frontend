import React, { Component } from 'react';
import { connect } from 'react-redux';
import Navbar from './Navbar';
import MapReports from './MapReports'
import { addReport } from '../actions'
import { Label, Icon, Menu, Checkbox, Modal, Button, Item } from 'semantic-ui-react'

class Reports extends Component {
  state = {
    poopSizeSelect: "",
    filterReports: [],
    largeOnly: false,
    sizeFilter: "All",
    weather: "",
    weatherIcon: "",
    forecast: "",
    forecastIcon: "",
    hourLine1: "",
    hourLine2: ""
  }

  componentDidMount () {
    // fetch earthquake data from USGS
    const date = new Date()
    let d = date.getDate();
    let m = date.getMonth() + 1;
    let y = date.getFullYear();
    const dateString =  y + '-' + (m <= 9 ? '0' + m : m) + '-' + (d <= 9 ? '0' + d : d)
    date.setDate(date.getDate() - 1)
    d = date.getDate();
    m = date.getMonth() + 1;
    y = date.getFullYear();
    const dateString1 =  y + '-' + (m <= 9 ? '0' + m : m) + '-' + (d <= 9 ? '0' + d : d)
    const Q_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=" + dateString1 + "&&endtime=" + dateString + "&eventtype=earthquake&minmagnitude=4"
    console.log("quake url", Q_URL)
    fetch(Q_URL)
    .then(resp => resp.json())
    .then(quakeResp => {
      this.props.addReport(quakeResp.features)
    })

    this.setState({
      centerGPS: this.props.gps,
      filterReports: this.props.reports,
      sizeFilter: "All"
    })
  }

  handleLargeOnly = (e, { checked }) => {
    let filterX = []
    if (checked) {
      filterX = this.props.reports.filter(r => r.properties.mag > 7)
    } else {
      filterX = this.props.reports
    }
    this.setState({
      largeOnly: checked,
      filterReports: filterX
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
        <Icon name='hand point down'/>
        {this.props.user.user}, 
        {this.props.reports.length > 0 ? " Here are the significant eqrthquakes in the last 24hrs" : "No Earthquake In Last 24hrs!"}
        </Label> 
        </Menu.Item>
        {this.props.reports.length > 0 ?
        <Menu.Item>
          <Checkbox 
              checked={this.state.largeOnly}
              label='Large quake only'
              onClick={this.handleLargeOnly}
          /> 
          </Menu.Item> : null}
        
        <Modal size='tiny' trigger={<Menu.Item>
          <Button animated='fade' 
          onClick={() => this.getWeather(`${this.props.user.zipcode}`)} size='medium' floated='right' inverted color="grey">
            <Button.Content visible>
              <Icon name='sun'/>
              </Button.Content>
            <Button.Content hidden>
            Weather
            </Button.Content>
          </Button></Menu.Item>} closeIcon>
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
        <MapReports reports={this.state.filterReports} zipcode={this.props.user.zipcode} gps={this.props.user.gps}/>
      </div>
    )
  }
}

const mapStateToProps = state => {
  return { 
    reports: state.reports,
    user: state.users
   }
}

export default connect(mapStateToProps, { addReport })(Reports)
