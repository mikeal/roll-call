const qs = require('querystring')
const openCall = require('./lib/open-call')
var opts = qs.parse(window.location.search.slice(1))
if (opts.room === 'test') {
  openCall.test()
} else {
  openCall(opts.room)
}
$('.ui.toggle').state({
  text: {
    inactive : 'Mute',
    active   : 'Muted'
  }
})
