/* global window, document, $, HTMLElement, customElements, AudioContext, URL */
const createSwarm = require('killa-beez')
const getUserMedia = require('getusermedia')
const xhr = require('xhr')
const bel = require('bel')
const mediaRecorder = require('media-recorder-stream')
const FileWriteStream = require('filestream/write')

const UserStorage = require('./storage')
const views = require('./views')
const connectAudio = require('./connectAudio')

const byId = id => document.getElementById(id)
const values = obj => Object.keys(obj).map(k => obj[k])
const selector = exp => document.querySelector(exp)
const selectall = exp => document.querySelectorAll(exp)

const context = new AudioContext()
const waudio = require('waudio')(context)

function getRtcConfig (cb) {
  xhr({
    url: 'https://instant.io/rtcConfig',
    timeout: 10000
  }, (err, res) => {
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

const defaultSignalHost = 'https://signalexchange.now.sh'
const defaultRoomHost = 'https://roomexchange.now.sh'

class RollCall extends HTMLElement {
  constructor (self) {
    self = super(self)

    console.log('asdfasdfasdf')

    this.storage = new UserStorage()
    this.masterSoundOutput = waudio(true)

    this.mainContainer = bel`
    <div id="main-container" class="ui main text container">
      <div id="messages-container"></div>
      <div id="tracks-container" class="ui items"></div>
      <div id="audio-container" class="ui special cards"></div>
    </div>`
    this.appendChild(this.mainContainer)

    this.topBar = bel`<div id="top-bar"></div>`
    this.appendChild(this.topBar)

    this.recordButton = bel `
    <button id="record" class="ui compact labeled icon button">
      <i class="circle icon"></i>
      <span>Record</span>
    </button>
    `
    // this.topBar.appendChild(this.recordButton)

    this.settingsButton = bel `
    <button id="settings" class="ui compact icon button">
      <i class="settings icon"></i>
    </button>
    `
    this.topBar.appendChild(this.settingsButton)

    this.worker = new window.Worker('/worker.js')

    // listen for messages from the worker
    this.worker.onmessage = (e) => {
      const data = e.data || {}

      if (data.type === 'compressed') {
        bel `<a href="${data.url}" download="${data.name}"></a>`.click()

        $('#record i')
          .removeClass('notched circle loading')
          .addClass('download')
        $('#record span')
          .text('Download Zip')
      }
    }
  }

  connectedCallback () {
    // We only connect to the room once we are attached to the DOM.
    // This way we give plenty of time for any attributes to be set.
    if (!this.inRoom && this.getAttribute('room')) {
      this.joinRoom(this.getAttribute('room'))
    }
  }

  joinRoom (room) {
    if (this.inRoom) throw new Error('Already in room.')
    room = `peer-call:${room}`

    this.inRoom = room

    const deviceId = this.storage.get('input')
    const signalHost = $(this).attr('signalHost') || defaultSignalHost
    const roomHost = $(this).attr('roomHost') || defaultRoomHost
    const worker = this.worker
    const recordButton = this.recordButton

    const mimeType = [
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/ogg;codecs=vorbis'
    ].filter((type) => {
      return window.MediaRecorder.isTypeSupported(type)
    })[0]

    let audioopts = {
      echoCancellation: true,
      volume: 0.9,
      deviceId: deviceId ? {exact: deviceId} : undefined
    }
    let mediaopts = {
      audio: audioopts,
      video: false
    }

    function recordingName (pubkey, delay) {
      let text = $(`#a${pubkey} div.person-name`).text()
      if (delay) text += '-' + delay
      return text + '.webm'
    }

    function formatFileSize (bytes) {
      const kB = bytes / 1000
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
      let bytes = 0
      stream.on('data', data => {
        bytes += data.length
        span.textContent = formatFileSize(bytes)
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

    function enableZipDownload () {
      let elements = selectall('i.download-icon')
      for (let i = 0; i < elements.length; i++) {
        let el = elements[i]
        if ($(el).hasClass('spinner')) return
      }

      $('#record i')
        .removeClass('notched circle loading red blink')
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

        // inform worker to create a zip file
        worker.postMessage({
          type: 'compress',
          room: window.RollCallRoom,
          files: Array(...selectall('div.record-download')).map(button => {
            return {
              name: recordingName(button.publicKey, button.recordingDelay),
              file: button.recordingFile
            }
          })
        })
      }

      recordButton.onclick = downloadZip
    }

    const recordingStreams = {}

    function recording (swarm, microphone) {
      let remotes = []

      function startRecording () {
        let me = mediaRecorder(microphone, {
          mimeType
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
        }

        $('button#record i')
          .removeClass('unmute')
          .addClass('red blink')
        $('#record span')
          .text('Stop')
      }

      function mkrpc (peer) {
        // Create RPC services scoped to this peer.
        let rpc = {}
        let stream
        rpc.record = () => {
          $(recordButton).addClass('disabled')
          stream = mediaRecorder(microphone, {
            mimeType
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

    const message = views.message({
      icon: 'unmute',
      title: 'Rollcall would like to access your microphone'
    })

    byId('messages-container').appendChild(message)

    getUserMedia(mediaopts, (err, audioStream) => {
      if (err) console.error(err)

      let output = waudio(audioStream ? audioStream.clone() : null)
      let myelem = views.remoteAudio(this.storage)
      connectAudio(context, myelem, output)

      message.update({
        icon: 'notched circle loading',
        title: 'Hang on tight',
        message: 'We are establishing a connection to your room, please be patient...'
      })

      getRtcConfig((err, rtcConfig) => {
        if (err) console.error(err) // non-fatal error

        let swarm = createSwarm(signalHost, {
          stream: output.stream,
          config: rtcConfig
        })
        this.swarm = swarm
        let myinfo = {
          username: this.storage.get('username') || null,
          publicKey: swarm.publicKey
        }
        swarm.log.add(null, myinfo)
        let usernames = {}
        swarm.feed.on('data', node => {
          let doc = node.value
          if (doc.username && doc.publicKey) {
            usernames[doc.publicKey] = doc.username
            $(`#a${doc.publicKey} div.person-name`).text(doc.username)
          }
        })
        swarm.joinRoom(roomHost, room)
        swarm.on('stream', stream => {
          let audio = waudio(stream)
          audio.connect(this.masterSoundOutput)
          let remotes = values(swarm.peers).length
          let publicKey = stream.peer.publicKey
          let username = usernames[publicKey] || `Caller (${remotes})`
          let elem = views.remoteAudio(this.storage, username, publicKey)
          connectAudio(context, elem, audio)
          byId('audio-container').appendChild(elem)
        })
        swarm.on('disconnect', pubKey => {
          if (recordingStreams[pubKey]) {
            recordingStreams[pubKey].emit('end')
          } else {
            $(`#a${pubKey}`).remove()
          }
        })

        byId('audio-container').appendChild(myelem)
        byId('messages-container').removeChild(message)

        this.topBar.appendChild(this.settingsButton)
        this.topBar.appendChild(views.shareButton())
        this.topBar.appendChild(this.recordButton)

        views.settingsModal(this.storage).then((modal) => {
          document.body.appendChild(modal)
          this.settingsButton.onclick = () => $(modal).modal('show')
        })

        // Show a warning message if a user can not record audio
        if (typeof mimeType !== 'string') {
          this.recordButton.setAttribute('disabled', true)
          $(this.recordButton).find('span').html(`Recording not supported`)
        } else {
          this.recordButton.onclick = recording(swarm, output.stream)
        }

        views.dragDrop(files => {
          files.forEach(file => {
            let audio = this.addAudioFile(file)
            // output.add(gain.inst)
            audio.connect(output)
          })
        })

        if (!audioStream) {
          this.topBar.appendChild(bel `<div class="error notice">Listening only: no audio input available.</div>`)
        }
      })
    })
  }

  addAudioFile (file) {
    let audio = waudio(file)
    audio.connect(this.masterSoundOutput)
    let elem = views.audioFile(file, audio, context)

    connectAudio(elem, audio)
    byId('audio-container').appendChild(elem)

    return audio
  }
}

customElements.define('roll-call', RollCall)
