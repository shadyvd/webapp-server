define(
	'twyr-webapp/adapters/profile',
	['exports', 'twyr-webapp/adapters/application'],
	function(exports, _appAdapter) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/adapters/profile');
		exports['default'] = _appAdapter['default'].extend({
			'namespace': '/Profiles'
		});
	}
);

define(
	'twyr-webapp/models/profile',
	['exports', 'ember', 'ember-data/attr', 'ember-data/relationships', 'twyr-webapp/models/base'],
	function(exports, _ember, _attr, _relationships, _twyrBaseModel) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/models/profile');
		exports['default'] = _twyrBaseModel['default'].extend({
			'firstName': _attr['default']('string'),
			'middleNames': _attr['default']('string'),
			'lastName': _attr['default']('string'),
			'nickname': _attr['default']('string'),

			'profileImage': _attr['default']('string'),
			'profileImageMetadata': _attr['default']('string'),

			'gender': _attr['default']('string'),
			'dob': _attr['default']('date', { 'defaultValue': function() { return new Date(); } }),

			'email': _attr['default']('string'),
			'profileContacts': _relationships.hasMany('profile-contact', { 'inverse': 'login', 'async': true }),

			'formattedDOB': _ember['default'].computed('dob', {
				'get': function(key) {
					return window.moment(this.get('dob')).format('DD MMM YYYY');
				},

				'set': function(key, newValue) {
					this.set('dob', window.moment.tz(newValue, 'DD MMM YYYY', 'GMT').add(12, 'h').toDate());
					return newValue;
				}
			}),

			'fullName': _ember['default'].computed('firstName', 'lastName', {
				'get': function(key) {
					return this.get('firstName') + ' ' + this.get('lastName');
				}
			}).readOnly()
		});
	}
);

define(
	'twyr-webapp/adapters/profile-contact',
	['exports', 'twyr-webapp/adapters/application'],
	function(exports, _appAdapter) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/adapters/profile-contact');
		exports['default'] = _appAdapter['default'].extend({
			'namespace': '/Profiles'
		});
	}
);

define(
	'twyr-webapp/models/profile-contact',
	['exports', 'ember', 'ember-data/attr', 'ember-data/relationships', 'twyr-webapp/models/base'],
	function(exports, _ember, _attr, _relationships, _twyrBaseModel) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/models/profile-contact');
		exports['default'] = _twyrBaseModel['default'].extend({
			'contact': _attr['default']('string'),
			'type': _attr['default']('string', { 'defaultValue': 'other' }),

			'displayType': _ember['default'].computed('type', {
				'get': function(key) {
					return _ember['default'].String.capitalize(this.get('type'));
				}
			}).readOnly(),

			'login': _relationships.belongsTo('profile', { 'inverse': 'profileContacts' })
		});
	}
);

