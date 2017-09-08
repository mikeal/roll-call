const ZComponent = require('./z-component')
const waudio = require('./waudio')

class Recording extends ZComponent {

}

class RecordButton extends ZComponent {
  set swarm (swarm) {
    let call = this.parentNode
    call.onAddedNode = child => {
      if (child.tagName !== 'ROLL-CALL-PEER') return
      this.onPeer(peer)
    }
  }
  onPeer (peer) {

  }
  // get shadow () {
  //   return `
  //   <
  //   `
  // }
}

window.customElements.define('roll-call-record-button', RecordButton)

module.exports = RecordButton
