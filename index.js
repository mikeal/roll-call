/* global $, requestAnimationFrame, Audio, AudioContext, URL */
const createSwarm = require('killa-beez')
const funky = require('funky')
const getUserMedia = require('getusermedia')
const qs = require('querystring')
const mediaRecorder = require('../media-recorder-stream')
const bel = require('bel')
const FileWriteStream = require('filestream/write')
const context = new AudioContext()
const waudio = require('../waudio')(context)

// Convenience functions
const byId = id => document.getElementById(id)
const selector = exp => document.querySelector(exp)
const selectall = exp => document.querySelectorAll(exp)
const values = obj => Object.keys(obj).map(k => obj[k])
const getRandom = () => Math.random().toString(36).substring(7)

// Services for exchanges.
let signalHost = 'https://signalexchange.now.sh'
let roomHost = 'https://roomexchange.now.sh'

const recordButton = bel`
<button id="record" class="ui compact labeled icon button">
  <i class="unmute icon"></i>
    Record
</button>
`

const callOutput = new Audio()

function connectRecording (pubkey, stream) {
  let classes = 'spinner loading icon'
  let elem = bel`
  <div class="downloads">
    <div class="ui inverted divider"></div>
    <div class="ui basic button record-download">
      <i class="${classes}"></i><span class="bits"></span>
    </div>
  </div>`

  selector(`#a${pubkey} div.extra`).appendChild(elem)
  let span = selector(`#a${pubkey} span.bits`)
  let bits = 0
  stream.on('data', data => {
    bits += data.length
    span.textContent = Math.floor(bits / 1000) + 'k'
  })

  let button = selector(`#a${pubkey} div.downloads div.button`)
  $(button).addClass('disabled')

  let ret = file => {
    $(`#a${pubkey} div.downloads i`)
    .removeClass('spinner')
    .removeClass('loading')
    .addClass('download')

    $(button).removeClass('disabled').addClass('enabled')

    button.onclick = () => {
      let n = $(`#a${pubkey} div.person-name`).text() + '.webm'
      bel`<a href="${URL.createObjectURL(file)}" download="${n}"></a>`.click()
    }
  }
  return ret
}

const recordingStreams = {}

function recording (swarm, microphone) {
  let remotes = []

  function startRecording () {
    let streams = []
    let files = {}
    let me = mediaRecorder(microphone, {mimeType: 'audio/webm;codecs=opus'})
    let writer = FileWriteStream()
    me.pipe(writer)
    files[swarm.publicKey] = writer
    writer.publicKey = swarm.publicKey
    me.publicKey = swarm.publicKey
    streams.push(me)

    let onFile = connectRecording('undefined', me)
    writer.on('file', onFile)

    swarm.on('substream', (stream, id) => {
      if (id.slice(0, 'recording:'.length) !== 'recording:') return
      streams.push(stream)
      let pubkey = id.slice('recording:'.length)
      let writer = FileWriteStream()
      writer.publicKey = swarm.publicKey
      stream.pipe(writer)
      files[pubkey] = writer

      recordingStreams[pubkey] = stream

      let onFile = connectRecording(pubkey, stream)
      writer.on('file', onFile)
    })

    remotes.forEach(commands => commands.record())

    recordButton.onclick = () => {
      me.stop()
      remotes.forEach(commands => commands.stopRecording())
      $(recordButton).remove()
    }
    $('button#record i')
    .removeClass('unmute')
    .addClass('stop')
  }

  function mkrpc (peer) {
    // Create RPC services scoped to this peer.
    let rpc = {}
    let stream
    rpc.record = () => {
      $(recordButton).addClass('disabled')
      stream = mediaRecorder(microphone, {mimeType: 'audio/webm;codecs=opus'})
      stream.pipe(peer.meth.stream(`recording:${swarm.publicKey}`))
    }
    rpc.stopRecording = () => {
      stream.stop()
      $(recordButton).addClass('enabled').removeClass('disabled')
    }
    peer.meth.commands(rpc, 'recording')
  }

  swarm.on('peer', mkrpc)
  values(swarm.peers).forEach(mkrpc)
  swarm.on('commands:recording', commands => {
    remotes.push(commands)
  })

  return startRecording
}

