define(
	'twyr-webapp/controllers/application',
	['exports', 'ember', 'twyr-webapp/controllers/base-controller'],
	function(exports, _ember, _baseController) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/controllers/application');
		exports['default'] = _baseController['default'].extend({
			'realtimeData': _ember['default'].inject.service('realtime-data'),

			'init': function() {
				this._super(...arguments);

				this.get('realtimeData').on('websocket-data::display-status-message', (data) => {
					this['display-status-message']({ 'type': 'info', 'message': data});
				});

				this.get('realtimeData').on('websocket-close', () => {
					this['display-status-message']({ 'type': 'warning', 'message': 'Realtime Data Connectivity lost! Will attempt reconnection!!'});
				})

				this.get('realtimeData').on('websocket-disconnection', () => {
					this['display-status-message']({ 'type': 'danger', 'message': 'Realtime Data Connectivity lost!!'});
				})
			},

			'resetStatusMessages': function(timeout) {
				_ember['default'].$('div#template-status-message').slideUp(timeout || 600);
				_ember['default'].$('div#template-status-message span').text('');

				_ember['default'].$('div#template-status-message').removeClass('callout-danger');
				_ember['default'].$('div#template-status-message').removeClass('callout-warning');
				_ember['default'].$('div#template-status-message').removeClass('callout-info');
				_ember['default'].$('div#template-status-message').removeClass('callout-success');

				_ember['default'].$('div#template-error-message').slideUp(timeout || 600);
				this.set('errorModel', null);
			},

			'display-status-message': function(data) {
				if(window.developmentMode) console.info('Status Message:\n', data);

				this.resetStatusMessages(2);
				if(data.type != 'ember-error') {
					_ember['default'].$('div#template-status-message').addClass('callout-' + data.type);
					_ember['default'].$('div#template-status-message span').html(data.message);

					_ember['default'].$('div#template-status-message').slideDown(600);
				}
				else {
					this.set('errorModel', data.errorModel);
					_ember['default'].$('div#template-error-message').slideDown(600);
				}

				_ember['default'].run.later(this, () => {
					this.resetStatusMessages(600);
				}, 10000);
			},

			'actions': {
				'controller-action': function(action, data) {
					if(this[action])
						this[action](data);
					else
						console.log('TODO: Handle ' + action + ' action with data: ', data);
				}
			}
		});
	}
);
