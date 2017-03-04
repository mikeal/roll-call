/* globals AudioContext */
const funky = require('funky')
const getUserMedia = require('getusermedia')
const createSwarm = require('killa-beez')
const emojione = require('emojione')
const bel = require('bel')

const getRtcConfig = require('../lib/getRtcConfig')

const random = () => Math.random().toString(36).substring(7)

const settings = require('./settings')
const record = require('./record')
const waudioComponent = require('./waudio')

const removeElement = id => {
  let el = document.getElementById(id)
  el.parentNode.removeChild(el)
}

const setElem = (elem, content) => {
  elem.innerHTML = ''
  elem.appendChild(content)
}

const peerInfoComponent = funky`
<peer-info>
  <style>
  peer-info {
    display: flex;
    font-family: Lato,'Helvetica Neue',Arial,Helvetica;
    color: grey;
    font-size: 30px;
    padding: 5px 5px 0px 5px;
  }
  peer-avatar img {
    max-height: 30px;
  }
  peer-name {
    padding-left: 5px;
  }
  </style>
  <peer-avatar></peer-avatar>
  <peer-name></peer-name>
</peer-info>
`

const init = (elem, opts) => {
  if (!opts) opts = {}
  if (!opts.room) opts.room = random()
  if (!opts.audioContext) opts.audioContext = new AudioContext()
  if (!opts.media) opts.media = { audio: true, video: false }

  // Services for exchanges.
  if (!opts.signalHost) opts.signalHost = 'https://signalexchange.now.sh'
  if (!opts.roomHost) opts.roomHost = 'https://roomexchange.now.sh'

  const waudio = require('waudio')(opts.audioContext)

  if (opts.disable_monitor) {
    elem.monitor = waudio()
  } else {
    elem.monitor = waudio(undefined, true)
  }
  elem.microphone = waudio()
  elem.output = waudio()

  getUserMedia(opts.media, (err, mediaStream) => {
    if (err) return console.error(err)
    if (!mediaStream) return console.error('No audio stream.')
    if (opts.onUserMedia) opts.onUserMedia(mediaStream)

    let audio = waudio(mediaStream)
    audio.connect(elem.microphone)
    audio.connect(elem.output)

    let audioElem = waudioComponent({audio: audio})
    elem.querySelector('rollcall-peers').appendChild(audioElem)

    getRtcConfig((err, rtcConfig) => {
      if (err) console.error(err) // non-fatal error

      let swarm = createSwarm(opts.signalHost, {
        stream: elem.output.stream,
        config: rtcConfig
      })
      opts.swarm = swarm
      opts.output = elem.output
      audioElem.id = `a${swarm.publicKey}`

      swarm.joinRoom(opts.roomHost, opts.room)

      swarm.on('stream', stream => {
        let audio = waudio(stream)
        audio.connect(elem.monitor)

        let publicKey = stream.peer.publicKey
        let peerElem = waudioComponent({audio: audio})
        peerElem.id = `a${publicKey}`

        peerElem.querySelector('input[type=range]').value = .1

        // TODO: setup displayname and publicKey info on component
        elem.querySelector('rollcall-peers').appendChild(peerElem)
      })

      swarm.on('disconnect', publicKey => {
        // TODO: Handle recording
        // if (recordingStreams[publicKey]) {
        //   recordingStreams[publicKey].emit('end')
        // } else {
            removeElement(`a${publicKey}`)
        // }

      })

      if (opts.levelup && opts.recording) {
        elem.querySelector('rollcall-topbar').appendChild(record(opts))
      }
    })
  })
  if (opts.levelup) {
    elem.querySelector('rollcall-topbar').appendChild(settings(opts))
  }
}

const view = funky`
${init}
<rollcall-call>
  <style>
    rollcall-call {
      width: 100%;
    }
    rollcall-peers {
      width: 100%;
      display: flex;
      justify-content: space-around;
      flex-wrap: wrap;
    }
    rollcall-peers waudio-card {
      margin: 2px 2px 2px 2px;
    }
  </style>
  <rollcall-topbar>

  </rollcall-topbar>
  <rollcall-peers>
  </rollcall-peers>
</rollcall-call>
`
module.exports = view
