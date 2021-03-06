# The Natual Disaster Tracker
![alt text](https://user-images.githubusercontent.com/60716393/110066453-18f03200-7d37-11eb-98a1-41b4847b70fb.png)
This is an app for users to have a quick glance of natual disasters around the globe. The earthquake button displays a page that shows significant earthquakes witin the past 24hrs, accroding to data from US Geological Survey (USGS). A map displays icons of various sizes representing quakes of various magnitudes. Only quakes with magnitude over 4 are displayed. When user clicks on the quake marker, it will show the detail information of the quake. The hurricane button displays a page that shows active tropical cyclones, according data from National Hurricane Center. A map displays icons of cyclones of various classifications, from hurricanes to tropical depressions. When clicking on the hurricane marker, it will show the details information of the cyclone.

## Technical information

The app's frontend is built in JavaScript with React/Redux framework. The backend is Ruby on Rails with a PostgreSQL DB. All map rendering is done using Google Maps React. JSON web token is also implemented for user authentication. Styling is impleneted using Sematic UI React with some CSS. 

## General operation

Once logged in, users are greeted with a local map showing markers respresenting the earthquake locations around the world. Map is automatically centered based on the registered zipcode of the user. A pop-up info window is displayed with detail quake information when a map marker is clicked on. The detail pop-up also contain a link to the USGS detail page. Clicking on the link will open a new tab to the event page. When clicking on the hurricane button on the menu bar, user is shown a map with active tropical cyclones. A pop-up infor window is display with detail cyclone information when a map marker is clicked on. The detail pop-up also contains links to advisory and forecast pages on the NOAA site. Clicking on the links will open a new tab to the relevant NOAA pages. User can also check local weather condition and forecast by clicking the weather button.


## Technical Notes

In order to use Google Maps, all components must be first imported from google-map-reacts: 

```javascript
import {Map, InfoWindow, Marker, GoogleApiWrapper } from 'google-maps-react';
```
An API key obtained in your google account must also be specified in the same container where map and its components are used:
```javascript
export default GoogleApiWrapper({
  apiKey: 'your-api-key-from-google'
})(MapContainer)
```
In order to use Sematic UI react, the following must be specified in the index.html file:
```html
<link rel="stylesheet" href="//cdn.jsdelivr.net/npm/semantic-ui@2.4.2/dist/semantic.min.css" />
```

There is a CORS problem with the NPAA end point. This is circumvented using Moesif Origin & CORS Changer which is a plugin that allows you to send cross-domain requests. You can also override Request Origin and CORS headers. The extenion on Chrome must be turned on in order for this to work.

## Extermal API

Earthquake data is obtained from the USGS API site. Use this link: "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2021-02-25&endtime=2021-02-26&eventtype=earthquake&minmagnitude=4"

Hurricane data is obtain from the NOAA API site at: "https://www.nhc.noaa.gov/CurrentStorms.json". 

In order to obtain current weather condition via Weather API, use this link: "https://api.weatherapi.com/v1/forecast.json?key=apikey&q=zip" (substitute apikey with your own key and zip with zip code in decimal)
```
This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
