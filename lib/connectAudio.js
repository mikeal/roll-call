/* global window, document, $, requestAnimationFrame */
const selectall = exp => document.querySelectorAll(exp)

const WIDTH = 290
const HEIGHT = 49
let looping

function startLoop () {
  if (looping) return

  let lastTime = Date.now()

  function draw () {
    requestAnimationFrame(draw)
    var now = Date.now()
    if (now - lastTime < 50) return

    var elements = [...selectall('canvas.person')]
    elements.forEach(drawPerson)

    function drawPerson (canvas) {
      var canvasCtx = canvas.canvasCtx
      var analyser = canvas.analyser
      var bufferLength = analyser._bufferLength

      var dataArray = new Uint8Array(bufferLength)

      analyser.getByteFrequencyData(dataArray)

      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT)
      var barWidth = (WIDTH / bufferLength) * 5
      var barHeight
      var x = 0
      var total = 0
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

      if (total > 1000) {
        $(canvas.parentNode.parentNode).addClass('pulse')
      } else {
        $(canvas.parentNode.parentNode).removeClass('pulse')
      }
    }
  }
  draw()
  looping = true
}

function connectAudio (context, element, audio) {
  let analyser = context.createAnalyser()
  let volumeSelector = 'input[type=range]'
  let muteSelector = 'input[type=checkbox]'
  let muteElement = element.querySelector(muteSelector)

  element.userGain = 1

  $(muteElement).checkbox('toggle').click(c => {
    let label = c.target.parentNode.querySelector('label')
    if (label.children[0].classList.contains('mute')) {
      label.innerHTML = '<i class=\'icon unmute\'></i>'
      element.querySelector(volumeSelector).disabled = false
      audio.volume(element.userGain)
    } else {
      label.innerHTML = '<i class=\'icon mute red\'></i>'
      element.querySelector(volumeSelector).disabled = true
      audio.volume(0)
    }
  })

  $(element.querySelector(volumeSelector)).change(function () {
    audio.volume(this.value)
    element.userGain = this.value
  })
  audio.connect(analyser)

  var canvas = element.querySelector('canvas.person')
  canvas.canvasCtx = canvas.getContext('2d')
  analyser.fftSize = 256
  analyser._bufferLength = analyser.frequencyBinCount
  canvas.canvasCtx.clearRect(0, 0, WIDTH, HEIGHT)
  canvas.analyser = analyser
  startLoop()

  return element
}

module.exports = connectAudio
