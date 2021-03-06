import React, { Component } from 'react';
import { connect } from 'react-redux';
import { addUser } from '../actions'
import { currentUser } from '../actions'
import { Form, Header, Icon } from 'semantic-ui-react'

class Login extends Component {
  state = {
    username: '',
    password: ''
  }

  componentDidMount () {
    const token = localStorage.getItem('token')
    if(!token) {
      this.props.history.push('/login')
    }else {
      const reqObj = {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
      fetch('http://localhost:3000/current_user', reqObj)
      .then(resp => resp.json())
      .then(user => {
        console.log("current user", user)
        if (user.error) {
          this.props.history.push('/login')
        } else {
          let centerGPS
          const G_URL = "https://maps.googleapis.com/maps/api/geocode/json?key=AIzaSyDAAA0HEZLvUa2hQ-54gAG5TXheH1-pEZY&components=postal_code:" + user.zipcode.toString()
          fetch(G_URL)
          .then(resp => resp.json())
          .then(location => {
            centerGPS = {lat: location.results[0].geometry.location.lat, lng: location.results[0].geometry.location.lng}
            const newUser = {...user, gps: centerGPS}
            this.props.currentUser(newUser)
            this.props.history.push('/reports')
          })
        }
      })
    }
  }

  loginUser = (e) => {
    e.preventDefault()
    const USER_URL = 'http://localhost:3000/users'
    const reqObj = {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({username: this.state.username, password: this.state.password})
    }
    fetch(USER_URL, reqObj)
    .then(resp => resp.json())
    .then(userData => {
      if (userData.error) {
        if (userData.error === "Invalid username"){
          this.props.history.push('/signup')
        } else {
        alert(userData.error)
        }
      }else {
        localStorage.setItem("token", userData.jwt)   
        let centerGPS
        const G_URL = "https://maps.googleapis.com/maps/api/geocode/json?key=AIzaSyDAAA0HEZLvUa2hQ-54gAG5TXheH1-pEZY&components=postal_code:" + userData.zipcode.toString()
        fetch(G_URL)
          .then(resp => resp.json())
          .then(location => {
            centerGPS = {lat: location.results[0].geometry.location.lat, lng: location.results[0].geometry.location.lng}
            const newUser = {...userData, gps: centerGPS}
            this.props.addUser(newUser)
            this.props.history.push('/reports')
          })
      }
    })
  }
  

  handleChange = (event, { name, value }) => {
    this.setState({ [name]: value });
  }

  render() {
    return (
      <div className="login">
      <Header className="pageTitle" as="h1" size="huge" icon inverted>
        <Icon name="lightning"/>
        Welcome To The Natual Disaster Tracker
      </Header>
        <Form onSubmit={this.loginUser}>
        <Form.Group widths='equal' inline >
          <Form.Input name="username" placeholder="User name" onChange={this.handleChange} type='text' value={this.state.username} />
          <Form.Input name="password" placeholder="Password" onChange={this.handleChange} type='password' value={this.state.password} />
          <Form.Input type='submit' value='Login'/>
        </Form.Group>        
       </Form>
       </div>
    )
  }
}

export default connect(null, {addUser, currentUser })(Login)
