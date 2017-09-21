/* globals URL */

const container = document.body
const dragDrop = require('drag-drop')

if (!window.AudioContext && window.webkitAudioContext) {
  window.AudioContext = window.webkitAudioContext
}

const getChromeVersion = () => {
  return true
  // var raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)
  // return raw ? parseInt(raw[2], 10) : false
}

const each = (arr, fn) => Array.from(arr).forEach(fn)

const random = () => Math.random().toString(36).substring(7)

const welcome =
  `
  <style>
  welcome-message {
    font-family: Courier;
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

const help = `
  <a class="help" target="_blank" href="/faq.html">help -></a>
`
window.addEventListener('WebComponentsReady', () => {
  if (window.location.search && getChromeVersion()) {
    let url = new URL(window.location)
    let room = url.searchParams.get('room')
    if (room) {
      require('./components')
      container.innerHTML = `${help}<roll-call call="${room}"></roll-call>`
      dragDrop('body', files => {
        document.querySelector('roll-call').serveFiles(files)
      })
    }
  } else {
    container.innerHTML = welcome
    if (!getChromeVersion()) {
      document.querySelector('span.start-text').innerHTML = onlyChrome
    }
    each(document.querySelectorAll('welcome-message span'), elem => {
      elem.onclick = () => {
        let room
        if (elem.id === 'start-party') room = 'party'
        else room = random()

        window.location = window.location.pathname + '?room=' + room
      }
    })
  }
})
