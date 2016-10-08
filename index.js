/* global $, requestAnimationFrame, Audio, AudioContext, URL */
const createSwarm = require('killa-beez')
const funky = require('funky')
const getUserMedia = require('getusermedia')
const qs = require('querystring')
const mediaRecorder = require('../media-recorder-stream')
const bel = require('bel')
const dragDrop = require('drag-drop')
const FileWriteStream = require('filestream/write')
const context = new AudioContext()
const waudio = require('waudio')(context)
const asyncLoad = require('async-load')

// Convenience functions
const byId = id => document.getElementById(id)
const selector = exp => document.querySelector(exp)
const selectall = exp => document.querySelectorAll(exp)
const values = obj => Object.keys(obj).map(k => obj[k])
const getRandom = () => Math.random().toString(36).substring(7)

// Services for exchanges.
const signalHost = 'https://signalexchange.now.sh'
const roomHost = 'https://roomexchange.now.sh'
const zipurl = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.3/jszip.min.js'

const recordButton = bel`
<button id="record" class="ui compact labeled icon button">
  <i class="unmute icon"></i>
  <span>Record</span>
</button>
`

const audioFileView = funky`
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
    <div class="header person-name">${name => name}</div>
    <div class="volume">
      <i class="icon play play-button"></i>
      <input type="range" min="0" max="2" step=".05" />
    </div>
  </div>
</div>
`

class Output {
  constructor (stream) {
    this.microphone = context.createMediaStreamSource(stream)
    this.gainFilter = context.createGain()
    this.destination = context.createMediaStreamDestination()
    this.outputStream = this.destination.stream
    this.microphone.connect(this.gainFilter)
    this.gainFilter.connect(this.destination)
    let oldtracks = stream.getAudioTracks()
    this.outputStream.getAudioTracks().forEach(track => stream.addTrack(track))
    oldtracks.forEach(track => stream.removeTrack(track))
    this.stream = stream
  }
  add (audio) {
    audio.connect(this.gainFilter)
  }
}

function addAudioFile (file) {
  let elem = audioFileView(file.name)
  let audio = new Audio()
  let button = elem.querySelector('i.play-button')
  audio.src = URL.createObjectURL(file)
  connectAudio(audio, true, elem)
  let play = () => {
    audio.play()
    $(button).removeClass('play').addClass('stop')
    button.onclick = stop
  }
  let stop = () => {
    audio.pause()
    audio.currentTime = 0
    $(button).removeClass('stop').addClass('play')
    button.onclick = play
  }
  audio.onended = stop
  button.onclick = play
  byId('audio-container').appendChild(elem)
  return elem.volume
}

function recordingName (pubkey) {
  return $(`#a${pubkey} div.person-name`).text() + '.webm'
}

function connectRecording (pubkey, stream) {
  let classes = 'spinner loading icon download-icon'
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

    button.publicKey = pubkey
    button.recordingFile = file
    button.onclick = () => {
      let n = recordingName(pubkey)
      bel`<a href="${URL.createObjectURL(file)}" download="${n}"></a>`.click()
    }

    enableZipDownload()
  }
  return ret
}

function enableZipDownload () {
  if (!window.JSZip) return
  let elements = selectall('i.download-icon')
  for (let i = 0; i < elements.length; i++) {
    let el = elements[i]
    if ($(el).hasClass('spinner')) return
  }

  $('#record i')
  .removeClass('notched circle loading')
  .addClass('download')
  $('#record span')
  .text('Download Zip')

  let downloadZip = () => {
    recordButton.onclick = () => {}

    $('#record i')
    .removeClass('download')
    .addClass('notched circle loading')
    $('#record span')
    .text('Loading...')

    let zip = new window.JSZip()
    let folder = zip.folder(`${window.RollCallRoom}-tracks`)
    Array(...selectall('div.record-download')).forEach(button => {
      let name = recordingName(button.publicKey)
      let file = button.recordingFile
      folder.file(name, file)
    })
    zip.generateAsync({type: 'blob'}).then(blob => {
      let n = `${window.RollCallRoom}.zip`
      bel`<a href="${URL.createObjectURL(blob)}" download="${n}"></a>`.click()

      $('#record i')
      .removeClass('notched circle loading')
      .addClass('download')
      $('#record span')
      .text('Download Zip')

      recordButton.onclick = downloadZip
    })
  }
  recordButton.onclick = downloadZip
}

