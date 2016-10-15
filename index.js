/* global window, document, $, requestAnimationFrame, Audio, AudioContext, URL */

const createSwarm = require('killa-beez');
const getUserMedia = require('getusermedia');
const qs = require('querystring');
const mediaRecorder = require('media-recorder-stream');
const bel = require('bel');
const FileWriteStream = require('filestream/write');
const context = new AudioContext();
const waudio = require('waudio')(context);
const asyncLoad = require('async-load');
const xhr = require('xhr');
const UserStorage = require('./lib/storage');

// Views
const dragDrop = require('./lib/views/drag-drop');
const homeButtons = require('./lib/views/main');
const audioFile = require('./lib/views/audio-file');
const remoteAudio = require('./lib/views/remote-audio');
const settingsModal = require('./lib/views/settings-modal');

// Convenience functions
const byId = id => document.getElementById(id);
const selector = exp => document.querySelector(exp);
const selectall = exp => document.querySelectorAll(exp);
const values = obj => Object.keys(obj).map(k => obj[k]);
const getRandom = () => Math.random().toString(36).substring(7);

// Services for exchanges.
const signalHost = 'https://signalexchange.now.sh';
const roomHost = 'https://roomexchange.now.sh';
const zipurl = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.3/jszip.min.js';

// Create User storage instance
const storage = new UserStorage();

const recordButton = bel `
<button id="record" class="ui compact labeled icon button">
  <i class="unmute icon"></i>
  <span>Record</span>
</button>
`;

const settingsButton = bel `
<button id="settings" class="ui compact labeled icon button">
  <i class="settings icon"></i><span>Settings</span>
</button>
`;

