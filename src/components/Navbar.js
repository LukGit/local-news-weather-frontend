import React, { Component } from 'react';
import { Link } from 'react-router-dom'
import { connect } from 'react-redux';
//import { logoutUser } from '../actions';
import { withRouter } from 'react-router-dom'
import { Menu } from 'semantic-ui-react'


class Navbar extends Component {
  state = {
    reportList:[],
    courseName: ""
  }
  
  componentDidMount () {
    
  }

  render() {
    return (
      <Menu inverted color='brown' size='mini'>
        <Menu.Item >
          <Link to={'/reports'} className="item">
            Earthquakes
          </Link>
        </Menu.Item>
        <Menu.Item >
          <Link to={'/hurricanes'} className="item">
            Hurricanes
          </Link>
        </Menu.Item>
        <Menu.Item >
          <Link to={'/wildfires'} className="item">
            Wildfires
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
export default connect(mapStateToProps)(withRouter(Navbar))