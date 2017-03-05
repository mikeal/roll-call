/*

Un-finished multi-track recording.

This has been shelved until we spec out the different modes of recording.
There's a lot of UX decisions that need to get made before we can move
forward.

*/
const funky = require('funky')
const bel = require('bel')
const emojione = require('emojione')
const sublevel = require('sublevel')
const through2 = require('through2')
const bytewise = require('bytewise')
const blobStream = require('blob-stream')
const createMediaRecorder = require('media-recorder-stream')

const random = () => Math.random().toString(36).substr(7)
const values = obj => Object.keys(obj).map(k => obj[k])
const encode = bytewise.encode
const decode = bytewise.decode

const storedStream = (publicKey, db) => {
  let i = -1
  let stream = through2((chunk, enc, cb) => {
    i++
    db.put(encode([publicKey, i]), chunk, err => cb(err))
  })
  stream.on('finish', () => {
    stream.finished = true
  })
  return stream
}

const recordingComponent = funky`
<roll-call-recording>
  <span>Test</span>
</roll-call-recording>
`

const initShowRecording = (elem, opts) => {
  let db = opts.db
  let info = opts.info
  let streams = {}
  let current
  let finish = pubkey => {
    streams[pubkey].on('finish', () => {
      let blob = streams[pubkey].toBlob()
      let track = recordingTrack({blob, info, publicKey: pubkey})
      console.log(track)
    })
    streams[pubkey].end()
  }
  db.createReadStream()
  .on('data', block => {
    let [publicKey, i] = decode(Buffer.from(block.key, 'hex'))
    if (!streams[publicKey]) streams[publicKey] = blobStream()
    streams[publicKey].write(Buffer.from(block.value))
    if (current) finish(current)
    current = publicKey
  })
  .on('end', () => {
    finish(current)
  })
}

const recordingDetails = funky`
${initShowRecording}
<show-recording>
</show-recording>
`

const initRecordedCall = (elem, opts) => {
  let info = opts.info
  let db = opts.db
  let details = recordingDetails({info, db})
  elem.querySelector('recording-link').onclick = () => {
    // TODO: show details
  }
}

const recordedCall = funky`
${initRecordedCall}
<recorded-call>
  <style>
  recorded-call recording-link {
    cursor: pointer;
    color: blue;
  }
  </style>
  <recording-link>${opts => (opts.info.runtime / 100)} Seconds.</recording-link>
</recorded-call>
`

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
    let starttime = Date.now()
    recordings[uid] = {db: recordingDatabase}

    db.put(uid, {starttime, room: opts.room, uid}, (err) => {
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
            db.get(uid, (err, info) => {
              if (err) throw err
              info.runtime = (Date.now() - starttime)
              console.log(info)
              db.put(uid, info, () => {}) // TODO: clean this up.
              let rec = recordedCall({db: recordingDatabase, info})
              elem.parentNode.appendChild(rec)
            })
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
