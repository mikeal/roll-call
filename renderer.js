
// if (opts.room === 'test') {
//   openCall.test()
// } else {
//   openCall(opts.room)
// }
// $('.ui.toggle').state({
//   text: {
//     inactive : 'Mute',
//     active   : 'Muted'
//   }
// })

const ipfs = new Ipfs()
const once = require('once')
const bs58 = require('bs58')
const concat = require('concat-stream')

function write (obj, cb) {
  cb = once(cb)
  ipfs.files.createAddStream((err, stream) => {
    if (err) return cb(err)
    stream.once('error', console.error)
    stream.write({
      path: 'test',
      content: new Buffer(JSON.stringify(obj))
    })
    stream.on('data', file => {
      console.log(file)
      cb(null, bs58.encode(file.node.multihash()).toString())
    })
    stream.end()
  })
}

function get (hash, cb) {
  ipfs.files.get(hash, (err, stream) => {
    let ret = concat((data) => {
      cb(null, JSON.parse(data.toString()))
    })
    stream.once('data', (obj) => {
      obj.content.pipe(ret)
    })
    ret.on('error', cb)
  })
}

const qs = require('querystring')
var opts = qs.parse(window.location.search.slice(1))

if (!opts.offer) {
  createOffer()
} else {
  console.log("reading...")
  get(opts.offer, (err, obj) => {
    console.log(err, obj)
  })
}

function createOffer (cb) {
  var SimplePeer = require('simple-peer')

  var me = new SimplePeer({ initiator: true, trickle: false })

  me.once('signal', function (data) {
    // when peer1 has signaling data, give it to peer2 somehow
    write(data, (err, hash) => {
      console.log('hash', hash)
      get(hash, (err, obj) => {
        console.log(err, obj)
        window.history.replaceState({}, null, '?offer='+hash)
      })
    })
    console.log('signal', data)
  })
}

