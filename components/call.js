/* globals AudioContext */
const funky = require('funky')
const getUserMedia = require('getusermedia')
const createSwarm = require('killa-beez')
const emojione = require('emojione')
const bel = require('bel')

const getRtcConfig = require('../lib/getRtcConfig')
const multiget = require('../lib/multiget')

const random = () => Math.random().toString(36).substring(7)

const settings = require('./settings')
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
  div.emoji img {
    max-height: 30px;
  }
  div.displayname {
    padding-left: 5px;
  }
  </style>
  <div class="emoji">
    ${doc => {
      if (doc.emoji) return bel([emojione.toImage(doc.emoji)])
      else return bel([emojione.toImage('🙅')])
    }}
  </div>
  <div class="displayname">${doc => doc.displayname}</div>
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

  elem.monitor = waudio()
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
      audioElem.id = `a${swarm.publicKey}`

      let parent = null
      let update = () => {
        multiget(opts.levelup, ['displayname', 'emoji'], (err, info) => {
          if (err) return // Something went terribly wrong.
          info.publicKey = swarm.publicKey
          swarm.log.add(parent, info, (err, node) => {
            if (!err) parent = node.key
          })
        })
      }
      if (opts.levelup) update()
      opts.onSettingsUpdate = () => {
        console.log('updated')
        update()
      }
      let displaynames = {}

      swarm.feed.on('data', node => {
        let doc = node.value
        if (doc.displayname && doc.publicKey) {
          let el = document.getElementById(`a${doc.publicKey}`)
          if (el) {
            let infoElem = el.querySelector('card-section.info')
            setElem(infoElem, peerInfoComponent(doc))
          }
        }
      })

      swarm.joinRoom(opts.roomHost, opts.room)

      swarm.on('stream', stream => {
        let audio = waudio(stream)
        audio.connect(elem.monitor)

        let publicKey = stream.peer.publicKey
        let peerElem = waudioComponent({audio: audio})
        peerElem.id = `a${publicKey}`

        peerElem.querySelector('input[type=range]').value = .1

        // TODO: setup displayname and publicKey info on component
        // let remotes = values(swarm.peers).length
        // let displayname = displaynames[publicKey] || `Caller (${remotes})`
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

    //   byId('audio-container').appendChild(myelem)
    //   byId('messages-container').removeChild(message)

    //   const topBar = byId('top-bar')
    //   topBar.appendChild(settingsButton)
    //   topBar.appendChild(views.shareButton())
    //   topBar.appendChild(recordButton)

    //   views.settingsModal(storage).then((modal) => {
    //     document.body.appendChild(modal)
    //     settingsButton.onclick = () => $(modal).modal('show')
    //   })

    //   // Show a warning message if a user can not record audio
    //   if (typeof mimeType !== 'string' && typeof MediaRecorder.isTypeSupported === 'function') {
    //     recordButton.setAttribute('disabled', true)
    //     $(recordButton).find('span').html(`Recording not supported`)
    //   } else {
    //     recordButton.onclick = recording(swarm, output.stream)
    //   }

    //   views.dragDrop((files) => {
    //     files.forEach(file => {
    //       let audio = addAudioFile(file)
    //       // output.add(gain.inst)
    //       audio.connect(output)
    //     })
    //   })

    //   if (!audioStream) {
    //     topBar.appendChild(bel `<div class="error notice">Listening only: no audio input available.</div>`)
    //   }
    })
  })
  if (opts.levelup) {
    elem.querySelector('rollcall-topbar').appendChild(settings(opts))
  }
  if (opts.recording) {
    // TODO: Enabled recording
  }
}

const view = funky`
${init}
<rollcall-call>
  <style>
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
