const observer = (element, onAttributes) => {
  var observer = new MutationObserver(mutations => {
    let attributes = Object.assign({},
      ...
      mutations
      .filter(m => m.type === 'attributes')
      .map(m => m.attributeName)
      .map(attr => {
        let o = {}
        o[attr] = element.getAttribute(attr)
        return o
      })
    )
    onAttributes(attributes)

    mutations.filter(m => m.type === 'childList')
    .forEach(m => {
      if (m.addedNodes && element.onAddedNode) {
        [...m.addedNodes].forEach(n => element.onAddedNode(n))
      }
      if (m.removedNodes && element.onRemovedNode) {
        [...m.removedNodes].forEach(n => element.onRemovedNode(n))
      }
    })
  })

  observer.observe(element, {attributes: true, childList: true})
  return observer
}

class ZComponent extends HTMLElement {
  constructor () {
    super()
    let shadow = this.shadow
    if (shadow) {
      let shadowRoot = this.attachShadow({mode: 'open'});
      shadowRoot.innerHTML = shadow
    }
    observer(this, attributes => {
      for (let key in attributes) {
        if (key.startsWith('z-')) {
          this[key.slice('z-'.length)] = attributes[key]
        }
      }
    })
  }
  set shadow (shadow) {
    this.shadowRoot.innerHTML = shadow
  }
}

module.exports = ZComponent