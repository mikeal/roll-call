/* globals FileReader */
const waudio = require('./waudio')
const ZComponent = require('zcomponent')
const Visuals = require('./visuals')
const Volume = require('./volume')
const znode = require('znode')
const once = require('once')
const dragDrop = require('drag-drop')
const toBuffer = require('typedarray-to-buffer')
const { Uploader, Downloader } = require('./files')

const each = (arr, fn) => {
  return Array.from(arr).forEach(fn)
}

let totalPeers = 0

const spliceBlob = blob => {
  let promises = []
  let i = 0
  let csize = 50 * 1000  // chunk size
  while (i < blob.size) {
    ;((_blob) => {
      promises.push(new Promise((resolve, reject) => {
        let reader = new FileReader()
        reader.onload = () => resolve(toBuffer(reader.result))
        reader.readAsArrayBuffer(_blob)
      }))
    })(blob.slice(i, i + csize))
    i += csize
  }
  promises.push(null)
  return promises
}

class Peer extends ZComponent {
  constructor () {
    super()
    this.files = {}
    this.recordStreams = {}
  }
  async attach (peer, speakers) {
    this.id = `peer:${peer.publicKey}`
    peer.once('stream', async stream => {
      let audio = waudio(stream)
      audio.connect(speakers)

      this.audio = audio

      peer.meth.on('stream:znode', async stream => {
        this.rpc = await znode(stream, this.api)
      })
      this.rpc = await znode(peer.meth.stream('znode'), this.api)
    })

    let cleanup = once(() => {
      let cv = this.querySelector('canvas.roll-call-visuals')
      let ctx = cv.canvasCtx
      cv.disconnected = true
      ctx.fillStyle = 'red'
      ctx.font = '20px Courier'
      ctx.fillText('Disconnected.', 70, 30)
      this.disconnected = true

      let blockRemoval
      each(this.childNodes, node => {
        if (node.blockRemoval) blockRemoval = true
      })

      if (this.recording) {
        // TODO: Add disconnected info.
        this.querySelector('roll-call-recorder-file').complete = true
      } else if (!blockRemoval) {
        this.parentNode.removeChild(this)
      }
    })
    peer.on('error', cleanup)
    peer.on('close', cleanup)

    this.peer = peer

    let display = this.shadowRoot.querySelector('slot[name=peername]')
    totalPeers += 1
    display.textContent = display.textContent + ' ' + totalPeers
  }
  set audio (audio) {
    let visuals = new Visuals()
    visuals.audio = audio
    visuals.setAttribute('slot', 'visuals')
    this.appendChild(visuals)

    let volume = new Volume()
    volume.audio = audio
    volume.setAttribute('slot', 'volume')
    this.appendChild(volume)
    this._audio = audio
  }
  get audio () {
    return this._audio
  }
  set rpc (val) {
    // Fastest connection wins.
    if (this._rpc) return
    this._rpc = val
    this.onRPC(val)

    dragDrop(this, files => {
      this.serveFiles(files)
    })
  }
  get rpc () {
    return this._rpc
  }
  get api () {
    return {
      setName: name => this.setName(name),
      record: recid => this.remoteRecord(recid),
      stop: recid => this.remoteStop(recid),
      read: filename => this.remoteRead(filename),
      offerFile: obj => this.onFileOffer(obj)
    }
  }
  serveFiles (files) {
    if (!this.rpc) return // this is the me element
    files.forEach(async f => {
      let filename = f.name
      let buffers = await spliceBlob(f)
      this.files[filename] = {buffers, closed: false}
      this.rpc.offerFile({filename, size: f.size, type: f.type})

      let uploader = new Uploader()
      uploader.setAttribute('filename', filename)
      uploader.setAttribute('slot', 'recording')
      uploader.size = f.size
      uploader.fileSize = f.size
      uploader.contentType = f.type
      uploader.action = '<span>File Offered</span>'
      this.appendChild(uploader)
    })
  }
  onFileOffer (obj) {
    let downloader = new Downloader()
    downloader.filename = obj.filename
    downloader.setAttribute('filename', obj.filename)
    downloader.setAttribute('slot', 'recording')

    downloader.contentType = obj.type
    downloader.size = obj.size
    downloader.rpc = this.rpc

    this.appendChild(downloader)
  }
  async remoteRead (filename) {
    let sel = `roll-call-uploader[filename="${filename}"]`
    let chunk = await this.read(filename)
    let uploader = this.querySelector(sel)
    uploader.uploading = true
    uploader.progress(chunk)
    return chunk
  }
  remoteRecord (recid) {
    let uploader = new Uploader()
    uploader.setAttribute('filename', recid)
    uploader.setAttribute('slot', 'recording')

    uploader.contentType = 'audio/webm'
    uploader.action = '<span style="color:red">Recording</span>'
    this.appendChild(uploader)
    return this.record(recid)
  }
  remoteStop (recid) {
    return this.stop(recid)
  }
  async read (filename) {
    if (!this.files[filename]) throw new Error('No such file.')

    let f = this.files[filename]
    if (f.buffers.length) {
      return f.buffers.shift()
    }
    if (f.closed) {
      return null
    }
    return new Promise((resolve, reject) => {
      f.stream.once('data', () => {
        resolve(this.read(filename))
      })
    })
  }
  async record (recid) {
    let input = this.parentNode.output
    let stream = input.record({video: false, audio: true})

    this.recordStreams[recid] = stream
    let filename = recid
    this.files[filename] = {stream, buffers: [], closed: false}
    stream.on('data', chunk => this.files[filename].buffers.push(chunk))
    let cleanup = once(() => {
      this.files[filename].closed = true
      stream.emit('data', null)
    })
    stream.on('end', cleanup)
    stream.on('close', cleanup)
    stream.on('error', cleanup)
    return filename
  }
  async stop (recid) {
    return this.recordStreams[recid].stop()
  }
  get shadow () {
    return `
    <style>
    :host {
      border-radius: 5px;
      border: 1px solid #E0E1E2;
      width: 290px;
      display: flex;
      flex-direction: column;
      border-radius: 5px;
      border: 1px solid #E0E1E2;
      margin: 5px 5px 5px 5px;
    }
    div.peername {
      font-size: 20px;
      font-family: Courier;
      color: #3e4347;
      padding-left: 10px;
      padding-bottom: 5px;
    }
    </style>
    <div class="visuals">
      <slot name="visuals"></slot>
    </div>
    <div class="volume">
      <slot name="volume"></slot>
    </div>
    <div class="peername" contenteditable="true">
      <slot name="peername">Peer</slot>
    </div>
    <div class="recording">
      <slot name="recording"></slot>
    </div>
   `
  }
}

window.customElements.define('roll-call-peer', Peer)

module.exports = Peer
