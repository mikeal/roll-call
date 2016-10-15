/* global window, $ */
const bel = require('bel')
const funky = require('funky')
const dragDrop = require('drag-drop')

const navigate = (to) => {
  window.location = `?room=${to}`
}
const random = () => Math.random().toString(36).substring(7)

exports.mainButtons = bel `
<div class="join-container">
  <div class="ui large buttons">
    <button onclick=${() => { navigate('room') }} id="join-party" class="ui button">Join the Party 🎉</button>
      <div class="or"></div>
    <button onclick=${() => { navigate(random()) }} id="create-room" class="ui button">🚪 Create New Room</button>
  </div>
</div>
`

const remoteAudioView = funky `
<div class="card" id="a${item => item.key}">
  <div style="height:49px;width:290">
    <canvas id="canvas"
      width="290"
      height="49"
      class="person"
      >
    </canvas>
  </div>
  <div class="extra content">
    <div contenteditable="true" class="header person-name">${item => item.username}</div>
    <div class="volume">
      <div class="checkbox">
        <input type="checkbox" name="mute" id='mute' class='mute-checkbox'>
        <label for='mute'><i class='unmute icon'></i></label>
      </div>
      <input type="range" min="0" max="2" step=".05" />
    </div>
  </div>
</div>
`

exports.remoteAudio = (storage, stream, username) => {
  const el = remoteAudioView({
    username: username || storage.get('username') || 'Me',
    key: stream.publicKey
  })

  // When `username` is `undefined`, Audio card belongs to the current User
  if (typeof username === 'undefined') {
    const name = $(el).find('.person-name')

    name.blur(() => storage.set('username', name.html()))
    storage.on('change:username', (username) => name.html(username))
  }

  return el
}

const audioFileView = funky `
<div class="card">
  <div style="height:49px;width:290">
    <canvas id="canvas"
      width="290"
      height="49"
      class="person"
      >
    </canvas>
  </div>
  <div class="extra content">
    <div class="header person-name">${name => name}</div>
    <div class="volume">
      <i class="icon play play-button"></i>
      <input type="range" min="0" max="2" step=".05" />
    </div>
  </div>
</div>
`
exports.audioFile = (file, audio, context) => {
  const elem = audioFileView(file.name)
  const button = elem.querySelector('i.play-button')

  const play = () => {
    const gainNode = elem.volume.inst.gain
    const now = context.currentTime
    gainNode.setValueAtTime(0, now)
    gainNode.linearRampToValueAtTime(elem.userGain, now + 0.01)
    audio.currentTime = 0
    audio.play()
    $(button).removeClass('play').addClass('stop')
    button.onclick = stop
  }

  const stop = () => {
    const gainNode = elem.volume.inst.gain
    const now = context.currentTime
    gainNode.setValueAtTime(elem.userGain, now)
    gainNode.linearRampToValueAtTime(0, now + 0.05)
    setTimeout(() => audio.pause(), 100)
    $(button).removeClass('stop').addClass('play')
    button.onclick = play
  }

  audio.onended = stop
  button.onclick = play

  return elem
}

const dragDropModal = bel `
<div id="drop" class="ui basic modal">
    <div class="ui icon header">
    <i class="file audio outline icon"></i>
  </div>
  <div class="content text-center">
    <p>Drop your audio files here</p>
  </div>
</div>`

document.body.appendChild(dragDropModal)
let timeout

exports.dragDrop = (onDrop) => {
  dragDrop('body', {
    onDrop,
    onDragOver () {
      clearTimeout(timeout)
      $(dragDropModal).modal('show')
    },
    onDragLeave () {
      timeout = setTimeout(() => $(dragDropModal).modal('hide'), 100)
    }
  })
}

const settingsModalView = funky `
<div id="settings" class="ui modal">
    <i class="close icon"></i>
    <div class="header">Settings</div>
  <div class="image content">
    <div class="ui two column centered grid description">
      <div class="ui form column">
        <div class="field">
          <label>Name</label>
          <input type="text" name="username" placeholder="Enter your name" value="${item => item.username}">
        </div>
        <div class="field">
          <label>Select input device</label>
          ${item => deviceSelectField('input', item.devices)}
        </div>
      </div>
    </div>
  </div>
  <div class="actions">
    <div class="ui button cancel">Cancel</div>
    <div class="ui button approve">Save</div>
  </div>
</div>`

const deviceSelectField = (name, devices) => bel `<select name="${name}" class="ui dropdown">
  ${devices.map(function (device) {
    return bel`${deviceSelectOption(device)}`
  })}
</select>`
const deviceSelectOption = (device) => bel `
  <option value="${device.id}" ${device.selected ? 'selected' : ''}>${device.label}</option>
`

function deviceToSelectOption (storage, device, i) {
  return {
    id: device.deviceId,
    label: device.label || `Microphone ${i}`,
    selected: device.deviceId === storage.get('input')
  }
}

exports.settingsModal = (storage) => {
  return navigator.mediaDevices.enumerateDevices().then((devices) => {
    return devices.filter(d => d.kind === 'audioinput')
  }).then((devices) => {
    const modal = settingsModalView({
      username: storage.get('username') || '',
      devices: devices.map((device, i) => deviceToSelectOption(storage, device, i))
    })

    storage.on('change:username', (username) => {
      modal.update({
        username: username,
        devices: devices.map((device, i) => deviceToSelectOption(storage, device, i))
      })
    })

    $(modal).modal({
      onApprove () {
        const name = $(modal).find('[name="username"]').val()
        const input = $(modal).find('[name="input"]').val()

        storage.set('username', name)
        storage.set('input', input)
      }
    })

    return modal
  })
}
