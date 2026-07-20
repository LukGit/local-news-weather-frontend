import logo from './logo.svg';
import './App.css';
import { BrowserRouter } from 'react-router-dom'
import { Route, Switch } from 'react-router-dom'
import Login from './components/Login'
import Signup from './components/Signup'
import Reports from './components/Reports'
import CaneReports from './components/CaneReports'
import FireReports from './components/FireReports'


const App = () => {
  return (
    <div className="App">
      <BrowserRouter>
      <Switch>
        <Route path={'/login'} component={Login} />
        <Route path={'/signup'} component={Signup}/>
        <Route path={'/reports'} component={Reports} />
        <Route path={'/hurricanes'} component={CaneReports} />
        <Route path={'/wildfires'} component={FireReports} />
        <Route path={'/'} component={Login} />
      </Switch>
      </BrowserRouter>
    </div>
  );
}

export default App;
