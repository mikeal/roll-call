const callComponent = require('./components/call')
const leveljs = require('level-js')
const levelup = require('levelup')

module.exports = opts => {
  let db = null
  if (opts.storage !== 'false' && opts.storage !== false) {
    db = levelup('rollcall', { db: leveljs })
    opts.levelup = db
  }
  if (opts.recording !== 'false' && opts.storage !== false) {
    opts.recording = true
  }
  let call = callComponent(opts)
  return call
}
