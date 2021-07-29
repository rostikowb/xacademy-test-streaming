import React from 'react';
import loader from "./assets/img/loader.gif";
import { BrowserRouter as Router, Route } from "react-router-dom";
import { Switch } from "react-router-dom";
import './App.css';
import {Index} from "./components";

function App() {
  return (
    <div className="App">
      <Router>
        <React.Suspense
          fallback={
            <div className="suspense">
              <img className="loader" src={loader} alt="loader" />
            </div>
          }
        >
          <Switch>
            <Route path="/" component={Index} />
          </Switch>
        </React.Suspense>
      </Router>
    </div>
  );
}

export default App;
