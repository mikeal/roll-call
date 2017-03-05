const funky = require('funky')
const bel = require('bel')
const emojione = require('emojione')

const modal = require('blur-modal')
const sodiAuthority = require('../../sodi-authority')

const settingsInit = (elem, opts) => {
  if (!opts.token) {
    elem.appendChild(sodiAuthority.component((err, signature) => {
      if (err) throw err
      opts.token = sodiAuthority.persist('token', signature)
      elem.unblur()
    }))
  }
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
</rollcall-settings-form>
`

const settingsButtonInit = (elem, opts) => {
  const showModal = () => {
    let obj = {}
    obj.levelup = opts.levelup
    let settings = settingsComponent(obj)
    let unblur = modal(settings)
    settings.unblur = () => {
      unblur()
      if (opts.onSettingsUpdate) opts.onSettingsUpdate()
    }
  }
  elem.onclick = showModal
  elem.querySelector('img').title = 'Settings'
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