function addTracks (mediastream, audioelem) {
  let s = context.createMediaStreamDestination(audioelem).stream
  console.log('tracks', s.getAudioTracks().length)
  s.getAudioTracks().forEach(track => mediastream.addTrack(track))
}

function joinRoom (room) {
  room = `peer-call:${room}`
  let audioopts = { echoCancellation: true, volume: 0.9 }
  let mediaopts = { audio: audioopts, video: false }
  getUserMedia(mediaopts, (err, audioStream) => {
    if (err) return console.error(err)
    if (!audioStream) return console.error('no audio')
    let p = addPerson(audioStream)
    let callOutputStream = audioStream.clone()
    addTracks(callOutputStream, callOutput)
    let swarm = createSwarm(signalHost, {stream: callOutputStream})
    swarm.joinRoom(roomHost, room)
    swarm.on('stream', stream => {
      stream.peer.audioStream = stream
      stream.publicKey = stream.peer.publicKey
      let elem = addPerson(stream, true)
      elem.audioStream = stream
      let remotes = values(swarm.peers).length
      elem.querySelector('div.person-name').textContent = `Caller (${remotes})`
      byId('audio-container').appendChild(elem)
    })
    swarm.on('disconnect', pubKey => {
      if (recordingStreams[pubKey]) {
        recordingStreams[pubKey].emit('end')
      } else {
        $(`#a${pubKey}`).remove()
      }
    })
    document.getElementById('audio-container').appendChild(p)
    document.body.appendChild(recordButton)

    recordButton.onclick = recording(swarm, audioStream)
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
<div class="card" id="a${id => id}">
  <div style="height:49px;width:290">
    <canvas id="canvas"
      width="290"
      height="49"
      class="person"
      >
    </canvas>
  </div>
  <div class="extra content">
    <div contenteditable="true" class="header person-name">Me</div>
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

    var elements = [...selectall('canvas.person')]
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
      var total = 0
      for (var i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 3
        if (barHeight > 10) {
          canvasCtx.fillStyle = 'rgb(66,133,244)'
          canvasCtx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight)
        }
        x += barWidth + 1
        total += barHeight
      }
      lastTime = now

      if (total > 1000) {
        $(canvas.parentNode.parentNode).addClass('pulse')
      } else {
        $(canvas.parentNode.parentNode).removeClass('pulse')
      }
    }
  }
  draw()
  looping = true
}



function connectAudio (stream, play, view) {
  let element = view(stream.publicKey)
  let volume = waudio.gain()
  let analyser = context.createAnalyser()
  stream = waudio(stream)

  let volumeSelector = 'input[type=range]'
  let muteSelector = 'input[type=checkbox]'
  let muteElement = selector(muteSelector)

  $(muteElement).checkbox('toggle').click((c) => {
    let label = c.target.parentNode.querySelector('label')
    let state = label.textContent
    if (state === 'Mute') {
      c.target.parentNode.querySelector('label').textContent = 'Muted'
      element.querySelector(volumeSelector).disabled = true
      stream.mute()
    } else {
      c.target.parentNode.querySelector('label').textContent = 'Mute'
      element.querySelector(volumeSelector).disabled = false
      stream.unmute()
    }
  })

  $(element.querySelector(volumeSelector)).change(function () {
    volume.set(this.value)
  })
  stream.send(volume).send(analyser)

  var canvas = element.querySelector('canvas.person')
  canvas.canvasCtx = canvas.getContext('2d')
  analyser.fftSize = 256
  analyser._bufferLength = analyser.frequencyBinCount
  canvas.canvasCtx.clearRect(0, 0, WIDTH, HEIGHT)
  canvas.analyser = analyser
  startLoop()

  if (play) {
    volume.output()
  }

  element.stream = stream
  element.volume = volume

  return element
}

function addPerson (stream, play) {
  return connectAudio(stream, play, remoteAudio)
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
  if (!opts.room) ask()
  else joinRoom(opts.room)
}
