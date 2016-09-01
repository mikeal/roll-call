
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

// const ipfs = new Ipfs()
const once = require('once')
const bs58 = require('bs58')
const concat = require('concat-stream')
const crypto = require('crypto')
const request = require('request')

// TODO: temporarily replace this with a service.

function write (obj, cb) {
  cb = once(cb)
  var id = crypto.randomBytes().toString('hex')
  obj._id = id
  console.log(write)
  request.put('http://localhost:6688/v1/'+id, {json: obj}, (err, resp) => {
    if (err) return cb(err)
    var status = resp.statusCode
    if (status !== 201) return cb(new Error('Status Code not 201, '+status))
    cb(null, id)
  })
}

function link (name, obj, cb) {
  cb = once(cb)
  var id = crypto.randomBytes().toString('hex')
  obj._id = id
  request.put('http://localhost:6688/v1/name/'+name, {json: obj}, (err, resp) => {
    if (err) return cb(err)
    var status = resp.statusCode
    if (status !== 201) return cb(new Error('Status Code not 201, '+status))
    cb(null, id)
  })
  return // Disable actual IPFS for now
  // ipfs.files.createAddStream((err, stream) => {
  //   if (err) return cb(err)
  //   stream.once('error', cb)
  //   stream.write({
  //     path: 'test',
  //     content: new Buffer(JSON.stringify(obj))
  //   })
  //   stream.on('data', file => {
  //     console.log(file)
  //     cb(null, bs58.encode(file.node.multihash()).toString())
  //   })
  //   stream.end()
  // })
}

function get (name, cb) {
  var url = 'http://localhost:6688/v1/name/'+name
  request.get(url, {json: true}, (err, resp, obj) => {
    if (err) return cb(err)
    var status = resp.statusCode
    if (status !== 200) return cb(new Error('Status Code not 200, '+status))
    cb(null, obj)
  })
  return
  // cb = once(cb)
  // ipfs.files.cat(hash, (err, stream) => {
  //   console.log('error getting hash', err)
  //   if (err) return cb(err)
  //   let ret = concat((data) => {
  //     console.log(data.toString())
  //     cb(null, JSON.parse(data.toString()))
  //   })
  //   stream.pipe(ret)
  //   stream.on('error', (err) => console.log('stream error', err))
  //   stream.on('error', cb)
  //   ret.on('error', cb)
  // })
}

const qs = require('querystring')
var opts = qs.parse(window.location.search.slice(1))

if (!opts.offer) {
  createUser()
} else {
  console.log("reading...")
  get(opts.offer, (err, obj) => {
    console.log(err, obj)
  })
}

function createUser (obj, cb) {
  console.log('creating offer')
  var SimplePeer = require('simple-peer')

  var me = new SimplePeer({ initiator: true, trickle: false })

  console.log('created peer')

  me.once('signal', function (data) {
    // when peer1 has signaling data, give it to peer2 somehow
    console.log('offer', data)
    write(data, (err, hash) => {
      console.log('hash', hash)
      console.log(hash)
      get('test', (err, obj) => {
        console.log(err, obj)
        window.history.replaceState({}, null, '?offer='+hash)
      })
    })
    console.log('signal', data)
  })
}
