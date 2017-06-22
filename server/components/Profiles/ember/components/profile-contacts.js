define(
	'twyr-webapp/components/profile-contacts',
	['exports', 'ember', 'twyr-webapp/application', 'twyr-webapp/components/base-widget'],
	function(exports, _ember, _app, _baseWidget) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/components/profile-contacts');
		exports['default'] = _baseWidget['default'].extend({
			'didInsertElement': function() {
				this._super(...arguments);
				this.$('div.box').activateBox();

				this.dummyFunc()
				.then(() => {
					const promiseResolutions = [],
						profileModel = this.get('store').peekAll('profile').objectAt(0);

					if(profileModel) {
						promiseResolutions.push(profileModel);
					}
					else {
						promiseResolutions.push(this.get('store').findAll('profile'));
					}

					return _ember['default'].RSVP.allSettled(promiseResolutions);
				})
				.then(() => {
					this.set('model', this.get('store').peekAll('profile').objectAt(0));
					return this.get('model').get('profileContacts');
				})
				.then((profileContacts) => {
					profileContacts.forEach((profileContact) => {
						if(!profileContact.get('isNew')) return;
						this._setupContactTypeSelect(profileContact);
					});
				})
				.catch((err) => {
					if(window.developmentMode) console.error('profile-contacts::didInsertElement error:\n', err);
					this.sendAction('controller-action', 'display-status-message', {
						'type': 'danger',
						'message': err.message
					});
				});
			},

			'_setupContactTypeSelect': function(contact) {
				const typeSelectElem = _ember['default'].$('select#profile-contacts-select-type-' + contact.get('id'));
				typeSelectElem.select2({
					'ajax': {
						'url': '/Masterdata/contactTypes',
						'dataType': 'json',

						'processResults': (data) => {
							return  {
								'results': _ember['default'].$.map(data, (item) => {
									return {
										'text': _ember['default'].String.capitalize(item),
										'slug': _ember['default'].String.capitalize(item),
										'id': item
									};
								})
							};
						},

						'cache': true
					},

					'minimumInputLength': 0,
					'minimumResultsForSearch': 10,

					'allowClear': true,
					'closeOnSelect': true,

					'placeholder': 'Type'
				})
				.on('change', () => {
					contact.set('type', typeSelectElem.val());
				});

				this.dummyFunc()
				.then(() => {
					return this.ajaxFunc({
						'url': '/Masterdata/contactTypes',
						'dataType': 'json',
						'cache': true
					});
				})
				.then((data) => {
					_ember['default'].$.each(data, (index, item) => {
						const thisOption = new Option(_ember['default'].String.capitalize(item), item, false, false);
						typeSelectElem.append(thisOption);
					});

					typeSelectElem.val(contact.get('type')).trigger('change');
				})
				.catch(() => {
					if(window.developmentMode) console.error('profile-contacts::_setupContactTypeSelect error:\n', err);
					this.sendAction('controller-action', 'display-status-message', {
						'type': 'danger',
						'message': err.message
					});
				});
			},

			'add': function() {
				const newProfileContact = this.get('store').createRecord('profile-contact', {
						'id': _app['default'].UUID(),
						'profile': this.get('model'),

						'createdAt': new Date(),
						'updatedAt': new Date()
					});

				_ember['default'].run.scheduleOnce('afterRender', () => {
					this._setupContactTypeSelect(newProfileContact);
				});

				this.get('model.profileContacts').pushObject(newProfileContact);
			},

			'save': function(contact) {
				this.dummyFunc()
				.then(() => {
					return contact.save();
				})
				.then(() => {
					this.sendAction('controller-action', 'display-status-message', {
						'type': 'success',
						'message': contact.get('contact') + ' saved succesfully'
					});
				})
				.catch((err) => {
					if(window.developmentMode) console.error('profile-contacts::save error:\n', err);
					this.sendAction('controller-action', 'display-status-message', {
						'type': 'ember-error',
						'errorModel': contact
					});
				});
			},

			'delete': function(contact) {
				this.dummyFunc()
				.then(() => {
					return contact.destroyRecord();
				})
				.then(() => {
					this.get('model.profileContacts').removeObject(contact);
					if(!contact.get('contact')) return;

					this.sendAction('controller-action', 'display-status-message', {
						'type': 'success',
						'message': contact.get('displayType') + ': ' + contact.get('contact') + ' contact deleted succesfully'
					});
				})
				.catch((err) => {
					if(window.developmentMode) console.error('profile-contacts::delete error:\n', err);
					this.sendAction('controller-action', 'display-status-message', {
						'type': 'ember-error',
						'errorModel': contact
					});
				});
			}
		});
	}
);
