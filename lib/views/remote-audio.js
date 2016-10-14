/* global $ */
const funky = require('funky');

const remoteAudio = funky `
<div class="card" id="a${item => item.key}">
  <div style="height:49px;width:290">
    <canvas id="canvas"
      width="290"
      height="49"
      class="person"
      >
    </canvas>
  </div>
  <div class="extra content">
    <div contenteditable="true" class="header person-name">${item => item.username}</div>
    <div class="volume">
      <div class="ui toggle checkbox">
        <input type="checkbox" name="mute">
        <label>Mute</label>
      </div>
      <input type="range" min="0" max="2" step=".05" />
    </div>
  </div>
</div>
`;

module.exports = (storage, stream, username) => {
  const el = remoteAudio({
    username: username || storage.get('username') || 'Me',
    key: stream.publicKey
  });

  // When `username` is `undefined`, Audio card belongs to the current User 
  if (typeof username === 'undefined') {
    const name = $(el).find('.person-name');
    
    name.blur(() => storage.set('username', name.html()));
    storage.on('change:username', (username) => name.html(username));
  }

  return el;
};