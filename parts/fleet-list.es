import React, { Component } from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import { Table, Grid, Row, Col, OverlayTrigger, Tooltip, Label, Panel } from 'react-bootstrap'

import CountupTimer from './countup-timer'
import { AKASHI_INTERVAL } from './functions'

import ShipRow from './ship-row'

const { i18n } = window
const __ = i18n['poi-plugin-anchorage-repair'].__.bind(i18n['poi-plugin-anchorage-repair'])


export default class FleetList extends Component {
  static propTypes = {
    fleet: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props)

    this.state = {
      lastRefresh: 0,
      timeElapsed: 0,
    }
  }


  componentDidMount= () => {
    window.addEventListener('game.response', this.handleResponse)
  }

  componentWillUnmount = () => {
    window.removeEventListener('game.response', this.handleResponse)
  }


  handleResponse = (e) => {
    const { path, postBody } = e.detail
    const { timeElapsed, lastRefresh } = this.state
    switch (path) {
      case '/kcsapi/api_port/port':
        if (timeElapsed >= (AKASHI_INTERVAL / 1000) || lastRefresh === 0) {
          this.setState({
            lastRefresh: Date.now(),
            timeElapsed: 0,
          })
        }
        break

      case '/kcsapi/api_req_hensei/change': {
        const fleetId = parseInt(postBody.api_id, 10)
        const shipId = parseInt(postBody.api_ship_id, 10)
        // const shipIndex = parseInt(postBody.api_ship_idx)
        if (!Number.isNaN(fleetId)
        && fleetId === this.props.fleet.api_id
        && shipId >= 0) {
          if (timeElapsed < (AKASHI_INTERVAL / 1000)) {
            this.setState({
              lastRefresh: Date.now(),
              timeElapsed: 0,
            })
          } else if (shipId < 0) {
          // do nothing
          } else {
            this.setState({ // since it has passed more than 20 minutes, need to refresh the hp
              lastRefresh: 0,
            })
          }
        }
        break
      }
      case '/kcsapi/api_req_nyukyo/start': {
        const shipId = parseInt(postBody.api_ship_id, 10)
        const infleet = _.filter(this.props.fleet.shipId, id => shipId === id)
        if (postBody.api_highspeed === 1 && infleet != null) {
          this.setState({ lastRefresh: Date.now() })
        }
        break
      }
      default:
    }
  }

  tick = (timeElapsed) => {
    if (timeElapsed % 5 === 0) { // limit component refresh rate
      this.setState({ timeElapsed })
    }
  }

  resetTimeElapsed = () => {
    this.setState({ timeElapsed: 0 })
  }

  render() {
    const { timeElapsed, lastRefresh } = this.state
    const { fleet } = this.props

    return (
      <Grid>
        <Row className="info-row">
          <Col xs={4} className="info-col">
            <OverlayTrigger
              placement="bottom"
              trigger={fleet.canRepair ? 'click' : ['hover', 'focus']}
              overlay={
                <Tooltip id={`anchorage-refresh-notify-${fleet.api_id}`}>
                  <p>{fleet.canRepair ? __('Akashi loves you!') : '' }</p>
                  <p>{fleet.akashiFlagship ? '' : __('Akashi not flagship')}</p>
                  <p>{fleet.inExpedition ? __('fleet in expedition') : ''}</p>
                  <p>{fleet.flagShipInRepair ? __('flagship in dock') : ''}</p>
                </Tooltip>
            }
            >
              <Label bsStyle={fleet.canRepair ? 'success' : 'warning'}>
                {fleet.canRepair ? __('Repairing') : __('Not ready')}
              </Label>
            </OverlayTrigger>
          </Col>
          <Col xs={4} className="info-col">
            {
              <Label bsStyle={fleet.canRepair ? 'success' : 'warning'}>
                <span>{__('Elapsed:')} </span>
                <CountupTimer
                  countdownId={`akashi-${fleet.api_id}`}
                  startTime={this.state.lastRefresh}
                  tickCallback={this.tick}
                  startCallback={this.resetTimeElapsed}
                />
              </Label>

          }
          </Col>
          <Col xs={4} className="info-col">
            <Label bsStyle={fleet.repairCount ? 'success' : 'warning'}>{__('Capacity: %s', fleet.repairCount)}</Label>
          </Col>
        </Row>
        <Row>
          <Col xs={12}>
            <Panel bsStyle="warning" className={lastRefresh === 0 ? '' : 'hidden'}>
              {__('Please return to HQ screen to make timer refreshed.')}
            </Panel>
          </Col>
        </Row>
        <Row>
          <Col xs={12}>
            <Table bordered condensed>
              <thead>
                <tr>
                  <th>{__('Ship')}</th>
                  <th>{__('HP')}</th>
                  <th>
                    <OverlayTrigger
                      placement="top"
                      overlay={
                        <Tooltip id={'akashi-time-desc'}>
                          {__('Total time required')}
                        </Tooltip>
                    }
                    >
                      <span>{__('Akashi Time')}</span>
                    </OverlayTrigger >
                  </th>
                  <th>
                    <OverlayTrigger
                      placement="top"
                      overlay={
                        <Tooltip id={'akashi-time-desc'}>
                          {__('Time required for 1 HP recovery')}
                        </Tooltip>
                    }
                    >
                      <span>{__('Per HP')}</span>
                    </OverlayTrigger >
                  </th>
                  <th>
                    <OverlayTrigger
                      placement="top"
                      overlay={
                        <Tooltip id={'akashi-time-desc'}>
                          {__('Estimated HP recovery since last refresh')}
                        </Tooltip>
                      }
                    >
                      <span>{__('Estimated repaired')}</span>
                    </OverlayTrigger >
                  </th>
                </tr>
              </thead>
              <tbody>
                {
                  _.map(fleet.repairDetail, ship => (
                    <ShipRow
                      key={`anchorage-ship-${ship.api_id}`}
                      ship={ship}
                      lastRefresh={lastRefresh}
                      timeElapsed={timeElapsed}
                      canRepair={fleet.canRepair}
                    />))
                }
              </tbody>
            </Table>
          </Col>
        </Row>
      </Grid>
    )
  }
}
