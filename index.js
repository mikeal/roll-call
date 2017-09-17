/* globals URL */

const container = document.body

const getChromeVersion = () => {
  var raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)
  return raw ? parseInt(raw[2], 10) : false
}

const emojione = require('emojione')
const random = () => Math.random().toString(36).substring(7)

const welcome =
  `
  <style>
  welcome-message {
    font-family: monospace;
    font-size: 45px;
    display: flex;
    justify-content: center;
  }
  welcome-message p {
    max-width: 600px;
  }
  span#start-call, span#start-party, a.patreon {
    color: blue;
    cursor: pointer;
    text-decoration: none;
  }
  span.onlychrome {
    color: red;
  }
  </style>
  <welcome-message>
    <p>
      Roll Call is a completely free<span id="start-party">🎉</span>
      voice chat service with podcast quality recording.
    <br>
    <br>
    <span class="start-text">
      <span id="start-call">Start a new call</span> to try it out.
    </span>
    <br>
    <br>
      Support this project on <a class="patreon" href="https://www.patreon.com/mikeal">Patreon</a>.
    </p>
  </welcome-message>
  `

const onlyChrome = `
  <span class="onlychrome">Roll Call only works in latest Chrome :(</span>
`

if (window.location.search && getChromeVersion()) {
  let url = new URL(window.location)
  let room = url.searchParams.get('room') || 'promise-test'
  if (room) {
    require('./components')
    container.innerHTML = `<roll-call z-call="${room}"></roll-call>`
  }
} else {
  container.innerHTML = welcome
  if (!getChromeVersion()) {
    document.querySelector('span.start-text').innerHTML = onlyChrome
  }
  ;[...document.querySelectorAll('welcome-message span')].forEach(elem => {
    elem.onclick = () => {
      let room
      if (elem.id === 'start-party') room = 'party'
      else room = random()

      window.location = window.location.pathname + '?room=' + room
    }
  })
}

