import logo from './logo.svg';
import './App.css';
import { BrowserRouter } from 'react-router-dom'
import { Route, Switch } from 'react-router-dom'
import Reports from './components/Reports'
import CaneReports from './components/CaneReports'
import FireReports from './components/FireReports'


const App = () => {
  return (
    <div className="App">
      <BrowserRouter>
      <Switch>
        <Route path={'/reports'} component={Reports} /> {/* This need to be the new default page */}
        <Route path={'/hurricanes'} component={CaneReports} />
        <Route path={'/wildfires'} component={FireReports} />
        <Route path={'/'} component={Reports} />
      </Switch>
      </BrowserRouter>
    </div>
  );
}

export default App;
