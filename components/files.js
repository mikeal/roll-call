/* globals URL, Blob */
const ZComponent = require('zcomponent')
const bel = require('bel')

const iconMap = {
  'audio': `<img slot="icon" class="emojione" alt="🎧"
  src="https://cdn.jsdelivr.net/emojione/assets/3.1/png/128/1f3a7.png"/>`,
  'image': `<img slot="icon" class="emojione" alt="🖼️"
  src="https://cdn.jsdelivr.net/emojione/assets/3.1/png/128/1f5bc.png"/>`,
  'video': `<img slot="icon" class="emojione" alt="📹"
  src="https://cdn.jsdelivr.net/emojione/assets/3.1/png/128/1f4f9.png"/>`,
  'text': `<img slot="icon" class="emojione" alt="📃"
  src="https://cdn.jsdelivr.net/emojione/assets/3.1/png/128/1f4c3.png"/>`
}

class FileShare extends ZComponent {
  set contentType (contentType) {
    // TODO: set icon for slot
    for (let key in iconMap) {
      if (contentType.startsWith(key)) {
        this.appendChild(bel([iconMap[key]]))
      }
    }
  }
  set action (value) {
    let action = this.shadowRoot.querySelector('div.action')
    if (typeof value === 'string') {
      action.innerHTML = value
    } else {
      action.innerHTML = ''
      action.appendChild(value)
    }
  }
  set size (value) {
    this._size = value
    let size = this._size
    if (size > (1000000)) {
      size = parseInt(size / 1000000)
      size += 'm'
    } if (size > 1000) {
      size = parseInt(size / 1000)
      size += 'k'
    } else {
      size += 'b'
    }
    this.shadowRoot.querySelector('div.size').textContent = size
  }
  get size () {
    return this._size || 0
  }
  progress (chunk) {
    if (chunk === null) {
      this.complete = true
      return
    }
    this.size += chunk.length
    let elem = this.shadowRoot.querySelector('progress')
    if (elem) {
      elem.setAttribute('value', this.size)
    }
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
      font-family: Courier;
      font-size: 20px;
      flex-direction: row;
      padding: 5px 5px 5px 5px;
      margin: 5px 5px 5px 5px;
      justify-content: space-between;
    }
    ::slotted(img.emojione), img.emojione {
      width: 21px;
      height: 21px;
      padding-top: 1px;
      margin-right: 10px;
    }
    div.size {
      margin-left: 10px;
    }
    div.action {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    div.action * {
      min-width: 0;
    }
    span.action-link {
      color: blue;
      cursor: pointer;
    }
    progress {
      width: 180px;
    }
    </style>
    <slot class="icon" name="icon">
      <img class="emojione" alt="💽" title=":minidisc:"
        src="https://cdn.jsdelivr.net/emojione/assets/3.1/png/128/1f4bd.png"/>
    </slot>
    <div class="action">
    </div>
    <div class="size">
    </div>
    `
  }
}

class Uploader extends FileShare {
  constructor () {
    super()
    let sizeElement = this.shadowRoot.querySelector('div.size')
    sizeElement.setAttribute('title', 'uploaded')
  }
  set uploading (value) {
    if (!this._uploading) {
      this._uploading = true
      let progress = bel([`
        <progress value="0" max="${this.size}"></progress>
      `])
      this.size = 0
      this.action = progress
    }
  }
  set complete (value) {
    this.action = 'Sent'
  }
}

class Downloader extends FileShare {
  constructor () {
    super()
    let sizeElement = this.shadowRoot.querySelector('div.size')
    sizeElement.setAttribute('title', 'file size')
    this.chunks = []
  }
  set rpc (rpc) {
    let f = this.filename
    let start = bel`
      <span title="${f}" class="action-link">${f}</span>
    `
    start.onclick = async () => {
      start.onclick = null
      let progress = bel([`
        <progress value="0" max="${this.size}"></progress>
      `])
      this.action = progress
      this.size = 0
      let chunk = true
      let i = 0
      while (chunk) {
        chunk = await rpc.read(this.filename, i)
        if (chunk && chunk.length) {
          this.write(chunk)
          i += chunk.length
          this.progress(chunk)
        }
      }
      this.complete = true
    }
    this.action = start
  }
  write (chunk) {
    this.chunks.push(chunk)
  }
  set complete (value) {
    // TODO: wire up save button.
    let f = this.filename
    let save = bel`<span title="${f}" class="action-link">Save</span>`
    save.onclick = async () => {
      let blob = new Blob(this.chunks, {type: this.contentType})
      let url = URL.createObjectURL(blob)
      let a = document.createElement('a')
      a.setAttribute('href', url)
      a.setAttribute('download', this.filename)
      a.click()
    }
    this.action = save
    this.blockRemoval = true
  }
}

window.customElements.define('roll-call-uploader', Uploader)
window.customElements.define('roll-call-downloader', Downloader)
exports.Downloader = Downloader
exports.Uploader = Uploader
