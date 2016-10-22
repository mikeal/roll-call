/* global window, document, $ */
const qs = require('querystring')
const byId = id => document.getElementById(id)
const bel = require('bel')

const views = require('./lib/views')

// Load components, they are global.
require('./lib/components')

if (typeof window.AudioContext !== 'function' || typeof window.MediaRecorder !== 'function') {
  byId('messages-container').appendChild(views.message({
    icon: 'frown',
    type: 'warning',
    title: 'Your browser is not supported',
    message: 'To use rollcall, we recommend using the latest version of Chrome or Mozilla Firefox'
  }))

  throw new Error(`Unsupported browser ${window.navigator.userAgent}`)
}

$(() => {
  if (window.location.search) {
    let opts = qs.parse(window.location.search.slice(1))
    if (opts.room) {
      byId('roll-call-container').appendChild(bel`<roll-call room="${opts.room}" />`)
      window.RollCallRoom = opts.room
    }
  }
  byId('main-container').appendChild(views.mainButtons)
})
