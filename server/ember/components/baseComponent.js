define(
	'twyr-webapp/components/base-widget',
	['exports', 'ember', 'twyr-webapp/application'],
	function(exports, _ember, _app) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/components/base-widget');
		exports['default'] = _ember['default'].Component.extend(_ember['default'].Evented, {
			'store': _ember['default'].inject.service(),

			'dummyFunc': function() {
				return new _ember['default'].RSVP.Promise(function(resolve, reject) {
					resolve();
				});
			},

			'ajaxFunc': function(options) {
				return new _ember['default'].RSVP.Promise(function(resolve, reject) {
					_ember['default'].$.ajax(options)
					.done(function() {
						resolve(...arguments);
					})
					.fail(function() {
						if(window.developmentMode) console.error(options.url + ' error:\n', arguments);
						reject(...arguments);
					});
				});
			},

			'actions': {
				'controller-action': function(action, data) {
					if(this[action])
						this[action](data);
					else
						this.sendAction('controller-action', action, data);
				}
			}
		});
	}
);
