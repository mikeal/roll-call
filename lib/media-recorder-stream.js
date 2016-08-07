// taken from feross' fork of mafintosh's lib

var stream = require('readable-stream')

module.exports = createRecordStream

function createRecordStream (media, opts) {
  if (!opts) opts = {}

  var rs = stream.Readable()
  var top = 0
  var btm = 0
  var buffer = []

  rs.recorder = null
  rs.media = null

  rs._read = noop
  rs.destroyed = false
  rs.destroy = function (err) {
    if (rs.destroyed) return
    rs.destroyed = true
    if (rs.recorder) rs.recorder.stop()
    if (err) rs.emit('error', err)
    rs.emit('close')
    rs.recorder = null
    rs.media = null
  }

  rs.media = media
  rs.recorder = new window.MediaRecorder(media, opts)
  rs.recorder.addEventListener('dataavailable', function (ev) {
    push(ev.data)
  })
  rs.recorder.start(opts.interval || 1000)

  return rs

  function push (blob) {
    var r = new window.FileReader()
    var index = top++

    r.addEventListener('loadend', function () { 
      var buf = Buffer(new Uint8Array(r.result))
      var i = index - btm
      while (buffer.length < i) buffer.push(null)
      buffer[i] = buf
      while (buffer.length && buffer[0]) {
        var next = buffer.shift()
        btm++
        rs.push(next)
      }
    })

    r.readAsArrayBuffer(blob)
  }
}

function noop () {}