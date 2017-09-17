/* globals Blob, URL */
const ZComponent = require('./z-component')
const once = require('once')
const emojione = require('emojione')
// const loadjs = require('load-js')

emojione.emojiSize = 128

// const jszip = `
//   https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.4/jszip.min.js
// `

const values = obj => Object.keys(obj).map(k => obj[k])
const random = () => Math.random().toString(36).substring(7)

const files = {}
const write = async (filename, chunk) => {
  if (!files[filename]) files[filename] = []
  files[filename].push(chunk)
  return true
}

const formatTime = ms => {
  if (ms > 1000 * 60) {
    ms = parseInt(ms / (1000 * 60))
    ms += 'm'
  } else if (ms > 1000) {
    ms = parseInt(ms / 1000)
    ms += 's'
  } else {
    ms += 'ms'
  }
  return ms
}

class FileDownload extends ZComponent {
  async getArrayBuffers () {
    return files[this.filename]
  }
  set delay (ms) {
    let node = this.shadowRoot.querySelector('div.delay')
    node.textContent = formatTime(ms)
  }
  set recordTime (ms) {
    if (ms < 1000) return
    let node = this.shadowRoot.querySelector('div.total-time')
    node.textContent = formatTime(ms)
  }

  set bytesDownloaded (size) {
    let sel = 'div.bytesDownloaded'
    let bytesDownloaded = this.shadowRoot.querySelector(sel)
    if (!bytesDownloaded) return
    if (size > (1000000)) {
      size = (size / 1000000).toFixed(2)
      size += 'm'
    } if (size > 1000) {
      size = parseInt(size / 1000)
      size += 'k'
    } else {
      size += 'b'
    }
    bytesDownloaded.textContent = size
  }
  set complete (_bool) {
    if (!_bool || _bool === 'false') return
    this._complete = true
    this.style.color = 'blue'
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
      font-family: monospace;
      font-size: 20px;
      flex-direction: column;
      padding: 5px 5px 1px 5px;
      margin: 5px 5px 5px 5px;
    }
    div.recording-info {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
    }
    div.disc img.emojione {
      width: 20px;
      height: 20px;
    }
    </style>
    <div class="recording-info">
      <div class="disc">${emojione.toImage('💽')}</div>
      <div title="record delay" class="delay"></div>
      <div title="record time" class="total-time">0s</div>
      <div title="downloaded" class="bytesDownloaded">0b</div>
    </div>
    `
  }
}

// class Recording extends ZComponent {

// }

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
      button.textContent = 'Stop Recording'
      button.onclick = () => {
        this.stop()
        button.textContent = 'Downloading...'
      }
    }
  }
  onPeer (node) {
    if (node.peer) {
      let key = node.peer.publicKey
      node.onRPC = rpc => {
        this.peers[key] = node
        if (this.recording) {
          this.recordPeer(rpc, node)
        }
      }
      let cleanup = once(() => {
        // if (this.recording) return
        delete this.peers[key]
      })
      node.peer.on('end', cleanup)
      node.peer.on('close', cleanup)
      node.peer.on('error', cleanup)
    }
  }
  async recordPeer (rpc, peerNode) {
    let filename = await rpc.record(this.recording)
    rpc._recfile = filename
    // TODO: ping/pong to remove half of RTT from delay.
    let delay = Date.now() - this.recordStart
    let _filename = `${delay}-${filename}.webm`
    this.files.push(_filename)

    let fileElement = new FileDownload()
    fileElement.starttime = Date.now()
    fileElement.filename = _filename
    fileElement.delay = delay
    fileElement.setAttribute('slot', 'recording')
    peerNode.appendChild(fileElement)
    peerNode.recording = this.recording

    let chunk = true
    let length = 0
    while (chunk) {
      chunk = await rpc.read(filename)
      fileElement.recordTime = Date.now() - fileElement.starttime
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
      this.recordPeer(peer.rpc, peer)
    })

    let me = this.parentNode.me
    let rpc = {read: f => me.read(f), record: recid => me.record(recid)}
    this.recordPeer(rpc, document.getElementById('peer:me'))
  }
  async stop () {
    clearInterval(this.interval)
    let recid = this.recording
    // let starttime = this.recordStart
    // let files = this.files
    delete this.recording
    delete this.recordStart
    delete this.files
    let promises = values(this.peers)
      .filter(p => p.rpc._recfile)
      .map(p => p.rpc.stop(recid))
    await Promise.all(promises)
    this.parentNode.me.stop(recid)
    this.onEnd(recid)
  }
  onEnd (recid) {
    let button = this.shadowRoot.querySelector('div.record-button')
    button.innerHTML = ''
  }
  get shadow () {
    return `
    <style>
    :host {
      display: flex;
      width: 100%;
      flex-grow: 10;
      font-family: monospace;
      margin: 5px 5px 5px 5px;
      flex-direction: row;
    }
    div.record-button {
      cursor: pointer;
      color: blue;
      font-size: 20px;
      margin-left: 1px;
    }
    </style>
    <div class="recording-buttons">
      <div class="record-button">
        Start Recording
      </div>
      <slot></slot>
    </div>
    `
  }
}

window.customElements.define('roll-call-recorder', Recorder)
window.customElements.define('roll-call-recorder-file', FileDownload)

module.exports = Recorder
