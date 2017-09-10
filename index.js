/* globals URL */
// const components = require('./components')

require('./components')

const container = document.body

if (window.location.search) {
  let url = new URL(window.location)
  let room = url.searchParams.get('room') || 'promise-test'
  if (room) {
    container.innerHTML = `<roll-call z-call="${room}"></roll-call>`
  }
}
