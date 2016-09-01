const debug = require('debug')('app')
const funk = require('../../funky')
const addPerson = require('./add-person')
const crypto = require('crypto')
const _ = require('lodash')
const md5 = data => crypto.createHash('md5').update(data).digest('hex')

const cardContainer = document.querySelector('.special.cards')

var modalView = funk`
<div class="ui modal small hidden" style="margin-top: -198.93px;">
  <div class="header">
    <div class="label">Your Info.</div>
    <div class="ui green tiny button join-button">Join</div>
  </div>
  <div class="content">
    <div class="ui form">
      <div class="field">
        <div class="three fields">
          <div class="field">
            <input type="text" name="roomname" placeholder="Random" value="${ info => info.room !== 'new' ? info.room : '' }">
          </div>
          <div class="field">
            <input type="text" name="realname" placeholder="Your Name" value="${
              info => info.realname || ''
            }">
          </div>
          <div class="field">
            <input type="email" name="email" placeholder="me@example.com" value="${
              info => info.email || ''
            }">
          </div>
        </div>
      </div>
    </div>
    <div class="ui special cards">${addPerson.view}</div>
  </div>
</div>
`

function open (person, info) {
  if (!info) {
    // Bring up modal to capture join info.
    if (!room) room = 'new'
    var rand = crypto.randomBytes(10).toString('hex')
    function _update () {
      info.realname = $('input[name=realname]').val()
      info.room = $('input[name=roomname]').val() || rand
      info.email = $('input[name=email]').val()
      info.gravatar = `http://www.gravatar.com/avatar/${md5(info.email)}?s=2048`
      localStorage.setItem('infoCache', JSON.stringify(info))
      $('div.card')[0].update(info)
    }
    if (localStorage.getItem('infoCache')) {
      info = JSON.parse(localStorage.getItem('infoCache'))
    }
    info = info || {}
    info.room = room
    var elem = modalView(info)
    console.log(elem)
    document.body.appendChild(elem)
    $('.ui.modal')
    .modal('show')
    .on('input', () => {
      _update()
    })
    $('div.join-button').click(function () {
      _update()
      var newurl = `${window.location.pathname}?room=${info.room}`
      var state = {state:'created', room:info.room}
      window.history.replaceState(state, 'Peer Call', newurl)
      openCall(info.room, info)
      $('.ui.modal').modal('hide')
    })
    return
  }
}

function connectMute (stream) {
  $('.mute-button').click(function () {
    if ($(this).hasClass('active')) {
      var enabled = false
    } else {
      var enabled = true
    }
    stream.getAudioTracks().forEach(a => a.enabled = enabled)
  })
}

function openCall (room, info) {
  

  // Actually setup the call now that we have the proper info.
  var mediaopts = { audio: true, video: false }
  navigator.webkitGetUserMedia(mediaopts, success, err => { throw err })

  function success (stream) {
    var hub = signalhub(room, ['http://localhost:8080'])
    var sw = swarm(hub, {stream})

    connectMute(stream)

    sw.send = function () {
      sw.peers.forEach(peer => peer.send.apply(peer, arguments))
    }
    sw.sendRPC = function () {
      sw.peers.forEach(peer => peer.sendRPC.apply(peer, arguments))
    }

    sw.on('disconnect', function (peer, id) {
      console.log('disconnected from a peer:', id)
      console.log('total peers:', sw.peers.length)
      // TODO: remove person from list
    })
    var me = _.clone(info)
    me.media = stream

    cardContainer.appendChild(addPerson(me))

    sw.on('peer', function (peer, id) {
      setupPeer(peer)
      peer.sendRPC('identify', info)

      function calcDelay () {
        var id = Math.random().toString()
        var ts = Date.now()
        peer.pings[id] = () => {
          var delay = Date.now() - ts
          ts = Date.now()
          id = Math.random().toString()
          peer.pings[id] = () => {
            console.log('delay', delay + (Date.now() - ts) / 2)
          }
          peer.sendRPC('ping', id)
        }
        peer.sendRPC('ping', id)
      }
      calcDelay()
    })
  }

  function setupPeer (peer) {
    console.log('new peer', peer)
    peer.rpc = {}
    peer.on('data', chunk => {
      var str = chunk.toString()
      if (str[0] === '{') {
        var obj = JSON.parse(str)
        if (obj.type === 'rpc') {
          if (!peer.rpc[obj.method]) throw new Error('No such method, '+obj.method)
          peer.rpc[obj.method].apply(peer, obj.args)
        } else {
          debug(obj)
        }
      } else {
        debug(str)
      }
    })
    peer.sendRPC = function () {
      var args = Array.prototype.slice.apply(arguments)
      var method = args.shift()

      peer.send(JSON.stringify({method, args, type: 'rpc'}))
    }
    peer.rpc.identify = info => {
      info.media = peer.stream
      peer.info = info
      cardContainer.appendChild(addPerson(info))
    }
    peer.pings = {}
    peer.rpc.pong = id => {
      peer.pings[id]()
      delete peer.pings[id]
    }
    peer.rpc.ping = id => {
      peer.sendRPC('pong', id)
    }
  }
}

module.exports = openCall
module.exports.test = function () {
  var user = process.env.PODUSER
  document.title = user
  window.poduser = user
  var email = `${user}@test.com`
  var info = {realname: user, email, peerId: 'me'}

  if (user === 'Mikeal') {
    info.gravatar = 'https://avatars1.githubusercontent.com/u/579'
  } else {
    info.gravatar = 'https://pbs.twimg.com/profile_images/3609656966/e2a6f4c4b3dcec7d312f326db3bb7f1c_400x400.jpeg'
  }

  openCall('test', info)
}
