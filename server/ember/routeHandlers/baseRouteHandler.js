define(
	'twyr-webapp/routes/application',
	['exports', 'ember'],
	function(exports, _ember) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/routes/application');
		exports['default'] = _ember['default'].Route.extend({
			'actions': {
				'controller-action': function(action, data) {
					this.get('controller').send('controller-action', action, data);
				}
			}
		});
	}
);
