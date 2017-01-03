const bel = require('bel')

const body = document.body

module.exports = content => {
  const modal = bel`
  <modal-background>
    <style>
    modal-background {
      position: absolute;
      top: 0;
      left: 0;
    }
    modal-background modal-container {
      height: 100vh;
      display: flex;
      justify-content: center;
      width: 100vw;
      align-items: center;
    }
    </style>
    <modal-container></modal-container>
  </modal-background>
  `
  modal.onclick = () => {
    unblur()
  }
  const modalContainer = modal.querySelector('modal-container')

  const elements = [...body.children]

  const blur = () => {
    elements.forEach(el => {
      el.style.filter = 'blur(5px)'
    })
  }
  const unblur = () => {
    elements.forEach(el => {
      el.style.filter = ''
    })
    modalContainer.innerHTML = ''
    body.removeChild(modal)
  }

  blur()
  modalContainer.appendChild(content)
  body.appendChild(modal)

  content.onclick = ev => {
    ev.stopPropagation()
  }

  return unblur
}