const recordingStreams = {}

function recording (swarm, microphone) {
  let remotes = []

  function startRecording () {
    let me = mediaRecorder(microphone, {mimeType: 'audio/webm;codecs=opus'})
    let writer = FileWriteStream()
    me.pipe(writer)
    writer.publicKey = swarm.publicKey
    me.publicKey = swarm.publicKey

    let onFile = connectRecording('undefined', me)
    writer.on('file', onFile)

    swarm.on('substream', (stream, id) => {
      if (id.slice(0, 'recording:'.length) !== 'recording:') return
      let pubkey = id.slice('recording:'.length)
      let writer = FileWriteStream()
      writer.publicKey = swarm.publicKey
      stream.pipe(writer)

      recordingStreams[pubkey] = stream

      let onFile = connectRecording(pubkey, stream)
      writer.on('file', onFile)
    })

    remotes.forEach(commands => commands.record())

    recordButton.onclick = () => {
      me.stop()
      remotes.forEach(commands => commands.stopRecording())
      // $(recordButton).remove()
      // TODO: change into a loading icon.

      $('#record i')
      .removeClass('stop')
      .addClass('notched circle loading')
      $('#record span')
      .text('Loading...')

      asyncLoad(zipurl).then(enableZipDownload)
    }
    $('button#record i')
    .removeClass('unmute')
    .addClass('stop')
    $('#record span')
    .text('Stop')
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

function joinRoom (room) {
  room = `peer-call:${room}`
  let audioopts = { echoCancellation: true, volume: 0.9 }
  let mediaopts = { audio: audioopts, video: false }
  getUserMedia(mediaopts, (err, audioStream) => {
    if (err) return console.error(err)
    if (!audioStream) return console.error('no audio')
    let output = new Output(audioStream.clone())
    let p = addPerson(output)
    let swarm = createSwarm(signalHost, {stream: output.stream})
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

    recordButton.onclick = recording(swarm, output.stream)

    dragDrop('body', {
      onDrop: function (files, pos) {
        files.forEach(file => {
          let gain = addAudioFile(file)
          output.add(gain.inst)
        })
      },
      onDragOver: function () {},
      onDragLeave: function () {}
    })
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

function connectAudio (stream, play, element) {
  let volume
  if (stream instanceof Output) {
    volume = waudio(stream.gainFilter)
    stream = waudio(stream.stream)
  } else {
    stream = waudio(stream)
    volume = waudio.gain()
    stream.send(volume)
  }

  let analyser = context.createAnalyser()

  let volumeSelector = 'input[type=range]'
  let muteSelector = 'input[type=checkbox]'
  let muteElement = element.querySelector(muteSelector)

  let formerGain = 1

  $(muteElement).checkbox('toggle').click(c => {
    let label = c.target.parentNode.querySelector('label')
    let state = label.textContent
    if (state === 'Mute') {
      c.target.parentNode.querySelector('label').textContent = 'Muted'
      element.querySelector(volumeSelector).disabled = true
      volume.set(0)
    } else {
      c.target.parentNode.querySelector('label').textContent = 'Mute'
      element.querySelector(volumeSelector).disabled = false
      volume.set(formerGain)
    }
  })

  $(element.querySelector(volumeSelector)).change(function () {
    volume.set(this.value)
    formerGain = this.value
  })
  volume.send(analyser)

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
  return connectAudio(stream, play, remoteAudio(stream.publicKey))
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
  window.RollCallRoom = opts.room
}
