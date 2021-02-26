import React, { Component } from 'react';
import { Link } from 'react-router-dom'
import { connect } from 'react-redux';
import { logoutUser } from '../actions';
import { withRouter } from 'react-router-dom'
import { Menu } from 'semantic-ui-react'


class Navbar extends Component {
  state = {
    reportList:[],
    courseName: ""
  }
  
  componentDidMount () {
    
  }

  refreshData = () => {
    const reqObj = {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }
    fetch('http://localhost:3000/reports', reqObj)
      .then(resp => resp.json())
      .then(reports => {
        this.props.addReport(reports)
        this.props.history.push('/reports')
      })
  }
  // this handles logout by removing the token in local storage and calling logoutUser in reducer
  handleLogout = (e) => {
    localStorage.removeItem('token')
    this.props.logoutUser()
  }

  render() {
    return (
      <Menu inverted color='brown' size='mini'>
        <Menu.Item position='right'>
          <Link onClick={this.handleLogout}to={'/login'} className="item">
            Sign Out
          </Link>
        </Menu.Item>
      </Menu>
    );
  }
}

const mapStateToProps = state => {
  return {
    user: state.users
  }
}
// withRouter is need to route to reports page because NavBar is not a component under BrowserRouter in App.js
export default connect(mapStateToProps, { logoutUser } )(withRouter(Navbar))