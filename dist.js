/* globals CustomEvent */
const loadjs = require('load-js')

window.addEventListener('WebComponentsReady', () => {
  let event = new CustomEvent('RollCallReady', require('./components'))
  window.dispatchEvent(event)
})
const polyfill = 'https://cdnjs.cloudflare.com/ajax/libs/webcomponentsjs/1.0.12/webcomponents-loader.js'
loadjs([{async: true, url: polyfill}])
