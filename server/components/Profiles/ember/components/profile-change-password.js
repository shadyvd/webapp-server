define(
	'twyr-webapp/components/profile-change-password',
	['exports', 'ember', 'twyr-webapp/components/base-widget'],
	function(exports, _ember, _baseWidget) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/components/profile-change-password');
		exports['default'] = _baseWidget['default'].extend({
			'currentPassword': '',
			'newPassword1': '',
			'newPassword2': '',

			'shouldEnableCancel': false,
			'shouldEnableSave': false,

			'didInsertElement': function() {
				this._super(...arguments);
				this.$('div.box').activateBox();
			},

			'save': function() {
				this.dummyFunc()
				.then(() => {
					return this.ajaxFunc({
						'type': 'POST',
						'url': '/Profiles/change-password',

						'dataType': 'json',
						'data': {
							'currentPassword': this.get('currentPassword'),
							'newPassword1': this.get('newPassword1'),
							'newPassword2': this.get('newPassword2')
						}
					});
				})
				.then((data) => {
					if(data.status) {
						this.sendAction('controller-action', 'display-status-message', {
							'type': 'success',
							'message': 'Password changed'
						});
					}
					else {
						this.sendAction('controller-action', 'display-status-message', {
							'type': 'danger',
							'message': data.responseText
						});
					}

					this.cancel();
				})
				.catch((err) => {
					if(window.developmentMode) console.error(err);
					this.sendAction('controller-action', 'display-status-message', {
						'type': 'danger',
						'message': err.responseJSON.error
					});

					this.cancel();
				});
			},

			'cancel': function() {
				this.setProperties({
					'currentPassword': '',
					'newPassword1': '',
					'newPassword2': ''
				});
			},

			'onPasswordChanged': _ember['default'].observer('currentPassword', 'newPassword1', 'newPassword2', function() {
				if((this.get('currentPassword') == '') && (this.get('newPassword1') == '') && (this.get('newPassword2') == '')) {
					this.setProperties({
						'shouldEnableSave': false,
						'shouldEnableCancel': false
					});

					return;
				}

				if((this.get('currentPassword') != '') || (this.get('newPassword1') != '') || (this.get('newPassword2') != '')) {
					this.set('shouldEnableCancel', true);

					if((this.get('currentPassword') != '') && (this.get('newPassword1') != '') && (this.get('newPassword1') == this.get('newPassword2')))
						this.set('shouldEnableSave', true);
					else
						this.set('shouldEnableSave', false);
				}
			})
		});
	}
);
