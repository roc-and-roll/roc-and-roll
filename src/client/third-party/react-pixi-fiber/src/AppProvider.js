import React from "react";
import PropTypes from "prop-types";

const propTypes = {
  app: PropTypes.object.isRequired,
  children: PropTypes.node,
};
const childContextTypes = {
  app: PropTypes.object,
};

let AppContext = null;

function createAppProvider() {
  // New Context API
  if (AppContext === null) {
    AppContext = React.createContext(null);
  }

  class AppProvider extends React.Component {
    render() {
      const { app, children } = this.props;
      return <AppContext.Provider value={app}>{children}</AppContext.Provider>;
    }
  }

  AppProvider.propTypes = propTypes;

  const withApp = (WrappedComponent) => {
    function WithApp(props) {
      return (
        <AppContext.Consumer>
          {(app) => <WrappedComponent {...props} app={app} />}
        </AppContext.Consumer>
      );
    }
    WithApp.displayName = `withApp(${WrappedComponent})`;

    return WithApp;
  };

  return { AppProvider, withApp };
}

const { AppProvider, withApp } = createAppProvider();

export { AppContext, AppProvider, withApp };
