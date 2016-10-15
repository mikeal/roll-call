/* global localStorage */
const EventEmitter = require('events')

class Storage extends EventEmitter {
  get (key) {
    const data = JSON.parse(localStorage.getItem(this.key)) || {}

    if (typeof key === 'undefined') {
      return data
    }

    return data[key] || null
  }

  set (key, value) {
    const data = this.get()
    data[key] = value

    localStorage.setItem(this.key, JSON.stringify(data))

    process.nextTick(() => {
      this.emit('change', data, this)
      this.emit(`change:${key}`, value, this)
    })
  }

  get key () {
    return 'roll-call'
  }
}

module.exports = Storage
