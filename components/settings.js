const funky = require('funky')
const bel = require('bel')
const emojione = require('emojione')

const modal = require('./modal')
const multiget = require('../lib/multiget')

const noop = () => {}

const settingsInit = (elem, opts) => {
  let inputs = [...elem.querySelectorAll('input')]
  inputs.forEach(input => {
    input.onchange = ev => {
      opts.levelup.put(ev.target.name, ev.target.value, noop)
    }
    input.onkeypress = ev => {
      if (ev.keyCode === 13) elem.unblur()
    }
  })
}

const settingsComponent = funky`
${settingsInit}
<rollcall-settings-form>
  <style>
  rollcall-settings-form,  rollcall-settings-form input[type="text"]{
    font-family: Lato,'Helvetica Neue',Arial,Helvetica;
    color: grey;
    font-size: 20px;
  }
  rollcall-settings-form input[type="text"] {
    padding: 10px;
    border: solid 5px #c9c9c9;
    transition: border 0.3s;
  }
  rollcall-settings-form input[type="text"]:focus,
  rollcall-settings-form input[type="text"].focus {
    border: solid 5px #969696;
  }
  rollcall-settings-form div.label {
    margin-bottom: -1px;
  }
  </style>
  <div class="setting">
    <div class="label">Display Name</div>
    <input type="text"
          name="displayname"
          value="${opts => opts.displayname || ''}"
          />
    <div class="label">Emoji</div>
    <input type="text"
          name="emoji"
          value="${opts => opts.emoji || ''}"
          />
  </div>
</rollcall-settings-form>
`

const settingsButtonInit = (elem, opts) => {
  const showModal = () => {
    multiget(opts.levelup, ['displayname', 'emoji'], (err, obj) => {
      if (err) return
      obj.levelup = opts.levelup
      let settings = settingsComponent(obj)
      let unblur = modal(settings)
      settings.unblur = () => {
        unblur()
        if (opts.onSettingsUpdate) opts.onSettingsUpdate()
      }
    })
  }
  elem.onclick = showModal
}

const settingsButton = funky`
${settingsButtonInit}
<rollcall-settings>
  <style>
  rollcall-settings {
    cursor: pointer;
  }
  rollcall-settings img {
    max-height: 30px;
  }
  </style>
  ${bel([emojione.toImage('⚙')])}
</rollcall-settings>
`

module.exports = settingsButton
