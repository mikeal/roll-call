const bel = require('bel')
const waudio = require('./waudio')
const createSwarm = require('killa-beez')
const ZComponent = require('./z-component')
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

const random = () => Math.random().toString(36).substring(7)

class Call extends ZComponent {
  constructor () {
    super()
    this.roomHost = 'https://roomexchange.now.sh'
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
      audio: true,
      video: false
    }
    let [media, config] = await Promise.all([
      await navigator.mediaDevices.getUserMedia(mediaopts),
      await getConfig()
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
    elem.attach(peer, this)
    this.appendChild(elem)
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
