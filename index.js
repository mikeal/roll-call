const createSwarm = require('killa-beez')
const funky = require('funky')
const getUserMedia = require('getusermedia')
const qs = require('querystring')

let signalHost = 'https://signalexchange.now.sh'
let roomHost = 'https://roomexchange.now.sh'

function joinRoom (room) {
  room = `peer-call:${room}`
  let mediaopts = { audio: true, video: false }
  getUserMedia(mediaopts, (err, audioStream) => {
    if (err) return console.error(err)
    if (!audioStream) return console.error("no audio")
    window.audioStream = audioStream
    let p = addPerson(audioStream)
    let swarm = createSwarm(signalHost, {stream: audioStream})
    swarm.joinRoom(roomHost, room)
    swarm.on('stream', stream => {
      let elem = addPerson(stream, true)
      document.getElementById('audio-container').appendChild(elem)
    })
    document.getElementById('audio-container').appendChild(p)
  })
}
const mainButtons = funky`
<div class="join-container">
  <div class="ui large buttons">
    <button id="join-party" class="ui button">Join the Party 🎉</button>
    <div class="or"></div>
    <button id="create-room" class="ui button">🚪 Create New Room</button>
  </div>
</div>`

const remoteAudio = funky`
  <div class="card">
    <div style="height:49px;width:290">
      <canvas id="canvas"
        width="290"
        height="49"
        class="person"
        >
      </canvas>
    </div>
    <div class="extra content">
      <div class="volume">
        <div class="ui toggle checkbox">
          <input type="checkbox" name="mute">
          <label>Mute</label>
        </div>
        <input type="range" min="0" max="2" step=".05" />
      </div>
    </div>
  </div>
`

const WIDTH = 290
const HEIGHT = 49
let looping

function startLoop () {
  if (looping) return

  let lastTime = Date.now()

  function draw () {
    requestAnimationFrame(draw)
    var now = Date.now()
    if (now - lastTime < 50) return

    var elements = [...document.querySelectorAll('canvas.person')]
    elements.forEach(drawPerson)

    function drawPerson (canvas) {
      var canvasCtx = canvas.canvasCtx
      var analyser = canvas.analyser
      var bufferLength = analyser._bufferLength

      var dataArray = new Uint8Array(bufferLength)

      analyser.getByteFrequencyData(dataArray)

      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT)
      var barWidth = (WIDTH / bufferLength) * 5
      var barHeight
      var x = 0
      for (var i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 3
        if (barHeight > 10) {
          canvasCtx.fillStyle = 'rgb(66,133,244)'
          canvasCtx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight)
        }
        x += barWidth + 1
      }
      lastTime = now
    }
  }
  draw()
  looping = true
}

let context = new AudioContext()

function addPerson (stream, play) {
  let element = remoteAudio()
  let volume = context.createGain()
  let analyser = context.createAnalyser()
  let source = context.createMediaStreamSource(stream)
  let volumeSelector = 'input[type=range]'
  let muteSelector = 'input[type=checkbox]'
  let muteElement = element.querySelector(muteSelector)

  $(muteElement).checkbox('toggle').click((c) => {
    let label = c.target.parentNode.querySelector('label')
    let state = label.textContent
    if (state === 'Mute') {
      c.target.parentNode.querySelector('label').textContent = 'Muted'
      element.querySelector(volumeSelector).disabled = true
      stream.getAudioTracks().forEach(t => t.enabled = false)
    } else {
      c.target.parentNode.querySelector('label').textContent = 'Mute'
      element.querySelector(volumeSelector).disabled = false
      stream.getAudioTracks().forEach(t => t.enabled = true)
    }
  })

  $(element.querySelector(volumeSelector)).change(function () {
    volume.gain.value = this.value
  })
  source.connect(volume)
  volume.connect(analyser)

  var canvas = element.querySelector('canvas.person')
  canvas.canvasCtx = canvas.getContext("2d")
  analyser.fftSize = 256
  analyser._bufferLength = analyser.frequencyBinCount
  canvas.canvasCtx.clearRect(0, 0, WIDTH, HEIGHT)
  canvas.analyser = analyser
  startLoop()

  if (play) {
    volume.connect(context.destination)
  }

  element.stream = stream
  element.volume = volume

  return element
}

function ask () {
  let buttons = mainButtons()
  document.getElementById('main-container').appendChild(buttons)
  document.getElementById('join-party').onclick = () => {
    window.location = '?room=party'
  }
  document.getElementById('create-room').onclick = () => {
    window.location = `?room=${encodeURIComponent(getRandom())}`
  }
}

if (!window.location.search) {
  ask()
} else {
  let opts = qs.parse(window.location.search.slice(1))
  if (!opts.room) return ask()
  joinRoom(opts.room)
}

function getRandom () {
  function toBase64 (buf) {
    buf = new Uint8Array(buf)
    var s = ''
    for (var i = 0; i < buf.byteLength; i++) {
      s += String.fromCharCode(buf[i])
    }
    return btoa(s)
  }
  let key = new Uint8Array(8)
  window.crypto.getRandomValues(key)
  let s = toBase64(key)
  return s.slice(0, s.length - 1)
}
