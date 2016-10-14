/* global $ */
const funky = require('funky');

const audioFile = funky `
<div class="card">
  <div style="height:49px;width:290">
    <canvas id="canvas"
      width="290"
      height="49"
      class="person"
      >
    </canvas>
  </div>
  <div class="extra content">
    <div class="header person-name">${name => name}</div>
    <div class="volume">
      <i class="icon play play-button"></i>
      <input type="range" min="0" max="2" step=".05" />
    </div>
  </div>
</div>
`;

module.exports = (file, audio) => {
  const elem = audioFile(file.name);
  const button = elem.querySelector('i.play-button');

  const play = () => {
    audio.play();
    $(button).removeClass('play').addClass('stop');
    button.onclick = stop;
  };

  const stop = () => {
    audio.pause();
    audio.currentTime = 0;
    $(button).removeClass('stop').addClass('play');
    button.onclick = play;
  };

  audio.onended = stop;
  button.onclick = play;
  
  return elem;
};