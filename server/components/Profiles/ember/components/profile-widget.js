define(
	'twyr-webapp/components/profile-widget',
	['exports', 'ember', 'twyr-webapp/components/base-widget'],
	function(exports, _ember, _baseWidget) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/components/profile-widget');
		exports['default'] = _baseWidget['default'].extend({
			'tagName': 'li',
			'imageSource': '/Profiles/get-image',
			'profiles': undefined,
			'profile': undefined,

			'didInsertElement': function() {
				this._super(...arguments);
				this.set('profiles', this.get('store').peekAll('profile'));
			},

			'onProfileLoaded': _ember['default'].observer('profiles.length', function() {
				this.set('profile', this.get('profiles').objectAt(0));
			}),

			'onProfileImageChanged': _ember['default'].observer('profile.profileImage', function() {
				this.set('imageSource', '/Profiles/get-image?_random=' + window.moment().valueOf());
			})
		});
	}
);
