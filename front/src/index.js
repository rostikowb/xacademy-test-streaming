import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';
import {WebsocketProvider} from './sockets/websocket';


// const theme = createMuiTheme({}, ruRU);
ReactDOM.render(
  <React.StrictMode>
      <WebsocketProvider>
        {/*<MuiThemeProvider>*/}
        {/*  <ThemeProvider theme={theme}>*/}
            <App/>
        {/*  </ThemeProvider>*/}
        {/*</MuiThemeProvider>*/}
      </WebsocketProvider>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.unregister();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
