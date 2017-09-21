const each = (arr, fn) => {
  return Array.from(arr).forEach(fn)
}

/* globals MutationObserver,HTMLElement */
const observer = (element, onAttributes) => {
  var observer = new MutationObserver(mutations => {
    console.error('mutations', mutations)
    mutations = Array.from(mutations)
    let attributes = Object.assign({},
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
        each(m.addedNodes, n => element.onAddedNode(n))
      }
      if (m.removedNodes && element.onRemovedNode) {
        each(m.removedNodes, n => element.onRemovedNode(n))
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
      let shadowRoot = this.attachShadow({mode: 'open'})
      shadowRoot.innerHTML = shadow
    }
    let proto = Object.getPrototypeOf(this)
    let descs = Object.getOwnPropertyDescriptors(proto)
    let _keys = Object.keys(descs).filter(k => descs[k].set)
    observer(this, attributes => {
      for (let key in attributes) {
        if (_keys.indexOf(key) !== -1) {
          this[key] = attributes[key]
        }
      }
    })
    let constructedKeys = []
    each(this.attributes, node => {
      let key = node.name
      if (_keys.indexOf(key) !== -1) {
        this[key] = node.nodeValue
      }
      constructedKeys.push(key)
    })
    // Safari Hack
    // For some reason mutation observer doesn't pick up
    // initial attributes but those are also not on the element.
    setTimeout(() => {
      each(this.attributes, node => {
        let key = node.name
        if (constructedKeys.includes(key)) return
        if (_keys.indexOf(key) !== -1) {
          this[key] = node.nodeValue
        }
      })
    }, 0)
  }
  set shadow (shadow) {
    this.shadowRoot.innerHTML = shadow
  }
}

module.exports = ZComponent
