import React, { Component } from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import _ from 'lodash'
import { join } from 'path'
import { Tabs, Tab } from 'react-bootstrap'

// Import selectors defined in poi
import {
  fleetsSelector,
  shipsSelector,
  equipsSelector,
  repairsSelector,
  miscSelector,
  createDeepCompareArraySelector,
} from 'views/utils/selectors'

import {
  akashiEstimate,
  getTimePerHP,
} from './parts/functions'
import FleetList from './parts/fleet-list'
import Candidates from './parts/candidates'

const { i18n, getStore } = window
const __ = i18n['poi-plugin-anchorage-repair'].__.bind(i18n['poi-plugin-anchorage-repair'])

const AKASHI_ID = [182, 187] // akashi and kai ID in $ships
const SRF_ID = 86 // Ship Repair Facility ID in $slotitems


// check a fleet status, returns information related to anchorage repair
const fleetAkashiConv = (fleet, $ships, ships, equips, repairId) => {
  const pickKey = ['api_id', 'api_ship_id', 'api_lv', 'api_nowhp', 'api_maxhp', 'api_ndock_time']

  let canRepair = false
  let akashiFlagship = false
  let repairCount = 0
  const inExpedition = _.get(fleet, 'api_mission.0') && true
  const flagShipInRepair = _.includes(repairId, _.get(fleet, 'api_ship.0', -1))
  const flagship = ships[_.get(fleet, 'api_ship.0', -1)]

  if (flagship != null) {
    akashiFlagship = _.includes(AKASHI_ID, flagship.api_ship_id)
    repairCount = _.filter(flagship.api_slot, item => _.get(equips, `${item}.api_slotitem_id`, -1) === SRF_ID).length
    repairCount += akashiFlagship ? 2 : 0
  }

  canRepair = akashiFlagship && !inExpedition && !flagShipInRepair

  const repairDetail = _.map(_.filter(fleet.api_ship, shipId => shipId > 0), (shipId, index) => {
    if (shipId === -1) return false // break, LODASH ONLY

    const ship = _.pick(ships[shipId], pickKey)

    const constShip = _.pick($ships[ship.api_ship_id], ['api_name', 'api_stype'])

    return {
      ...ship,
      ...constShip,
      estimate: akashiEstimate(ship),
      timePerHP: getTimePerHP(ship.api_lv, constShip.api_stype),
      inRepair: _.includes(repairId, ship.api_id),
      availableSRF: index < repairCount,
    }
  })

  return {
    api_id: fleet.api_id || -1,
    shipId: fleet.api_ship || [],
    canRepair,
    akashiFlagship,
    inExpedition,
    flagShipInRepair,
    repairCount,
    repairDetail,
  }
}

// selectors

const repairIdSelector = createSelector(
  [repairsSelector],
  repair => _.map(repair, dock => dock.api_ship_id)
)

const constShipsSelector = state => state.const.$ships || {}

const fleetsAkashiSelector = createSelector(
  [
    constShipsSelector,
    fleetsSelector,
    shipsSelector,
    equipsSelector,
    repairIdSelector,
  ],
  ($ships, fleets, ships, equips, repairId) =>
    ({ fleets: _.map(fleets, fleet => fleetAkashiConv(fleet, $ships, ships, equips, repairId)) })

)


// React

export const reactClass = connect(
  createDeepCompareArraySelector([
    fleetsAkashiSelector,
    miscSelector,
  ], (data, { canNotify }) => ({
    ...data,
    canNotify,
  }))
)(class PluginAnchorageRepair extends Component {

  constructor(props) {
    super(props)

    this.state = {
      activeTab: 1,
      sortIndex: 0,
    }
  }

  handleSelectTab = (key) => {
    this.setState({ activeTab: key })
  }

  handleSort = index => () => {
    this.setState({
      sortIndex: index,
    })
  }

  render() {
    return (
      <div id="anchorage-repair">
        <link rel="stylesheet" href={join(__dirname, 'assets', 'style.css')} />
        <Tabs activeKey={this.state.activeTab} onSelect={this.handleSelectTab} id="anchorage-tabs">
          {
            _.map(this.props.fleets, (fleet, index) => (
              <Tab
                eventKey={fleet.api_id}
                title={fleet.api_id}
                key={`anchorage-tab-${index}`}
                tabClassName={fleet.canRepair ? 'can-repair' : ''}
              >
                <FleetList fleet={fleet} />
              </Tab>
            ))
          }
          <Tab
            className="candidate-pane"
            eventKey={-1}
            title={__('Candidates')}
          >
            <Candidates handleSort={this.handleSort} sortIndex={this.state.sortIndex} />
          </Tab>
        </Tabs>
      </div>
    )
  }
})


/*

   The following APIs are called in order when a fleet returns from expedition:

   - api_req_mission/result
   - api_port/port

   As anchorage repair pops up conditionally on the latter one,
   it also prevents other plugins' auto-switch mechanism on
   tracking api_req_mission/result calls.

   The problem is solved by applying a lock upon expedition returns
   and ignoring the immediately followed api_port/port call.

 */
let expedReturnLock = null
const clearExpedReturnLock = () => {
  if (expedReturnLock !== null) {
    clearTimeout(expedReturnLock)
    expedReturnLock = null
  }
}

export const switchPluginPath = [
  {
    path: '/kcsapi/api_port/port',
    valid: () => {
      if (expedReturnLock !== null) {
        /*
           this is the immediately followed api_port/port call
           after an expedition returning event.
         */
        clearExpedReturnLock()
        return false
      }

      const { fleets = [], ships = {}, equips = {}, repairs = [] } = getStore('info') || {}
      const $ships = getStore('const.$ships')
      const repairId = repairs.map(dock => dock.api_ship_id)

      const result = fleets.map(fleet => fleetAkashiConv(fleet, $ships, ships, equips, repairId))
      return result.some(fleet =>
        fleet.canRepair && fleet.repairDetail.some(ship => ship.estimate > 0))
    },
  },
  {
    path: '/kcsapi/api_req_mission/result',
    valid: () => {
      clearExpedReturnLock()
      expedReturnLock = setTimeout(
        clearExpedReturnLock,
        /*
           allow a window of 5 secnds before the lock
           clears itself
         */
        5000
      )
      return false
    },
  },
]
