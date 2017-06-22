define(
	'twyr-webapp/models/base',
	['exports', 'ember', 'ember-data/model', 'ember-data/attr'],
	function(exports, _ember, _model, _attr) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/models/base');
		exports['default'] = _model['default'].extend({
			'createdAt': _attr['default']('date', { 'defaultValue': function() { return new Date(); } }),
			'updatedAt': _attr['default']('date', { 'defaultValue': function() { return new Date(); } }),

			'dummyFunc': function() {
				return new _ember['default'].RSVP.Promise(function(resolve, reject) {
					resolve();
				});
			},

			'formattedCreatedAt': _ember['default'].computed('createdAt', {
				'get': function(key) {
					return window.moment(this.get('createdAt')).format('DD/MMM/YYYY hh:mm A');
				}
			}).readOnly(),

			'formattedUpdatedAt': _ember['default'].computed('updatedAt', {
				'get': function(key) {
					return window.moment(this.get('updatedAt')).format('DD/MMM/YYYY hh:mm A');
				}
			}).readOnly()
		});
	}
);
