/* global requestAnimationFrame */
const ZComponent = require('zcomponent')

const each = (arr, fn) => {
  return Array.from(arr).forEach(fn)
}

let looping

const startLoop = () => {
  if (looping) return

  let lastTime = Date.now()
  let selector = 'canvas.roll-call-visuals'

  function draw () {
    requestAnimationFrame(draw)
    let now = Date.now()
    if (now - lastTime < 50) return

    each(document.querySelectorAll(selector), drawPerson)

    function drawPerson (canvas) {
      if (canvas.disconnected) return
      let WIDTH = canvas.width
      let HEIGHT = canvas.height
      let canvasCtx = canvas.canvasCtx
      let analyser = canvas.analyser
      let bufferLength = analyser._bufferLength

      let dataArray = new Uint8Array(bufferLength)

      analyser.getByteFrequencyData(dataArray)

      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT)
      let barWidth = (WIDTH / bufferLength) * 5
      let barHeight
      let x = 0
      let total = 0
      for (var i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 3
        if (barHeight > 10) {
          canvasCtx.fillStyle = 'rgb(66,133,244)'
          canvasCtx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight)
        }
        x += barWidth + 1
        total += barHeight
      }
      lastTime = now
      window.lastTotal = total
    }
  }
  draw()
  looping = true
}

class Visuals extends ZComponent {
  set audio (audio) {
    let canvas = document.createElement('canvas')
    canvas.height = 49
    canvas.width = 290
    let analyser = audio.context.createAnalyser()

    audio.connect(analyser)

    canvas.canvasCtx = canvas.getContext('2d')
    analyser.fftSize = 256
    analyser._bufferLength = analyser.frequencyBinCount
    canvas.canvasCtx.clearRect(0, 0, canvas.width, canvas.height)
    canvas.analyser = analyser
    canvas.classList.add('roll-call-visuals')
    this.appendChild(canvas)
    startLoop()
  }
  get shadow () {
    return `
    <style>
    :host {
      padding: 0 0 0 0;
      margin: 0 0 0 0;
    }
    ::slotted(canvas.roll-call-visuals) {
      padding: 0 0 0 0;
      margin: 0 0 0 0;
      border-bottom: 1px solid #E0E1E2;
    }
    </style>
    <slot></slot>
    `
  }
}

window.customElements.define('roll-call-visuals', Visuals)

module.exports = Visuals
