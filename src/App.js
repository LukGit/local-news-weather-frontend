import logo from './logo.svg';
import './App.css';
import { BrowserRouter } from 'react-router-dom'
import { Route, Switch } from 'react-router-dom'

const App = () => {
  return (
    <div className="App">
      <BrowserRouter>
      <Switch>
        <Route path={'/login'} component={Login} />
        <Route path={'/signup'} component={Signup}/>
        <Route path={'/weather'} component={Weather} />
        <Route path={'/news'} component={News} />
        <Route path={'/'} component={Login} />
      </Switch>
      </BrowserRouter>
    </div>
  );
}

export default App;
