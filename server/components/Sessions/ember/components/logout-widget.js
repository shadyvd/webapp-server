define(
	'twyr-webapp/components/logout-widget',
	['exports', 'ember', 'twyr-webapp/components/base-widget'],
	function(exports, _ember, _baseWidget) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/components/logout-widget');
		exports['default'] = _baseWidget['default'].extend({
			'tagName': 'li',

			'didInsertElement': function() {
				this._super(...arguments);
				this.get('store').findAll('profile');
			},

			'doLogout': function() {
				this.dummyFunc()
				.then(() => {
					return this.ajaxFunc({
						'type': 'GET',
						'url': '/Sessions/logout',
						'dataType': 'json'
					});
				})
				.catch((err) => {
					this.sendAction('controller-action', 'display-status-message', {
						'type': 'danger',
						'message': (err.responseJSON ? err.responseJSON.error : (err.responseText || 'Unknown error' ))
					});

					window.Cookies.remove('twyr-webapp', { 'path': '/', 'domain': '.twyr.com' });
				})
				.finally(function() {
					window.location.href = '/';
				});
			}
		});
	}
);
