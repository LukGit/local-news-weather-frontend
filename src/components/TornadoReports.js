import React, { Component } from 'react';
import { connect } from 'react-redux';
import Navbar from './Navbar';
import { addTornadoReport } from '../actions';
import { Label, Icon, Menu, Dropdown, Button } from 'semantic-ui-react/dist/commonjs';
import MapTornadoReports from './MapTornadoReports';

const US_NATIONAL_CENTER = { lat: 39.5, lng: -98.35 };

class TornadoReports extends Component {
  state = {
    centerGPS: { lat: 41.8781, lng: -87.6298 },
    isLoading: true,
    lastUpdated: null,
    historyIsLoading: false,
    historyWindow: 'LIVE', // 'LIVE' | '3M' | '6M' | '12M'
    allHistoryTornadoes: [],
    filteredHistoryTornadoes: [],
    tempHistoryCenter: null,
    resetTrigger: 0
  };

  componentDidMount() {
    this._isMounted = true;
    this.fetchTornadoData();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  fetchTornadoData = () => {
    this.setState({ isLoading: true });

    const past24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const hr24URL = `https://api.weather.gov/alerts?event=Tornado%20Warning&start=${past24Hours}`;

    fetch(hr24URL)
      .then(response => response.json())
      .then(data => {
        if (!this._isMounted) return;
        const warnings = data.features || [];
        this.props.addTornadoReport(warnings);
        const timestamp = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        this.setState({
          isLoading: false,
          lastUpdated: timestamp
        });
      })
      .catch(error => {
        console.error('Error fetching NWS Tornado data:', error);
        if (this._isMounted) this.setState({ isLoading: false });
      });
  };

  filterByMonths = (tornadoes, windowCode) => {
    const monthsMap = { '3M': 3, '6M': 6, '12M': 12 };
    const months = monthsMap[windowCode] || 12;
    const cutoff = new Date();
    cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
    const cutoffMs = cutoff.getTime();

    return tornadoes.filter(t => {
      if (!t.date) return false;
      return new Date(t.date).getTime() >= cutoffMs;
    });
  };

  fetchHistoryData = (windowCode) => {
    this.setState({ historyIsLoading: true, historyWindow: windowCode });

    if (this.state.allHistoryTornadoes.length > 0) {
      const subset = this.filterByMonths(this.state.allHistoryTornadoes, windowCode);
      this.setState({
        filteredHistoryTornadoes: subset,
        historyIsLoading: false,
        tempHistoryCenter: { ...US_NATIONAL_CENTER }
      });
      return;
    }

    fetch('/api/history/tornadoes?mode=catalog')
      .then(res => (res.ok ? res.json() : { tornadoes: [] }))
      .then(data => {
        if (!this._isMounted) return;
        const masterList = data.tornadoes || [];
        const subset = this.filterByMonths(masterList, windowCode);

        this.setState({
          allHistoryTornadoes: masterList,
          filteredHistoryTornadoes: subset,
          historyIsLoading: false,
          tempHistoryCenter: { ...US_NATIONAL_CENTER }
        });
      })
      .catch(err => {
        console.error('Tornado History Fetch Error:', err);
        if (this._isMounted) this.setState({ historyIsLoading: false });
      });
  };

  handleHistorySelect = (e, { value }) => {
    if (value === 'LIVE') {
      this.setState({
        historyWindow: 'LIVE',
        filteredHistoryTornadoes: [],
        tempHistoryCenter: null
      });
      return;
    }
    this.fetchHistoryData(value);
  };

  handleNationalReset = () => {
    this.setState(prevState => ({
      tempHistoryCenter: { ...US_NATIONAL_CENTER },
      resetTrigger: prevState.resetTrigger + 1
    }));
  };

  render() {
    const {
      historyWindow,
      historyIsLoading,
      filteredHistoryTornadoes,
      tempHistoryCenter,
      centerGPS,
      resetTrigger
    } = this.state;

    const isHistoryMode = historyWindow !== 'LIVE';
    const liveWarningCount = this.props.t_reports ? this.props.t_reports.length : 0;

    const windowLabels = {
      '3M': 'Past 3 Months',
      '6M': 'Past 6 Months',
      '12M': 'Past 12 Months'
    };

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          width: '100vw',
          overflow: 'hidden'
        }}
      >
        <Navbar
          onRefresh={this.fetchTornadoData}
          isRefreshing={this.state.isLoading}
        />

        <Menu
          inverted
          color="grey"
          size="mini"
          style={{ margin: 0, borderRadius: 0, flexShrink: 0, minHeight: 'auto' }}
        >
          <Menu.Item>
            <Label size="large" color="red">
              <Icon name="bolt" />
              {isHistoryMode
                ? `${windowLabels[historyWindow]}: ${filteredHistoryTornadoes.length} surveyed tornadoes`
                : liveWarningCount > 0
                ? `Warnings in last 24hrs: ${liveWarningCount}`
                : 'No active tornado warnings!'}
            </Label>
          </Menu.Item>

          <Menu.Item>
            <Dropdown
              button
              style={{ cursor: 'pointer' }}
              className="icon"
              floating
              labeled
              title="Review surveyed tornadoes from the past 12 months"
              icon="history"
              value={historyWindow}
              options={[
                { key: '3M', text: 'Past 3 Months', value: '3M' },
                { key: '6M', text: 'Past 6 Months', value: '6M' },
                { key: '12M', text: 'Past 12 Months', value: '12M' },
                { key: 'LIVE', text: 'Return to Live 24hr Warnings', value: 'LIVE' }
              ]}
              text={
                historyIsLoading
                  ? 'Loading...'
                  : isHistoryMode
                  ? `Season Review (${historyWindow})`
                  : 'Season Review'
              }
              onChange={this.handleHistorySelect}
            />
          </Menu.Item>

          {isHistoryMode && (
            <Menu.Item>
              <Button
                size="mini"
                inverted
                onClick={this.handleNationalReset}
              >
                <Icon name="compress" />
                National View
              </Button>
            </Menu.Item>
          )}

          <Menu.Menu position="right">
            {this.state.lastUpdated && (
              <Menu.Item style={{ color: '#ffb3b3' }}>
                Updated: {this.state.lastUpdated}
              </Menu.Item>
            )}
          </Menu.Menu>
        </Menu>

        <div style={{ flex: 1, position: 'relative', width: '100%' }}>
          <MapTornadoReports
            t_reports={this.props.t_reports}
            hist_tornadoes={filteredHistoryTornadoes}
            isHistoryMode={isHistoryMode}
            historyWindow={historyWindow}
            resetTrigger={resetTrigger}
            gps={tempHistoryCenter || centerGPS}
          />
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => {
  return {
    t_reports: state.t_reports
  };
};

export default connect(mapStateToProps, { addTornadoReport })(TornadoReports);
