/* globals requestAnimationFrame */
const funky = require('funky')
const bel = require('bel')
const emojione = require('emojione')

const gainInit = (elem, opts) => {
  if (!opts.audio) throw new Error('Missing audio arguments.')
  // TODO: wire up slider to modify gain
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
  gain-control div.container input {
    flex-grow: 1;
  }
  gain-control div.container img {
    max-height: 30px;
    cursor: pointer;
  }

  gain-control div.container input[type=range] {
    -webkit-appearance: none;
  }

  gain-control div.container input[type=range]::-webkit-slider-runnable-track {
    width: 300px;
    height: 5px;
    background: #ddd;
    border: none;
    border-radius: 3px;
  }

  gain-control div.container input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    border: none;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: #3083FC;
    margin-top: -5px;
  }

  gain-control div.container input[type=range] {
    /* fix for FF unable to apply focus style bug  */
    border: 1px solid white;

    /*required for proper track sizing in FF*/
    width: 300px;
  }

  gain-control div.container input[type=range]::-moz-range-track {
      width: 300px;
      height: 5px;
      background: #ddd;
      border: none;
      border-radius: 3px;
  }

  gain-control div.container input[type=range]::-moz-range-thumb {
      border: none;
      height: 16px;
      width: 16px;
      border-radius: 50%;
      background: goldenrod;
  }

  /*hide the outline behind the border*/
  gain-control div.container input[type=range]:-moz-focusring{
      outline: 1px solid white;
      outline-offset: -1px;
  }

  gain-control div.container input[type=range]:focus::-moz-range-track {
      background: #ccc;
  }

  gain-control div.container input[type=range]:focus {
      outline: none;
  }

  gain-control div.container
  input[type=range]:focus::-webkit-slider-runnable-track {
      background: #ccc;
  }
  </style>
  <div class="container">
    ${bel([emojione.toImage('🎙')])}
    <input type="range" min="0" max="2" step=".05" value="1">
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
