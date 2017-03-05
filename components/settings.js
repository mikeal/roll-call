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
    width: 30px;
    padding-left: 10px;
    margin-top: 10px;
  }
  </style>
  ${bel([emojione.toImage('⚙')])}
</rollcall-settings>
`

module.exports = settingsButton
