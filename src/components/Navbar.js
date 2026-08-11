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
      <Menu id="menu-head" color="teal" size="mini" inverted style={{ margin: 0, borderRadius: 0, flexShrink: 0, minHeight: 'auto'}}>
        <Menu.Item style={{ paddingTop: '8px', paddingBottom: '8px' }}>
          <Link to={'/reports'} className="item" style={{ fontSize: '1.0rem' }}>
            Earthquakes
          </Link>
        </Menu.Item>
        <Menu.Item style={{ paddingTop: '8px', paddingBottom: '8px' }}>
          <Link to={'/hurricanes'} className="item" style={{ fontSize: '1.0rem' }}>
            Hurricanes
          </Link>
        </Menu.Item>
        <Menu.Item style={{ paddingTop: '8px', paddingBottom: '8px' }}>
          <Link to={'/wildfires'} className="item" style={{ fontSize: '1.0rem' }}>
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