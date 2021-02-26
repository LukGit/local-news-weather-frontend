import React, { Component } from 'react';
import { connect } from 'react-redux';
import Navbar from './Navbar';
import MapReports from './MapReports'
import { addReport } from '../actions'
import { Label, Icon, Menu, Dropdown, Checkbox, Modal, Button, Header, Item, Divider } from 'semantic-ui-react'

class Reports extends Component {
  state = {
    poopSizeSelect: "",
    filterReports: [],
    largeOnly: false,
    sizeFilter: "All",
    poopSize: [
      {key: 1, text: "Small", value: "S"},
      {key: 2, text: "Medium", value: "M"},
      {key: 3, text: "Large", value: "L"},
      {key: 4, text: "All", value: "All"}
    ],
    weather: "",
    weatherIcon: "",
    forecast: "",
    forecastIcon: "",
    hourLine1: "",
    hourLine2: ""
  }

  componentDidMount () {
    // filter to show only reports in the same zip code
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
    const Q_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&eventtype=earthquake&minmagnitude=4&starttime" + dateString1 + "&&endtime=" + dateString
    fetch(Q_URL)
    .then(resp => resp.json())
    .then(quakeResp => {
      this.props.addReport(quakeResp.features)
    })

    // let filterR = []
    // filterR = this.props.reports.filter(r => r.poopzip === this.props.user.zipcode)
    this.setState({
      centerGPS: this.props.gps,
      filterReports: this.props.reports,
      sizeFilter: "All"
    })
  }

  selectSize = (e, { value }) => {
    let filterX = []
    if (this.state.myZipOnly) {
      filterX = this.props.reports.filter(r => r.poopzip === this.props.user.zipcode)
    } else {
      filterX = this.props.reports
    }
    let filterS = []
    if (value === "All") {
      filterS = filterX
    } else {
      // let filterS = this.props.reports.filter(r => r.poopzip === this.props.user.zipcode)
      filterS = filterX.filter(r => r.poop_size === value)
    }
    this.setState({
      filterReports: filterS,
      sizeFilter: value
    })
  }

  handleLargeOnly = (e, { checked }) => {
    let filterX = []
    if (checked) {
      filterX = this.props.reports.filter(r => r.properties.mag > 6)
    } else {
      filterX = this.props.reports
    }
    this.setState({
      largeOnly: checked,
      filterReports: filterX
    })
  }

  getWeather = (zip) => {
    const W_URL = "https://api.weatherapi.com/v1/forecast.json?key=0def2099dc364881957133838202806&days=2&q=" + zip
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
        {this.props.reports.length > 0 ? " Here Are The Eqrthquakes in the last 24hrs" : "No Earthquake In Last 24hrs!"}
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
        {/* {this.props.reports.length > 0 ?
        <Menu.Item>
        <Dropdown 
              fluid
              selection
              search
              onChange={this.selectSize}
              options={this.state.poopSize}
              style={{width: 100}}
              size='medium'
              placeholder='Filter by size'
          /> 
        </Menu.Item> : null} */}

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
            <Header size='small'>Your Neighborhood Weather and Forecast</Header>
            <Header size='tiny'>Current Condition</Header>
            <Item>
              <Item.Image src={this.state.weatherIcon} size="tiny" />
            </Item>
            <Label>{this.state.weather}</Label> 
            <Header size='tiny'>Tomorrow's Forecast</Header>
            <Item>
              <Item.Image src={this.state.forecastIcon} size="tiny" />
            </Item>
            <Label>{this.state.forecast}</Label>
            <Divider horizontal hidden ></Divider>
            <Header size='small'>Hourly Forecast</Header>
            <Label>{this.state.hourLine1}</Label>
            <Divider horizontal hidden ></Divider>
            <Label>{this.state.hourLine2}</Label>
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
