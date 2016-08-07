var funk = require('../../funky')

// TODO: Live elements
// TODO: Click functions

var view = funk`
  <div class="card"
       peerId="${ person => person.peerId || 'me' }"
    >
    <div class="image" style="height:200px;">
      <canvas id="canvas" 
        width="200" 
        height="200"
        class="person"
        style="background: url('${ person => person.gravatar}');
               background-size:contain"
        >
      </canvas>
    </div>
    <div class="extra content">
      <a>
        <i class="user icon"></i>
       <a class="header">${ p => p.realname || p.email }</a>
      </a>
    </div>
  </div>
`

const WIDTH = 200
const HEIGHT = 200
let looping

function startLoop () {
  if (looping) return
  
  let lastTime = Date.now()

  function draw() {
    drawVisual = requestAnimationFrame(draw)
    var now = Date.now()
    if (now - lastTime < 50) return

    var elements = [...document.querySelectorAll('canvas.person')]
    elements.forEach(drawPerson)

    function drawPerson (canvas) {
      var canvasCtx = canvas.canvasCtx
      var analyser = canvas.analyser
      var bufferLength = analyser._bufferLength

      var dataArray = new Uint8Array(bufferLength)

      analyser.getByteFrequencyData(dataArray)

      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT)
      var barWidth = (WIDTH / bufferLength) * 2.5
      var barHeight
      var x = 0;
      for(var i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i]/3
        if (barHeight > 10) {
          canvasCtx.fillStyle = 'rgb(66,133,244)'
          canvasCtx.fillRect(x,HEIGHT-barHeight/2,barWidth,barHeight)
        }
        x += barWidth + 1
      }
      lastTime = now
    }
  }
  draw()
  looping = true
}

function addPerson (person) {
  // person {email, gravatar, peerId, media}

  var stream = person.media
  var element = view(person)

  var audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  var analyser = audioCtx.createAnalyser()
  source = audioCtx.createMediaStreamSource(stream)
  source.connect(analyser)

  var canvas = element.querySelector('canvas.person')
  canvas.canvasCtx = canvas.getContext("2d")
  analyser.fftSize = 256
  analyser._bufferLength = analyser.frequencyBinCount
  canvas.canvasCtx.clearRect(0, 0, WIDTH, HEIGHT)
  canvas.analyser = analyser
  startLoop()
  
  return element
}

module.exports = addPerson
module.exports.view = view