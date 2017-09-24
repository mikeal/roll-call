const bel = require('bel')
const dragDrop = require('drag-drop')
const getUserMedia = require('get-user-media-promise')
const waudio = require('./waudio')
const createSwarm = require('killa-beez')
const ZComponent = require('zcomponent')
const Peer = require('./peer')
const RecordButton = require('./record')
const getRTCConfig = require('../lib/getRTCConfig')

const getConfig = () => {
  return new Promise((resolve, reject) => {
    getRTCConfig((err, config) => {
      if (err) resolve(null)
      else resolve(config)
    })
  })
}

const each = (arr, fn) => {
  return Array.from(arr).forEach(fn)
}

class Call extends ZComponent {
  constructor () {
    super()
    this.roomHost = 'https://roomexchange.now.sh'
    this.serving = []
    dragDrop(this, files => {
      this.serveFiles(files)
    })
  }
  set call (val) {
    this.start(val)
  }
  async start (callid) {
    let device = await this.device

    let audioopts = {
      echoCancellation: true,
      volume: 0.9,
      deviceId: device ? {exact: device} : undefined
    }
    let mediaopts = {
      audio: audioopts,
      video: false
    }
    let [media, config] = await Promise.all([
      getUserMedia(mediaopts),
      getConfig()
    ])

    let output = waudio(media)
    let swarm = createSwarm({stream: output.stream, config})
    swarm.on('peer', peer => this.onPeer(peer))

    let record = new RecordButton()
    this.appendChild(record)
    record.swarm = swarm

    this.speakers = waudio(true)
    this.swarm = swarm
    this.output = output

    let me = new Peer()
    me.id = 'peer:me'
    me.audio = output
    me.appendChild(bel`<span slot="peername">me</span>`)
    this.appendChild(me)
    this.me = me

    swarm.joinRoom(this.roomHost, callid)
  }
  get device () {
    return this._device
  }
  onPeer (peer) {
    let elem = new Peer()
    elem.attach(peer, this.speakers)
    // TODO: serve files.
    this.appendChild(elem)
  }
  serveFiles (files) {
    this.serving = this.serving.concat(Array.from(files))
    each(this.querySelectorAll('roll-call-peer'), peer => {
      peer.serveFiles(files)
    })
  }
  get shadow () {
    return `
    <style>
      :host {
        display: flex;
        flex-wrap: wrap;
        width: 100%;
        padding: 2px 2px 2px 2px;
      }
    </style>
    <slot></slot>
    `
  }
}

window.customElements.define('roll-call', Call)

module.exports = Call
