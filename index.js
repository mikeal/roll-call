/* global window, document, $ */
const qs = require('querystring')
const byId = id => document.getElementById(id)
const bel = require('bel')

const views = require('./lib/views')

// Load components, they are global.
require('./lib/component')

if (typeof window.AudioContext !== 'function' ||
    typeof window.MediaRecorder !== 'function') {
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
      let rollHTML = `<roll-call room="${opts.room}"></roll-call>`
      byId('page-container').innerHTML = rollHTML
      let elem = document.querySelector('roll-call')
      window.RollCallRoom = opts.room
    }
  }
  byId('page-container').appendChild(views.mainButtons)
})
