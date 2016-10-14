/* global window */
const bel = require('bel');

const navigate = (to) => window.location = `?room=${to}`;
const random = () => Math.random().toString(36).substring(7);

module.exports = bel`
<div class="join-container">
	<div class="ui large buttons">
		<button onclick=${function() {navigate('room');}} id="join-party" class="ui button">Join the Party 🎉</button>
    	<div class="or"></div>
		<button onclick=${function() {navigate(random());}} id="create-room" class="ui button">🚪 Create New Room</button>
	</div>
</div>
`;