import React, { useState } from 'react';
import { Button, Modal, Header, List, Segment, Message, Icon, Popup } from 'semantic-ui-react/dist/commonjs';

const TAB_CONFIGS = {
  earthquake: {
    title: 'Earthquake Monitor Legend',
    color: 'red',
    sources: [{ name: 'USGS GeoJSON Feed', desc: 'Real-time global seismic monitoring (M4.0+ past 72 hours).' }],
    rules: [
      'Magnitude Visual Scaling: Icons enlarge and alter geometry for higher Richter magnitudes (Mw).',
      'Temporal Decay: Marker opacity gradually decreases over the 72-hour window as quakes age.',
      'Chronological Playback: Sequential timeline playback highlights quakes with animated marker bounces.',
      'Magnitude Threshold Filter: Interactive slider filters map rendering by minimum magnitude.'
    ]
  },
  hurricane: {
    title: 'Cyclone & Track Analysis Legend',
    color: 'orange',
    sources: [{ name: 'NOAA NHC & Hong Kong Observatory', desc: 'Atlantic, Eastern, and Western Pacific tropical advisories.' }],
    rules: [
      'Classification Icons: Visual distinctions for Tropical Depressions, Tropical Storms, and Hurricanes.',
      'Track Vectors: Solid black paths indicate historical movement; red paths indicate official forecast trajectories.',
      'Uncertainty Cone: Shaded polygons map 3-to-5 day 67% probability margins for center-track error.',
      'System Type Filter: Toggle box isolates major systems by suppressing Tropical Depressions.'
    ]
  },
  tornado: {
    title: 'Tornado & Severe Weather Legend',
    color: 'yellow',
    sources: [{ name: 'NOAA Storm Prediction Center / NWS', desc: 'Active warnings and confirmed touchdowns (past 24 hours).' }],
    rules: [
      'Temporal Decay: Warning polygons and touchdown icons progressively fade in opacity over 24 hours.',
      'Geospatial Polygons: Zooming into reports renders active warning boundary shapes outlining impact zones.',
      'Telemetry Popups: Selecting an icon displays localized touchdown times and damage assessments.'
    ]
  },
  wildfire: {
    title: 'Wildfire & Thermal Anomaly Legend',
    color: 'red',
    sources: [{ name: 'NASA FIRMS / NIFC', desc: 'Active U.S. wildfires > 500 acres with financial tracking.' }],
    rules: [
      'Perimeter Sizing: Icon size scales proportionally to active uncontained burned acreage.',
      'Containment Decay: Markers fade in opacity as containment percentages increase.',
      'Peak Cost Indicator: Bouncing icon highlights the single most financially intensive active fire.',
      'Burned Polygons & Wind Vectors: Close zoom levels render multi-polygon perimeters and local wind directions/strengths.',
      'Initial Load Notice: Federal satellite payload ingestion takes ~30 seconds on initial load.'
    ]
  }
};

const TabInfoModal = ({ tabType }) => {
  const [open, setOpen] = useState(false);
  const config = TAB_CONFIGS[tabType] || TAB_CONFIGS.earthquake;

  return (
    <>
      <Popup 
        content='View map legend' 
        trigger={
          <Button 
            color='teal' 
            size='huge'
            onClick={() => setOpen(true)}
            animated='fade'
          >
            <Button.Content hidden>
              Legend
            </Button.Content>
            <Button.Content visible>
              <Icon name='info circle'/>
            </Button.Content>
          </Button>
        }
      />

      <Modal open={open} onClose={() => setOpen(false)} size="small" closeIcon>
        <Header color={config.color}>
          {config.title}
        </Header>
        <Modal.Content>
          <Header as="h4">Scientific Data Sources</Header>
          <List bulleted>
            {config.sources.map((src, i) => (
              <List.Item key={i}>
                <strong>{src.name}:</strong> {src.desc}
              </List.Item>
            ))}
          </List>

          <Header as="h4">Visual Mapping & Feature Rules</Header>
          <Segment color={config.color} secondary>
            <List bulleted>
              {config.rules.map((rule, i) => (
                <List.Item key={i}>{rule}</List.Item>
              ))}
            </List>
          </Segment>

          <Message info size="tiny">
            <strong>Global Refresh:</strong> Clicking the refresh button on the top menu bar triggers an immediate force sync of fresh live payloads across all 4 disaster tabs.
          </Message>
        </Modal.Content>
        <Modal.Actions>
          <Button color="teal" onClick={() => setOpen(false)}>
            Close
          </Button>
        </Modal.Actions>
      </Modal>
    </>
  );
};

export default TabInfoModal;