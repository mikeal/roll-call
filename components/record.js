const ZComponent = require('./z-component')
const waudio = require('./waudio')
const once = require('once')
const emojione = require('emojione')

const values = obj => Object.keys(obj).map(k => obj[k])
const random = () => Math.random().toString(36).substring(7)

class File extends ZComponent {

}

const files = {}
const write = async (filename, chunk) => {
  if (!files[filename]) files[filename] = []
  files[filename].push(chunk)
  return true
}

class Recorder extends ZComponent {
  constructor () {
    super()
    this.peers = {}
  }
  set swarm (swarm) {
    let call = this.parentNode
    call.onAddedNode = child => {
      if (child.tagName !== 'ROLL-CALL-PEER') return
      this.onPeer(child)
    }
    let button = this.shadowRoot.querySelector('div.record-button')
    button.onclick = () => {
      this.start()
      button.innerHTML = emojione.toImage('⏹️')
      button.onclick = () => {
        this.stop()
        button.parentNode.removeChild(button)
      }
    }
  }
  onPeer (node) {
    if (node.peer) {
      let key = node.peer.publicKey
      node.onRPC = rpc => {
        // TODO: Start recording if we are in a recording state.
        this.peers[key] = node
      }
      let cleanup = once(() => {
        // TODO: While recording end recording pulls.
        delete this.peers[key]
      })
      node.peer.on('close', cleanup)
      node.peer.on('error', cleanup)
    }
  }
  async recordPeer (rpc) {
    let filename = await rpc.record(this.recording)
    rpc._recfile = filename
    let _filename = `${Date.now() - this.recordStart}-${filename}`
    this.files.push(_filename)
    let chunk = true
    let length = 0
    while (chunk) {
      chunk = await rpc.read(filename)
      await write(_filename, chunk)
      length += chunk.length
    }
  }
  start () {
    this.recording = random()
    this.files = []
    this.recordStart = Date.now()

    values(this.peers).forEach(peer => {
      // TODO: create element for recording download and pass to record peer
      this.recordPeer(peer.rpc)
    })

    let me = this.parentNode.me
    let rpc = {read: f => me.read(f), record: recid => me.record(recid)}
    this.recordPeer(rpc)
  }
  stop () {
    let recid = this.recording
    let starttime = this.recordStart
    let files = this.files
    delete this.recording
    delete this.recordStart
    delete this.files
    values(this.peers).forEach(async peer => {
      if (peer.rpc._recfile) await peer.rpc.stop(recid)
    })
    this.parentNode.me.stop(recid)
  }
  get shadow () {
    return `
    <style>
    :host {
      display: flex;
      width: 100%;
      flex-grow: 10;
    }
    div.record-button {
      cursor: pointer;
    }

    </style>
    <div class="recording-buttons">
      <div class="record-button">
        ${emojione.toImage('🔴')}
      </div>
      <slot></slot>
    </div>
    `
  }
}

window.customElements.define('roll-call-recorder', Recorder)

module.exports = Recorder
