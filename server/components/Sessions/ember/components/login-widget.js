define(
	'twyr-webapp/components/login-widget',
	['exports', 'ember', 'twyr-webapp/components/base-widget'],
	function(exports, _ember, _baseWidget) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/components/login-widget');
		exports['default'] = _baseWidget['default'].extend({
			'username': '',
			'password': '',

			'resetUsername': '',

			'registerUsername': '',
			'registerFirstname': '',
			'registerLastname': '',

			'usernameChanged': _ember['default'].observer('username', 'resetUsername', function(self, property) {
				const constraints = {
						'username': {
							'presence': true,
							'email': {
								'message': '%value does not look like it\'s a valid email'
							}
						}
					};

				let buttonElem = null;
				switch(property) {
					case 'username':
						buttonElem = self.$('button#login-button-submit');
						break;

					case 'resetUsername':
						buttonElem = self.$('button#reset-password-button-submit');
						break;
				};

				const validatorResults = window.validate({ 'username': self.get(property) }, constraints);
				if(validatorResults == undefined) {
					buttonElem.addClass('btn-primary');
					buttonElem.removeAttr('disabled', 'disabled');
				}
				else {
					buttonElem.removeClass('btn-primary');
					buttonElem.attr('disabled', true);
				}
			}),

			'newAccountFormChanged': _ember['default'].observer('registerUsername', 'registerFirstname', 'registerLastname', function(self) {
				const constraints = {
					'registerUsername': {
						'presence': true,
						'email': {
							'message': '%value does not look like it\'s a valid email'
						}
					},

					'registerFirstname': {
						'presence': true
					},

					'registerLastname': {
						'presence': true
					}
				};

				const validatorResults = window.validate({
					'registerUsername': self.get('registerUsername'),
					'registerFirstname': self.get('registerFirstname'),
					'registerLastname': self.get('registerLastname')
				}, constraints);

				if(validatorResults == undefined) {
					self.$('button#register-account-button-submit').addClass('btn-primary');
					self.$('button#register-account-button-submit').removeAttr('disabled', 'disabled');
				}
				else {
					self.$('button#register-account-button-submit').removeClass('btn-primary');
					self.$('button#register-account-button-submit').attr('disabled', true);
				}
			}),

			'resetAllForms': function() {
				this.resetLoginForm();
				this.resetForgotPasswordForm();
				this.resetRegisterAccountForm();
			},

			'lockAllForms': function() {
				this.lockLoginForm();
				this.lockForgotPasswordForm();
				this.lockRegisterAccountForm();
			},

			'showLoginForm': function() {
				this.$('div#div-box-body-register-account').slideUp(600);
				this.$('div#div-box-body-reset-password').slideUp(600);

				this.resetLoginForm();
				this.$('div#div-box-body-login').slideDown(600);
			},

			'resetLoginForm': function() {
				this.lockLoginForm();

				this.set('username', '');
				this.set('password', '');
			},

			'lockLoginForm': function() {
				this.$('button#login-button-submit').removeClass('btn-primary');
				this.$('button#login-button-submit').attr('disabled', 'disabled');
			},

			'showResetPasswordForm': function() {
				this.$('div#div-box-body-login').slideUp(600);
				this.$('div#div-box-body-register-account').slideUp(600);

				this.resetForgotPasswordForm();
				this.$('div#div-box-body-reset-password').slideDown(600);
			},

			'resetForgotPasswordForm': function() {
				this.lockForgotPasswordForm();
				this.set('resetUsername', '');
			},

			'lockForgotPasswordForm': function() {
				this.$('button#reset-password-button-submit').removeClass('btn-primary');
				this.$('button#reset-password-button-submit').attr('disabled', 'disabled');
			},

			'showRegisterAccountForm': function() {
				this.$('div#div-box-body-login').slideUp(600);
				this.$('div#div-box-body-reset-password').slideUp(600);

				this.resetRegisterAccountForm();
				this.$('div#div-box-body-register-account').slideDown(600);
			},

			'resetRegisterAccountForm': function() {
				this.lockRegisterAccountForm();

				this.set('registerUsername', '');
				this.set('registerFirstname', '');
				this.set('registerLastname', '');
			},

			'lockRegisterAccountForm': function() {
				this.$('button#register-account-button-submit').removeClass('btn-primary');
				this.$('button#register-account-button-submit').attr('disabled', 'disabled');
			},

			'doLogin': function() {
				this.lockLoginForm();
				this.sendAction('controller-action', 'display-status-message', {
					'type': 'info',
					'message': 'Logging you in...'
				});

				this.dummyFunc()
				.then(() => {
					return this.ajaxFunc({
						'type': 'POST',
						'url': '/Sessions/login',

						'dataType': 'json',
						'data': {
							'username': this.get('username'),
							'password': this.get('password')
						}
					});
				})
				.then((data) => {
					if(data.status) {
						this.sendAction('controller-action', 'display-status-message', {
							'type': 'success',
							'message': data.responseText
						});

						_ember['default'].run.later(this, () => {
							window.location.href = '/';
						}, 500);
					}
					else {
						this.sendAction('controller-action', 'display-status-message', {
							'type': 'danger',
							'message': data.responseText
						});

						_ember['default'].run.later(this, () => {
							this.resetLoginForm();
						}, 5000);
					}
				})
				.catch((err) => {
					this.sendAction('controller-action', 'display-status-message', {
						'type': 'danger',
						'message': (err.responseJSON ? err.responseJSON.error : (err.responseText || 'Unknown error' ))
					});

					_ember['default'].run.later(this, () => {
						this.resetLoginForm();
					}, 5000);
				});
			},

			'doSocialLogin': function(socialNetwork) {
				const currentLocation = window.location.href;
				window.location.href = '/Sessions/' + socialNetwork + '?currentLocation=' + currentLocation;
			},

			'resetPassword': function() {
				this.lockForgotPasswordForm();
				this.sendAction('controller-action', 'display-status-message', {
					'type': 'info',
					'message': 'Resetting your password...'
				});

				this.dummyFunc()
				.then(() => {
					return this.ajaxFunc({
						'type': 'POST',
						'url': '/Sessions/resetPassword',

						'dataType': 'json',
						'data': {
							'username': this.get('resetUsername')
						}
					});
				})
				.then((data) => {
					if(data.status) {
						this.sendAction('controller-action', 'display-status-message', {
							'type': 'success',
							'message': data.responseText
						});

						_ember['default'].run.later(this, () => {
							this.resetForgotPasswordForm();
						}, 5000);
					}
					else {
						this.sendAction('controller-action', 'display-status-message', {
							'type': 'danger',
							'message': data.responseText
						});

						_ember['default'].run.later(this, () => {
							this.resetForgotPasswordForm();
						}, 5000);
					}
				})
				.catch((err) => {
					this.sendAction('controller-action', 'display-status-message', {
						'type': 'danger',
						'message': (err.responseJSON ? err.responseJSON.error : (err.responseText || 'Unknown error' ))
					});

					_ember['default'].run.later(this, () => {
						this.resetForgotPasswordForm();
					}, 5000);
				});
			},

			'registerAccount': function() {
				this.lockRegisterAccountForm();
				this.sendAction('controller-action', 'display-status-message', {
					'type': 'info',
					'message': 'Creating your account...'
				});

				this.dummyFunc()
				.then(() => {
					return this.ajaxFunc({
						'type': 'POST',
						'url': '/Sessions/registerAccount',

						'dataType': 'json',
						'data': {
							'username': this.get('registerUsername'),
							'firstname': this.get('registerFirstname'),
							'lastname': this.get('registerLastname')
						}
					});
				})
				.then((data) => {
					if(data.status) {
						this.sendAction('controller-action', 'display-status-message', {
							'type': 'success',
							'message': data.responseText
						});

						_ember['default'].run.later(this, () => {
							this.resetRegisterAccountForm();
						}, 5000);
					}
					else {
						this.sendAction('controller-action', 'display-status-message', {
							'type': 'danger',
							'message': data.responseText
						});

						_ember['default'].run.later(this, () => {
							this.resetRegisterAccountForm();
						}, 5000);
					}
				})
				.catch((err) => {
					this.sendAction('controller-action', 'display-status-message', {
						'type': 'danger',
						'message': (err.responseJSON ? err.responseJSON.error : (err.responseText || 'Unknown error' ))
					});

					_ember['default'].run.later(this, () => {
						this.resetRegisterAccountForm();
					}, 5000);
				});
			}
		});
	}
);
