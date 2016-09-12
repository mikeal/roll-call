const createSwarm = require('killa-beez')
const funky = require('funky')
const getUserMedia = require('getusermedia')
const qs = require('querystring')
const recordRTC = require('recordrtc')
const bel = require('bel')
const WebTorrent = require('webtorrent')
const streamToBlobURL = require('stream-to-blob-url')
const blobToBuffer = require('blob-to-buffer')

const byId = id => document.getElementById(id)
const values = (obj) => Object.keys(obj).map(k => obj[k])
const torrentClient = new WebTorrent()

function getBlobURL (file, cb) {
  if (file.createReadStream) {
    streamToBlobURL(file.createReadStream(), 'audio/wav', cb)
  } else {
    cb(null, URL.createObjectURL(file))
  }
}

let signalHost = 'https://signalexchange.now.sh'
let roomHost = 'https://roomexchange.now.sh'

let myMicrophone
let mySwarm
let myRecorder

const recordButton = bel`
<button id="record" class="ui compact labeled icon button">
  <i class="unmute icon"></i>
    Record
</button>
`

const recorders = {}
let recordingStopped = false

function stopRecording (local) {
  // update the URL
  if (recordingStopped) return
  recordingStopped = true
  $(recordButton).remove()
  if (local) {
    values(mySwarm.remotes).forEach(remote => {
      remote.stopRecording(err => {
        // TODO: update UI
      })
    })
  }

  for (let pubKey in recorders) {
    let recorder = recorders[pubKey]
    recorder.stopRecording(audioURL => {
      let call = document.getElementById(`a${pubKey}`)
      let audio = new Audio()
      let localTrack = connectAudio(audio, false, localTrackView)
      if (pubKey === 'undefined') {
        $(localTrack).find('span.local-track-title').text('Local Recording')
      } else {
        $(localTrack).find('span.local-track-title').text('Monitor Recording')
      }
      localTrack.querySelector('a').href = audioURL

      let name = call.querySelector('div.header').textContent

      let download
      let upload
      if (pubKey !== 'undefined') {
        download = downloadView(pubKey)
        upload = uploadView(pubKey)
      }

      let track = trackView({call, name, audio, download, upload, localTrack})
      if (pubKey === 'undefined') {
        $(document.getElementById('tracks-container')).prepend(track)
      } else {
        $(document.getElementById('tracks-container')).append(track)
      }

      audio.src = audioURL

      $(track.querySelector('div.progress')).progress()

      $(call.querySelector('div.header')).remove()

      if (pubKey === 'undefined') {
        let recordedBlob = recorder.getBlob()
        blobToBuffer(recordedBlob, (err, buffer) => {
          if (err) return console.error(err)
          let pubKey = mySwarm.publicKey
          torrentClient.seed(buffer, {name: `${pubKey}.wav`}, torrent => {
            values(mySwarm.remotes).forEach(remote => {
              remote.getTrack(torrent.magnetURI, percent => {
                let pubKey = remote.publicKey
                let progress = byId(`c${pubKey}`).querySelector('div.progress')
                progress.setAttribute('data-percent', percent)
                $(progress).progress({percent})
              })
            })
          })
        })
      }
    })
  }
}

function startRecording (local) {
  let opts = {disableLogs: true, type: 'audio'}

  if (local) {
    values(mySwarm.remotes).forEach(remote => {
      remote.record(err => {
        if (err) return console.error(err)
        // TODO: add the recording animation to this person
      })
    })
  }
  recorders['undefined'] = recordRTC(myMicrophone, opts)
  Object.keys(mySwarm.peers).forEach(k => {
    recorders[k] = recordRTC(mySwarm.peers[k].audioStream, opts)
  })
  values(recorders).forEach(rec => rec.startRecording())

  recordButton.innerHTML = `<i class="stop icon"></i> Stop`
  recordButton.onclick = stopRecording
  myRecorder = record
}

recordButton.onclick = startRecording

