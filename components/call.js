/* globals AudioContext */
const funky = require('funky')
const getUserMedia = require('getusermedia')
const createSwarm = require('killa-beez')
const getRtcConfig = require('../lib/getRtcConfig')

const random = () => Math.random().toString(36).substring(7)

const waudioComponent = require('../components/waudio')

const removeElement = id => {
  let el = document.getElementById(id)
  el.parentNode.removeChild(el)
}

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
      let myinfo = {
        username: 'TODO',
        publicKey: swarm.publicKey
      }
      swarm.log.add(null, myinfo)
      let usernames = {}

      swarm.feed.on('data', node => {
        let doc = node.value
        if (doc.username && doc.publicKey) {
          // TODO: set visual info on audio elements.
        }
      })

      swarm.joinRoom(opts.roomHost, opts.room)

      swarm.on('stream', stream => {
        let audio = waudio(stream)
        audio.connect(elem.monitor)

        let publicKey = stream.peer.publicKey
        let peerElem = waudioComponent({audio: audio})
        peerElem.id = `a${publicKey}`

        // TODO: setup username and publicKey info on component
        // let remotes = values(swarm.peers).length
        // let username = usernames[publicKey] || `Caller (${remotes})`
        elem.querySelector('rollcall-peers').appendChild(peerElem)
      })

      swarm.on('disconnect', publicKey => {
        // TODO: Handle recording
        // if (recordingStreams[publicKey]) {
        //   recordingStreams[publicKey].emit('end')
        // } else {
            // removeElement(`a${publicKey}`)
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
}

const view = funky`
${init}
<rollcall-call>
  <style>
    rollcall-peers {
      width: 100%;
      display: flex;
    }
  </style>
  <rollcall-peers>
  </rollcall-peers>
</rollcall-call>
`
module.exports = view
