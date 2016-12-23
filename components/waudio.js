/* globals requestAnimationFrame */
const funky = require('funky')
const bel = require('bel')
const emojione = require('emojione')

const volumeInit = (elem, opts) => {
  const input = elem.querySelector('input[type=range]')
  if (opts.audio) {
    input.onchange = () => {
      opts.audio.volume(input.value)
    }
  }
}

const volumeSlider = funky`
${volumeInit}
<volume-slider>
  <style>
  volume-slider {
    margin-right: 5px;
  }
  volume-slider input[type=range] {
    -webkit-appearance: none;
    width: 100%;
    padding-top: 10px;
  }
  volume-slider input[type=range]::-webkit-slider-runnable-track {
    height: 5px;
    background: #ddd;
    border: none;
    border-radius: 3px;
  }
  volume-slider input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    border: none;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: #3083FC;
    margin-top: -5px;
  }
  volume-slider input[type=range]:disabled::-webkit-slider-thumb {
    background: #BEBEBE;
  }
  volume-slider input[type=range] {
    /* fix for FF unable to apply focus style bug  */
    border: 1px solid white;

    /*required for proper track sizing in FF*/
    width: 100%;
  }
  volume-slider input[type=range]::-moz-range-track {
      height: 5px;
      background: #ddd;
      border: none;
      border-radius: 3px;
  }
  volume-slider input[type=range]::-moz-range-thumb {
      border: none;
      height: 16px;
      width: 16px;
      border-radius: 50%;
      background: #3083FC;
  }
  volume-slider input[type=range]:disabled::-moz-range-thumb {
    background: #BEBEBE;
  }
  volume-slider input[type=range]:-moz-focusring{
      outline: 1px solid white;
      outline-offset: -1px;
  }
  volume-slider input[type=range]:focus::-moz-range-track {
      background: #ccc;
  }
  volume-slider input[type=range]:focus {
      outline: none;
  }
  volume-slider input[type=range]:focus::-webkit-slider-runnable-track {
      background: #ccc;
  }
  </style>
  <input type="range" min="0" max="2" step=".05" value="1">
</volume-slider>
`

const gainInit = (elem, opts) => {
  if (!opts.audio) throw new Error('Missing audio arguments.')
  // TODO: wire up slider to modify gain
  const muteButton = elem.querySelector('div.container div.mute-button')
  const mute = () => {
    opts.audio.mute()
    muteButton.onclick = unmute
    muteButton.innerHTML = ''
    muteButton.appendChild(bel([emojione.toImage('🔇')]))
    elem.querySelector('input[type=range]').disabled = true
  }
  const unmute = () => {
    opts.audio.unmute()
    muteButton.onclick = mute
    muteButton.innerHTML = ''
    muteButton.appendChild(bel([emojione.toImage('🎙')]))
    elem.querySelector('input[type=range]').disabled = false
  }
  muteButton.onclick = mute
}

const gainControl = funky`
${gainInit}
<gain-control>
  <style>
  gain-control {
    width: 100%;
    border-top: 1px solid #E0E1E2;
  }
  gain-control div.container {
    display: flex;
    padding: 10px 5px 5px 5px;
  }
  gain-control div.container volume-slider {
    flex-grow: 1;
  }
  gain-control div.container div.mute-button {
    cursor: pointer;
    height: 30px;
    width: 30px;
  }
  gain-control div.container div.mute-button img {
    max-height: 30px;
  }
  </style>
  <div class="container">
    <div class="mute-button">
      ${bel([emojione.toImage('🎙')])}
    </div>
    ${volumeSlider}
  </div>
</gain-control>
`

let looping

const startLoop = () => {
  if (looping) return

  let lastTime = Date.now()
  let selector = 'canvas.waudio-visualization'

  function draw () {
    requestAnimationFrame(draw)
    let now = Date.now()
    if (now - lastTime < 50) return

    let elements = [...document.querySelectorAll(selector)]
    elements.forEach(drawPerson)

    function drawPerson (canvas) {
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
      // let total = 0
      for (var i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i]
        if (barHeight > 10) {
          canvasCtx.fillStyle = 'rgb(66,133,244)'
          canvasCtx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight)
        }
        x += barWidth + 1
        // total += barHeight
      }
      lastTime = now
    }
  }
  draw()
  looping = true
}

const init = (elem, opts) => {
  if (!opts.audio) throw new Error('Missing audio arguments.')

  let canvas = elem.querySelector('canvas')
  console.log(opts.audio)
  let analyser = opts.audio.context.createAnalyser()
  opts.audio.connect(analyser)

  canvas.canvasCtx = canvas.getContext('2d')
  analyser.fftSize = 256
  analyser._bufferLength = analyser.frequencyBinCount
  canvas.canvasCtx.clearRect(0, 0, canvas.width, canvas.height)
  canvas.analyser = analyser

  startLoop()

  let gainElem = gainControl({audio: opts.audio})
  elem.querySelector('card-section.controls').appendChild(gainElem)
}

const view = funky`
${init}
<waudio-card>
  <style>
    waudio-card {
      min-width: 100px;
      max-width: 250px;
      border-radius: 5px;
      border: 1px solid #E0E1E2;
      padding-bottom: 5px;
    }
    waudio-card card-section {
      display: flex;
      width: 100%;
    }
    waudio-card card-section.visualization canvas {
      height: 40px;
      width: 100%;
    }
    waudio-card card-section.controls {
    }
  </style>
  <card-section class="visualization">
    <canvas class="waudio-visualization"></canvas>
  </card-section>
  <card-section class="controls"></card-section>
  <card-section class="info"></card-section>
</waudio-card>
`
module.exports = view
