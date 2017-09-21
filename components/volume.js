const ZComponent = require('zcomponent')
const bel = require('bel')

const micMoji = () => bel([
  `<img class="emojione" alt="🎙️" title=":microphone2:" src="https://cdn.jsdelivr.net/emojione/assets/3.1/png/128/1f399.png"/>`
])

const muteMoji = () => bel([
  `<img class="emojione" alt="🔇" title=":mute:" src="https://cdn.jsdelivr.net/emojione/assets/3.1/png/128/1f507.png"/>`
])

class Volume extends ZComponent {
  set audio (audio) {
    let elem = this.shadowRoot

    /* Wire up Mute Button */
    const muteButton = elem.querySelector('div.container div.mute-button')
    const mute = () => {
      audio.mute()
      muteButton.innerHTML = ''
      muteButton.appendChild(muteMoji())
      muteButton.onclick = unmute
      elem.querySelector('input[type=range]').disabled = true
    }
    const unmute = () => {
      audio.unmute()
      muteButton.innerHTML = ''
      muteButton.appendChild(micMoji())
      muteButton.onclick = mute
      elem.querySelector('input[type=range]').disabled = false
    }
    muteButton.onclick = mute
    muteButton.appendChild(micMoji())

    /* Wire up Volume Slider  */
    const slider = elem.querySelector(`input[type="range"]`)
    slider.oninput = () => {
      let volume = parseFloat(slider.value)
      audio.volume(volume)
    }
  }
  get shadow () {
    return `
    <style>
    :host {
      width: 100%;
      border-top: 1px solid #E0E1E2;
    }
    div.container {
      display: flex;
      padding: 10px 5px 5px 5px;
    }
    div.container div.volume {
      flex-grow: 1;
    }
    div.container div.mute-button {
      cursor: pointer;
      height: 30px;
      width: 30px;
    }
    div.container div.mute-button img {
      max-height: 30px;
    }
    div.volume {
      margin-right: 5px;
    }
    input[type=range] {
      -webkit-appearance: none;
      width: 100%;
      padding-top: 10px;
    }
    input[type=range]::-webkit-slider-runnable-track {
      height: 5px;
      background: #ddd;
      border: none;
      border-radius: 3px;
    }
    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      border: none;
      height: 16px;
      width: 16px;
      border-radius: 50%;
      background: #3083FC;
      margin-top: -5px;
    }
    input[type=range]:disabled::-webkit-slider-thumb {
      background: #BEBEBE;
    }
    input[type=range] {
      /* fix for FF unable to apply focus style bug  */
      border: 1px solid white;
      /*required for proper track sizing in FF*/
      width: 100%;
    }
    input[type=range]::-moz-range-track {
        height: 5px;
        background: #ddd;
        border: none;
        border-radius: 3px;
    }
    input[type=range]::-moz-range-thumb {
        border: none;
        height: 16px;
        width: 16px;
        border-radius: 50%;
        background: #3083FC;
    }
    input[type=range]:disabled::-moz-range-thumb {
      background: #BEBEBE;
    }
    input[type=range]:-moz-focusring{
        outline: 1px solid white;
        outline-offset: -1px;
    }
    input[type=range]:focus::-moz-range-track {
        background: #ccc;
    }
    input[type=range]:focus {
        outline: none;
    }
    input[type=range]:focus::-webkit-slider-runnable-track {
        background: #ccc;
    }
    </style>
    <div class="container">
      <div class="mute-button">
      </div>
      <div class="volume">
        <input type="range" min="0" max="2" step=".01" value="1">
      </div>
    </div>
    `
  }
}

window.customElements.define('roll-call-volume', Volume)

module.exports = Volume
