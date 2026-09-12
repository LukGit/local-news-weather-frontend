import React, { Component } from 'react';
import { Link } from 'react-router-dom'
import { connect } from 'react-redux';
//import { logoutUser } from '../actions';
import { withRouter } from 'react-router-dom'
import { Menu, Button, Icon, Popup } from 'semantic-ui-react/dist/commonjs'
import TabInfoModal from './TabInfoModal';


class Navbar extends Component {
  state = {
    reportList:[],
    courseName: ""
  }
  
  componentDidMount () {
    
  }

 render() {
    // Grab the current path so the menu knows which tab is active
    const currentPath = window.location.pathname;
    // Map the URL path to the specific tab config string
    let activeTabType = 'earthquake'; // Default fallback
    if (currentPath.includes('/hurricanes')) activeTabType = 'hurricane';
    if (currentPath.includes('/tornadoes')) activeTabType = 'tornado';
    if (currentPath.includes('/wildfires')) activeTabType = 'wildfire';
    if (currentPath.includes('/floods')) activeTabType = 'flood'; // NEW

    return (
      <Menu id="menu-head" color="teal" size="huge" inverted style={{ margin: 0, borderRadius: 0, flexShrink: 0, minHeight: 'auto'}}>
        <Menu.Item 
          as={Link} 
          to="/reports" 
          active={currentPath === '/reports'} 
          color="orange"
        >
          Earthquakes
        </Menu.Item>
        <Menu.Item 
          as={Link} 
          to="/hurricanes" 
          active={currentPath === '/hurricanes'} 
          color="orange"
        >
          Hurricanes
        </Menu.Item>
        <Menu.Item 
          as={Link} 
          to="/tornadoes" 
          active={currentPath === '/tornadoes'} 
          color="orange"
        >
          Tornadoes
        </Menu.Item>
        <Menu.Item 
          as={Link} 
          to="/wildfires" 
          active={currentPath === '/wildfires'} 
          color="orange"
        >
          Wildfires
        </Menu.Item>
        
        {/* NEW: Floods Tab */}
        <Menu.Item 
          as={Link} 
          to="/floods" 
          active={currentPath === '/floods'} 
          color="orange"
        >
          Floods
        </Menu.Item>
          {/* NEW: Right-aligned menu for the refresh button */}
        <Menu.Menu position='right'>
          {/* NEW: The Info Modal Button */}
          <Menu.Item>
            <TabInfoModal tabType={activeTabType} />
          </Menu.Item>
          {/* We only render the button if the parent actually passed an onRefresh function */}
          {this.props.onRefresh && (
            <Menu.Item>
              <Popup content='Refresh threat data' trigger={
              <Button 
                color='teal' 
                size='huge'
                onClick={this.props.onRefresh}
                loading={this.props.isRefreshing}
                disabled={this.props.isRefreshing}
                animated='fade'
              >
                <Button.Content hidden>
                  Refresh
                </Button.Content>
                <Button.Content visible>
                  <Icon name='refresh'/>
                </Button.Content>
              </Button>}/>
            </Menu.Item>
          )}
        </Menu.Menu>
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