function joinRoom (room) {
  room = `peer-call:${room}`
  let mediaopts = { audio: true, video: false }
  getUserMedia(mediaopts, (err, audioStream) => {
    if (err) return console.error(err)
    if (!audioStream) return console.error("no audio")
    myMicrophone = audioStream
    window.myMicrophone = myMicrophone
    let p = addPerson(audioStream)
    let swarm = createSwarm(signalHost, {stream: audioStream})
    swarm.joinRoom(roomHost, room)
    swarm.on('stream', stream => {
      // Hack.
      let audio = new Audio()
      audio.src = URL.createObjectURL(stream)
      stream.peer.audioStream = stream
      stream.publicKey = stream.peer.publicKey
      let elem = addPerson(stream, true)
      elem.audioStream = stream
      let remotes = values(swarm.peers).length
      elem.querySelector('div.person-name').textContent = `Caller (${remotes})`
      document.getElementById('audio-container').appendChild(elem)
    })
    swarm.on('disconnect', pubKey => {
      $(document.getElementById(`a${pubKey}`)).remove()
    })
    mySwarm = swarm
    document.getElementById('audio-container').appendChild(p)
    document.body.appendChild(recordButton)

    // Setup RPC Services
    swarm.rpc.record = cb => {
      startRecording(false)
      cb(null)
    }
    swarm.rpc.stopRecording = cb => {
      stopRecording()
    }
    swarm.rpc.getTrack = (torrent, incr) => {
      torrentClient.add(torrent, _torrent => {
        let id = _torrent.name.slice(0, _torrent.name.lastIndexOf('.'))
        let timeout
        function tick () {
          let file = _torrent.files[0]
          let name = file.name
          let pubKey = name.slice(0, name.lastIndexOf('.'))
          if (pubKey === mySwarm.publicKey) return // My torrent.
          let progress = byId(`b${pubKey}`).querySelector('div.progress')
          let percent = (_torrent.received / _torrent.length) * 100
          progress.setAttribute('data-percent', percent)
          $(progress).progress({percent})
          incr(percent)
          if (percent !== 100) timeout = setTimeout(tick, 2000)
        }
        setTimeout(tick, 2000)

        getBlobURL(_torrent.files[0], (err, url) => {
          if (err) return console.error(err)
          // TODO: Wire up the track.
          if (timeout) clearTimeout(timeout)
          incr(100)

          let file = _torrent.files[0]
          let name = file.name
          let pubKey = name.slice(0, name.lastIndexOf('.'))
          let container = byId(`b${pubKey}`).parentNode

          let audio = new Audio()
          let localTrack = connectAudio(audio, false, localTrackView)
          audio.src = url

          container.querySelector('input[type=radio]').checked = false

          $(localTrack).find('span.local-track-title').text('Local Recording')
          localTrack.querySelector('a').href = url
          $(container).prepend(localTrack)
          $(byId(`b${pubKey}`)).remove()

        })
      })
    }
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

const downloadView = funky`
<div class="card download-card" id="b${id => id}">
  <div class="content">
    <div class="ui active progress" data-percent="0">
      <div class="bar">
        <div class="progress"></div>
      </div>
      <div class="label">Downloading Their Recording</div>
    </div>
  </div>
</div>
`
const uploadView = funky`
<div class="card upload-card" id="c${id => id}">
  <div class="content">
    <div class="ui active progress" data-percent="0">
      <div class="bar">
        <div class="progress"></div>
      </div>
      <div class="label">Sending My Audio</div>
    </div>
  </div>
</div>
`

const trackView = funky`
<div class="ui segment track-container">
  <div class="ui top attached label">${info => info.name}</div>
  <div class="ui special cards">
    ${info => info.download || ''}
    ${info => info.upload || ''}
    ${info => info.localTrack}
    ${info => info.call}
  </div>
</div>
`

const localTrackView = funky`
  <div class="card" id="d${id => id}">
    <div class="local-track-title">
      <input type="radio" checked="checked" />
      <span class="local-track-title"></span>
    </div>
    <a download="track.wav" class="download-link">
      <i data-content="Download" class="save link icon"></i>
    </a>
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
        <label>Gain</label>
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

let context = new AudioContext()

function connectAudio (stream, play, view) {
  let element = view(stream.publicKey)
  let volume = context.createGain()
  let analyser = context.createAnalyser()
  let source
  if (stream instanceof MediaStream) {
    source = context.createMediaStreamSource(stream)
  } else {
    source = context.createMediaElementSource(stream)
  }

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

