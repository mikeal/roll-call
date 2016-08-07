const url = `file://${__dirname}/../index.html?room=`
const electron = require('electron')

module.exports = function (Menu, debug) {
  function nb (x) {
    var win = new electron.remote.BrowserWindow({width: 1200, height: 700})
    // and load the index.html of the app.
    win.loadURL(url+x)
  }

  var template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Call',
          accelerator: 'CmdOrCtrl+N',
          click: () => nb('new')
        },
        {
          label: 'Open Call',
          accelerator: 'CmdOrCtrl+O',
          click: () => nb('open')
        }
      ]
    }
  ]
  if (debug) {
    template[0].submenu.push(
      {
        label: 'Debug',
        accelerator: 'CmdOrCtrl+I',
        click: () => electron.remote.getCurrentWindow().toggleDevTools()
      }
    )
  }
  var menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

