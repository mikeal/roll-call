/* global document, $ */
const bel = require('bel');
const dragDrop = require('drag-drop');

const modal = bel `
<div id="drop" class="ui basic modal">
    <div class="ui icon header">
		<i class="file audio outline icon"></i>
	</div>
  <div class="content text-center">
    <p>Drop your audio files here</p>
  </div>
</div>`;

document.body.appendChild(modal);
let timeout;

module.exports = (onDrop) => {
	dragDrop('body', {
		onDrop,
		onDragOver() {
			clearTimeout(timeout);
			$(modal).modal('show');
		},
		onDragLeave() {
			timeout = setTimeout(() => $(modal).modal('hide'), 100);
		}
	});
};