class Output {
  constructor(stream) {
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
  add(audio) {
    audio.connect(this.gainFilter)
  }
}

function addAudioFile (file) {
  const audio = new Audio()
  audio.src = URL.createObjectURL(file)

  const elem = views.audioFile(file, audio, context)

  connectAudio(audio, true, elem)
  byId('audio-container').appendChild(elem)

  return elem.volume
}

function recordingName (pubkey, delay) {
  let text = $(`#a${pubkey} div.person-name`).text()
  if (delay) text += '-' + delay
  return text + '.webm'
}

function formatFileSize (bits) {
  const kB = bits / 1000
  if (kB >= 1000) {
    return Math.floor(kB / 1000) + 'MB'
  } else {
    return Math.floor(kB) + 'kB'
  }
}

function connectRecording (pubkey, stream) {
  let classes = 'spinner loading icon download-icon'
  let elem = bel `
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
    span.textContent = formatFileSize(bits)
  })
  span.textContent = formatFileSize(0)

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
    button.recordingDelay = ret.recordingDelay
    button.onclick = () => {
      let n = recordingName(pubkey, button.recordingDelay)
      bel `<a href="${URL.createObjectURL(file)}" download="${n}"></a>`.click()
    }

    enableZipDownload()
  }
  return ret
}

function enableZipDownload() {
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
      let name = recordingName(button.publicKey, button.recordingDelay)
      let file = button.recordingFile
      folder.file(name, file)
    })
    zip.generateAsync({
      type: 'blob'
    }).then(blob => {
      let n = `${window.RollCallRoom}.zip`
      bel `<a href="${URL.createObjectURL(blob)}" download="${n}"></a>`.click()

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

function recording(swarm, microphone) {
  let remotes = []

  function startRecording() {
    let me = mediaRecorder(microphone, {
      mimeType: 'audio/webm;codecs=opus'
    })
    let writer = FileWriteStream()
    me.pipe(writer)
    writer.publicKey = swarm.publicKey
    me.publicKey = swarm.publicKey

    let onFile = connectRecording('undefined', me)
    writer.on('file', onFile)

    let starttime = Date.now()

    swarm.on('substream', (stream, id) => {
      if (id.slice(0, 'recording:'.length) !== 'recording:') return
      let pubkey = id.slice('recording:'.length)
      let writer = FileWriteStream()
      writer.publicKey = swarm.publicKey
      stream.pipe(writer)

      recordingStreams[pubkey] = stream

      let onFile = connectRecording(pubkey, stream)
      onFile.recordingDelay = Date.now() - starttime
      writer.on('file', onFile)
    })

    remotes.forEach(commands => commands.record())
    let onRecording = commands => {
      commands.record()
    }
    swarm.on('commands:recording', onRecording)

    recordButton.onclick = () => {
      me.stop()
      remotes.forEach(commands => commands.stopRecording())
      swarm.removeListener('commands:recording', onRecording)

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

  function mkrpc(peer) {
    // Create RPC services scoped to this peer.
    let rpc = {}
    let stream
    rpc.record = () => {
      $(recordButton).addClass('disabled')
      stream = mediaRecorder(microphone, {
        mimeType: 'audio/webm;codecs=opus'
      })
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

function getRtcConfig(cb) {
  xhr({
    url: 'https://instant.io/rtcConfig',
    timeout: 10000
  }, function(err, res) {
    if (err || res.statusCode !== 200) {
      cb(new Error('Could not get WebRTC config from server. Using default (without TURN).'))
    } else {
      var rtcConfig
      try {
        rtcConfig = JSON.parse(res.body)
      } catch (err) {
        return cb(new Error('Got invalid WebRTC config from server: ' + res.body))
      }
      cb(null, rtcConfig)
    }
  })
}

function joinRoom(room) {
  room = `peer-call:${room}`

  const deviceId = storage.get('input');

  let audioopts = {
    echoCancellation: true,
    volume: 0.9,
    deviceId: deviceId ? {exact: deviceId} : undefined
  }
  let mediaopts = {
    audio: audioopts,
    video: false
  }

  getUserMedia(mediaopts, (err, audioStream) => {
    if (err) return console.error(err)
    if (!audioStream) return console.error('no audio')
    let output = new Output(audioStream.clone())
    let p = addPerson(output)

    getRtcConfig((err, rtcConfig) => {
      if (err) console.error(err) // non-fatal error

      let swarm = createSwarm(signalHost, {
        stream: output.stream,
        config: rtcConfig
      })
      swarm.joinRoom(roomHost, room)
      swarm.on('stream', stream => {
        stream.peer.audioStream = stream
        stream.publicKey = stream.peer.publicKey;

        const remotes = values(swarm.peers).length
        const elem = addPerson(stream, `Caller (${remotes})`);

        elem.audioStream = stream
        byId('audio-container').appendChild(elem)
      })
      swarm.on('disconnect', pubKey => {
        if (recordingStreams[pubKey]) {
          recordingStreams[pubKey].emit('end')
        } else {
          $(`#a${pubKey}`).remove()
        }
      })

      document.getElementById('audio-container').appendChild(p);
      document.body.appendChild(recordButton);
      document.body.appendChild(settingsButton);

      settingsModal(storage).then((modal) => {
        document.body.appendChild(modal);
        settingsButton.onclick = () => $(modal).modal('show');
      });

      recordButton.onclick = recording(swarm, output.stream)

      dragDrop((files) => {
        files.forEach(file => {
          let gain = addAudioFile(file)
          output.add(gain.inst)
        })
      });
    })
  })
}

const WIDTH = 290
const HEIGHT = 49
let looping

function startLoop() {
  if (looping) return

  let lastTime = Date.now()

  function draw() {
    requestAnimationFrame(draw)
    var now = Date.now()
    if (now - lastTime < 50) return

    var elements = [...selectall('canvas.person')]
    elements.forEach(drawPerson)

    function drawPerson(canvas) {
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

function connectAudio(stream, play, element) {
  let volume
  if (stream instanceof Output) {
    volume = waudio(stream.gainFilter);
    stream = waudio(stream.stream);
  } else {
    stream = waudio(stream)
    volume = waudio.gain()
    stream.send(volume)
  }

  let analyser = context.createAnalyser();
  let volumeSelector = 'input[type=range]';
  let muteSelector = 'input[type=checkbox]';
  let muteElement = element.querySelector(muteSelector);

  element.userGain = 1

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
      volume.set(element.userGain)
    }
  })

  $(element.querySelector(volumeSelector)).change(function() {
    volume.set(this.value)
    element.userGain = this.value
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

function addPerson(stream, username) {
  return connectAudio(stream, !!username, remoteAudio(storage, stream, username));
}

$(() => {
  if (window.location.search) {
    let opts = qs.parse(window.location.search.slice(1))
    if (opts.room) {
      window.RollCallRoom = opts.room;
      return joinRoom(opts.room);
    }
  }

  document.body.appendChild(homeButtons);
});