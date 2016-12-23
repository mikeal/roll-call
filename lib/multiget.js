module.exports = (levelup, keys, cb) => {
  let results = []
  let len = keys.length
  while (keys.length) {
    let key = keys.shift()
    levelup.get(key, (err, value) => {
      if (err) { /* do nothing */ }
      results.push([key, value])
      if (results.length === len) {
        let obj = {}
        results.forEach(r => {
          if (r[1]) obj[r[0]] = r[1]
        })
        cb(null, obj)
      }
    })
  }
}
