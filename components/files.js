const ZComponent = require('./z-component')
const bel = require('bel')

const iconMap = {
  'audio': `<img slot="icon" class="emojione" alt="🎧" title=":minidisc:"
  src="https://cdn.jsdelivr.net/emojione/assets/3.1/png/128/1f3a7.png"/>`
}

class FileShare extends ZComponent {
  // set filename (value) {
  //
  //   this._filename = value
  // }
  // get filename () {
  //   return this._filename
  // }
  set contentType (contentType) {
    // TODO: set icon for slot
    for (let key in iconMap) {
      if (contentType.startsWith(key)) {
        this.appendChild(bel([iconMap[key]]))
      }
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
    ::slotted(img.emojione) {
      width: 20px;
      height: 20px;
    }
    div.action {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    div.action * {
      min-width: 0;
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
  progress (chunk) {
    if (chunk === null) {
      this.complete = true
      return
    }
    this.size += chunk.length
  }
  set action (value) {
    this.shadowRoot.querySelector('div.action').innerHTML = value
  }
  set size (value) {
    this._size = value
    let size = this._size
    if (size > (1000000)) {
      size = (size / 1000000).toFixed(2)
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
}

class Downloader extends FileShare {

}

window.customElements.define('roll-call-uploader', Uploader)
window.customElements.define('roll-call-downloader', Downloader)
exports.Downloader = Downloader
exports.Uploader = Uploader
