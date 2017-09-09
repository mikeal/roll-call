const ZComponent = require('./z-component')
const waudio = require('./waudio')
const once = require('once')

const values = obj => Object.keys(obj).map(k => obj[k])

class Recording extends ZComponent {

}

const files = {}
const write = async (filename, chunk) => {
  if (!files[filename]) files[filename] = []
  files[filename].push(chunk)
  return true
}

class RecordButton extends ZComponent {
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
      console.log(this.peers)
    }
  }
  async recordPeer (peer) {
    let filename = await peer.rpc.record(this.recording)
    let _filename = `${Date.now() - this.recordStart}-${filename}`
    this.files.push(_filename)
    let chunk = true
    let length = 0
    while (chunk) {
      chunk = await peer.rpc.read(filename)
      await write(_filename, chunk)
      length += chunk.length
    }
  }
  start () {
    this.recording = random()
    this.files = []
    values(this.peers).forEach(peer => this.recordPeer(peer))
    this.recordStart = Date.now()
  }
  stop () {
    let recid = this.recording
    let starttime = this.recordStart
    let files = this.files
    delete this.recording
    delete this.recordStart
    delete this.files
  }
  // get shadow () {
  //   return `
  //   <
  //   `
  // }
}

window.customElements.define('roll-call-record-button', RecordButton)

module.exports = RecordButton
