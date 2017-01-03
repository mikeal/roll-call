const funky = require('funky')
const bel = require('bel')
const emojione = require('emojione')
const blobStream = require('blob-stream')
const sublevel = require('sublevel')
const through2 = require('through2')
const bytewise = require('bytewise')
const createMediaRecorder = require('media-recorder-stream')

const random = () => Math.random().toString(36).substr(7)
const values = obj => Object.keys(obj).map(k => obj[k])
const encode = bytewise.encode
const decode = bytewise.decode

const storedStream = (publicKey, db) => {
  let i = -1
  let stream = through2(function (chunk, enc, cb) {
    i++
    db.put(encode([publicKey, i]), chunk, err => cb(err))
  })
  stream.on('finish', () => {
    stream.finished = true
  })
  return stream
}

const recordButtonInit = (elem, opts) => {
  const mime = opts.mime || {mimeType: 'audio/webm'}
  const output = opts.output
  const swarm = opts.swarm
  const db = sublevel(opts.levelup, 'recordings', {valueEncoding: 'json'})
  const remotes = {}
  const recordings = {}
  swarm.on('disconnect', publicKey => {
    delete remotes[publicKey]
  })

  let recording = false
  let recordingStart
  let startbutton = elem.querySelector('img')
  startbutton.onclick = () => {
    let uid = recording = random()
    let dbopts = {valueEncoding: 'buffer', keyEncoding: 'buffer'}
    let recordingDatabase = sublevel(db, uid, dbopts)
    recordings[uid] = {db: recordingDatabase}

    db.put(uid, {starttime: Date.now(), room: opts.room}, (err) => {
      if (err) throw err
      values(remotes).forEach(remote => remote(uid))
      let recordingStream = createMediaRecorder(output.stream, mime)
      let stored = storedStream('me', recordingDatabase)
      recordingStream.pipe(stored)

      let stopbutton = bel([emojione.toImage('⏹')])
      stopbutton.onclick = () => {
        recording = false
        let pending = 1
        let finish = () => {
          pending -= 1
          if (pending === 0) {
            console.log('finished')
            // TODO: Create a button for the recording
          }
        }
        values(recordings[uid]).forEach(stream => {
          if (!stream.write) return
          if (stream.finished) return
          pending += 1
          stream.on('finish', finish)
        })
        stored.on('finish', finish)
        recordingStream.stop()
        values(remotes).forEach(stop => stop())
        elem.removeChild(stopbutton)
        elem.appendChild(startbutton)
      }
      elem.removeChild(startbutton)
      elem.appendChild(stopbutton)
    })
  }

  swarm.on('peer', peer => {
    let meth = peer.meth
    let mystreams = {}
    let startRecording = (uid) => {
      let recordingStream = createMediaRecorder(output.stream, mime)
      let pushStream = meth.stream(`rollcall/record/${uid}`)
      recordingStream.pipe(pushStream)
      mystreams[uid] = recordingStream
    }
    let stopRecording = uid => {
      mystreams[uid].stop()
    }
    meth.commands({startRecording, stopRecording}, 'rollcall/record')
    meth.on('commands:rollcall/record', remote => {
      let start = uid => {
        let db = recordings[uid].db
        peer.recording = true
        remotes[peer.publicKey] = () => {
          remote.stopRecording(uid)
          remotes[peer.publicKey] = start
          peer.recording = false
        }
        meth.on(`stream:rollcall/record/${uid}`, stream => {
          let stored = storedStream(peer.publicKey, db)
          recordings[uid][peer.publicKey] = stream.pipe(stored)
        })
        remote.startRecording(uid)
      }
      remotes[peer.publicKey] = start
      if (recording) start(recording)
    })
  })
  elem.querySelector('img').title = 'Start Recording'
}

const recordButton = funky`
${recordButtonInit}
<rollcall-settings>
  <style>
  rollcall-settings {
    cursor: pointer;
  }
  rollcall-settings img {
    max-height: 30px;
  }
  </style>
  ${bel([emojione.toImage('⏺')])}
</rollcall-settings>
`
module.exports = recordButton
