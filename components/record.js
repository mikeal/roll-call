/* globals Blob, URL */
const ZComponent = require('./z-component')
const once = require('once')
const bel = require('bel')
const emojione = require('emojione')

const values = obj => Object.keys(obj).map(k => obj[k])
const random = () => Math.random().toString(36).substring(7)

const files = {}
const write = async (filename, chunk) => {
  if (!files[filename]) files[filename] = []
  files[filename].push(chunk)
  return true
}

class FileDownload extends ZComponent {
  constructor () {
    super()
    let bytesDownloaded = bel`
      <div class="bytesDownloaded" slot="bytesDownloaded">0</div>
    `
    this.appendChild(bytesDownloaded)
  }
  async getArrayBuffers () {
    return files[this.filename]
  }

  set bytesDownloaded (size) {
    let bytesDownloaded = this.querySelector('div.bytesDownloaded')
    if (!bytesDownloaded) return
    bytesDownloaded.textContent = `${size}%`
  }
  set complete (_bool) {
    if (!_bool || _bool === 'false') return
    this._complete = true
    let moji = bel([emojione.toImage('⬇️')])
    let complete = bel`<div slot="downloadComplete">${moji}</div>`
    this.appendChild(complete)
    this.style.cursor = 'pointer'
    this.onclick = async () => {
      let arrayBuffers = await this.getArrayBuffers()
      let blob = new Blob(arrayBuffers, {type: this.contentType})
      let url = URL.createObjectURL(blob)
      let a = document.createElement('a')
      a.setAttribute('href', url)
      a.setAttribute('download', this.filename)
      a.click()
    }
  }
  get complete () {
    return this._complete
  }
  get shadow () {
    return `
    <style>
    :host {
      border-radius: 5px;
      border: 1px solid #E0E1E2;
      display: flex;
      border-radius: 5px;
      border: 1px solid #E0E1E2;
      margin: 5px 5px 5px 5px;
    }
    </style>
    <slot name="bytesDownloaded"></slot>
    <slot name="downloadComplete"></slot>
    `
  }
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
      node.peer.on('end', cleanup)
      node.peer.on('close', cleanup)
      node.peer.on('error', cleanup)
    }
  }
  async recordPeer (rpc) {
    let filename = await rpc.record(this.recording)
    rpc._recfile = filename
    let _filename = `${Date.now() - this.recordStart}-${filename}.webm`
    this.files.push(_filename)

    let fileElement = new FileDownload()
    this.appendChild(fileElement)
    fileElement.filename = _filename

    let chunk = true
    let length = 0
    while (chunk) {
      chunk = await rpc.read(filename)
      await write(_filename, chunk)
      fileElement.bytesDownloaded = length
      if (chunk) length += chunk.length
    }
    fileElement.complete = true
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
    // let starttime = this.recordStart
    // let files = this.files
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
window.customElements.define('roll-call-recorder-file', FileDownload)

module.exports = Recorder
