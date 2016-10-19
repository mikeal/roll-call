/* global window, $ */
const bel = require('bel')
const funky = require('funky')
const dragDrop = require('drag-drop')
const Clipboard = require('clipboard')

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

const shareButton = bel `
<button id="share" class="ui icon compact button" data-variation="very wide">
  <i class="add user icon"></i>
</button>
`

const shareButtonTooltip = `
<p>Invite your friends to join the room</p>
<div class="ui fluid action input">
  <input value="${window.location}">
  <button class="ui teal icon button" aria-label="copied">
    <i class="copy icon"></i>
  </button>
</div>
`

exports.shareButton = () => {
  let clipboard

  $(shareButton).popup({
    on: 'click',
    hoverable: true,
    position: 'bottom left',
    html: shareButtonTooltip,
    delay: {
      hide: 800
    },
    onVisible () {
      this.find('input').select()
      const button = this.find('button')

      clipboard = new Clipboard(button[0], {
        text: () => window.location
      })

      clipboard.on('success', () => {
        button.html('Copied!')
      })
    },
    onHide () {
      clipboard.destroy()
    }
  })

  return shareButton
}

const messageView = funky `
<div class="ui ${(item) => item.type} ${(item) => item.icon ? 'icon' : ''} message">
  <i class="${(item) => item.icon} icon"></i>
  <div class="content">
    <div class="header">${(item) => item.title || ''}</div>
    <p>${(item) => item.message || ''}</p>
  </div>
</div>
`

exports.message = ({title, message, icon, type}) => {
  return messageView({
    title, message, icon, type
  })
}

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

exports.remoteAudio = (storage, username, publicKey) => {
  const el = remoteAudioView({
    username: username || storage.get('username') || 'Me',
    key: publicKey
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
    audio.volume(0)
    audio.fadeVolume(elem.userGain, 0.01)
    audio.seek(0)
    audio.play()
    $(button).removeClass('play').addClass('stop')
    button.onclick = stop
  }

  const stop = () => {
    audio.fadeVolume(0, 0.05)
    setTimeout(() => audio.pause(), 100)
    $(button).removeClass('stop').addClass('play')
    button.onclick = play
  }

  audio.el.onended = stop
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
    <div class="ui two column centered stackable grid description">
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
