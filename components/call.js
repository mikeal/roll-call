/* globals AudioContext */
const funky = require('funky')
const getUserMedia = require('getusermedia')
const bel = require('bel')
const createSwarm = require('../../killa-beez')

const getRtcConfig = require('../lib/getRtcConfig')
const sodiAuthority = require('../../sodi-authority')
const bongBong = require('../../bong-bong/components/bong-bong')

const random = () => Math.random().toString(36).substring(7)

const settings = require('./settings')
// const record = require('./record')
const waudioComponent = require('./waudio')

const removeElement = id => {
  let el = document.getElementById(id)
  el.parentNode.removeChild(el)
}

const peerInfoComponent = funky`
<peer-info>
  <style>
  peer-info {
    display: flex;
    font-family: Lato,'Helvetica Neue',Arial,Helvetica;
    color: #3e4347;
    padding: 0px 5px 0px 5px;
    align-items: center;
  }
  peer-avatar img {
    max-height: 30px;
  }
  peer-name {
    padding-left: 5px;
  }
  </style>
  <peer-avatar><img src="${opts => opts.avatar_url}" /></peer-avatar>
  <peer-name>
    ${opts => bel`<span><strong>@${opts.login}</strong> ${opts.name}</span>`}
  </peer-name>
</peer-info>
`

const init = (elem, opts) => {
  if (!opts) opts = {}
  if (!opts.room) opts.room = random()
  if (!opts.audioContext) opts.audioContext = new AudioContext()
  if (!opts.media) opts.media = { audio: true, video: false }

  if (!opts.token) opts.token = sodiAuthority.load('token')

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
    elem.querySelector('rollcall-peers').appendChild(waudioComponent({audio: audio}))
    elem.querySelector('rollcall-peers').appendChild(waudioComponent({audio: audio}))
    elem.querySelector('rollcall-peers').appendChild(waudioComponent({audio: audio}))
    elem.querySelector('rollcall-peers').appendChild(waudioComponent({audio: audio}))
    elem.querySelector('rollcall-peers').appendChild(waudioComponent({audio: audio}))
    elem.querySelector('rollcall-peers').appendChild(waudioComponent({audio: audio}))
    elem.querySelector('rollcall-peers').appendChild(waudioComponent({audio: audio}))
    elem.querySelector('rollcall-peers').appendChild(waudioComponent({audio: audio}))


    opts.onSettingsUpdate = () => {
      let me = opts.token.signature.message.user
      let myinfo = peerInfoComponent(me)
      console.log(me)
      audioElem.querySelector('card-section.info').appendChild(myinfo)
    }
    if (opts.token) opts.onSettingsUpdate()

    getRtcConfig((err, rtcConfig) => {
      if (err) console.error(err) // non-fatal error

      let swarm = createSwarm({
        stream: elem.output.stream,
        config: rtcConfig,
        signalHost: opts.signalHost,
        roomHost: opts.roomHost
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

      // Disabled until additional UX decisions are made.

      // if (opts.levelup && opts.recording) {
      //   elem.querySelector('rollcall-topbar').appendChild(record(opts))
      // }
    })
  })
  if (opts.levelup) {
    elem.querySelector('rollcall-topbar').appendChild(settings(opts))
  }
  let chatopts = {room: opts.room, disableApps: true, disableSettings: true}
  elem.querySelector('rollcall-bong-container').appendChild(bongBong(chatopts))
}

const view = funky`
${init}
<rollcall-call>
  <style>
    rollcall-call {
      display: flex;
      flex-wrap: wrap;
      width: 100%;
      height: 100%;
      overflow: hidden;
      padding: 2px 2px 2px 2px;
      flex-flow: column;
    }
    rollcall-topbar {
      width: 100%;
    }
    rollcall-content {
      width: 100%;
      display: flex;
      height: 100%;
      padding-top: 5px;
    }
    rollcall-peers {
      display: flex;
      flex-direction: column;
      overflow: scroll;
      height: 99%;
      margin-left: 5px;
      padding-bottom: 2px;
      border-bottom: 1px solid #E0E1E2;
    }
    rollcall-peers waudio-card {
      margin: 2px 2px 2px 2px;
    }
    rollcall-chat {
      flex-grow: 2;
      flex-flow: column;
      height: 100%;
      display: flex;
      padding-left: 5px;
      padding-top: 2px;
      padding-right: 7px;
    }
    rollcall-bong-container {
      border-radius: 5px;
      border: 1px solid #E0E1E2;
      flex-flow: column;
      height: 99%;
    }
    div.bb-header {
      border-bottom: none !important;
    }
    bong-bong {
      border-radius: 5px !important;
    }
  </style>
  <rollcall-topbar>
  </rollcall-topbar>
  <rollcall-content>
    <rollcall-peers>
    </rollcall-peers>
    <rollcall-chat>
      <rollcall-bong-container>
      </rollcall-bong-container>
    </rollcall-chat>
  </rollcall-content>
</rollcall-call>
`
module.exports = view
