/* global $, navigator */
const bel = require('bel');
const funk = require('funky');

const template = funk `
<div id="settings" class="ui modal">
    <i class="close icon"></i>
    <div class="header">Settings</div>
  <div class="image content">
    <div class="ui two column centered grid description">
      <div class="ui form column">
        <div class="field">
          <label>Name</label>
          <input type="text" name="username" placeholder="Enter your name" value="${item => item.username}">
        </div>
        <div class="field">
          <label>Select input device</label>
          ${item => select('input', item.devices)}
        </div>
      </div>
    </div>
  </div>
  <div class="actions">
    <div class="ui button cancel">Cancel</div>
    <div class="ui button approve">Save</div>
  </div>
</div>`;

const select = (name, devices) => bel `<select name="${name}" class="ui dropdown">
	${devices.map(function (device) {
		return bel`${option(device)}`;
	})}
</select>`;
const option = (device) => bel `
	<option value="${device.id}">${device.label}</option>
`;

module.exports = (storage) => {
	return navigator.mediaDevices.enumerateDevices().then((devices) => {
		return devices.filter(d => 'audioinput' === d.kind).map((device, i) => {
			return {
				id: device.deviceId,
				label: device.label || `Microphone ${i}`
			};
		});
	}).then((devices) => {
		const modal = template({
			username: storage.get('username'),
			devices
		});

		storage.on('change:username', (username) => {
			modal.update({
				username: username,
				devices
			});
		});

		$(modal).modal({
			onApprove() {
				const name = $(modal).find('[name="username"]').val();
				const input = $(modal).find('[name="input"]').val();

				storage.set('username', name);
				storage.set('input', input);
			}
		});

		return modal;
	});
};