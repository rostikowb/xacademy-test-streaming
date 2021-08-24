import React from 'react';
import { BrowserRouter as Router, Route } from "react-router-dom";
import { Switch } from "react-router-dom";
import './App.css';
import {Index} from "./components";

function App() {
  return (
    <div className="App">
      <Router>
          <Switch>
            <Route path="/" component={Index} />
          </Switch>
      </Router>
    </div>
  );
}

export default App;
