define(
	'twyr-webapp/components/application-chooser',
	['exports', 'ember', 'twyr-webapp/components/base-widget'],
	function(exports, _ember, _baseWidget) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/components/application-chooser');
		exports['default'] = _baseWidget['default'].extend({
			'displayData': undefined,
			'backgroundColors': [
				'red-active',
				'yellow-active',
				'aqua-active',
				'blue-active',
				'light-blue-active',
				'green-active',
				'navy-active',
				'teal-active',
				'olive-active',
				'lime-active',
				'orange-active',
				'fuchsia-active',
				'purple-active',
				'maroon-active',
				'black-active'
			],

			'didInsertElement': function() {
				this._super(...arguments);

				this.dummyFunc()
				.then(() => {
					const areAppModelsLoaded = this.get('store').peekAll('dashboard-application-category').get('length');
					if(areAppModelsLoaded) return;

					return this.get('store').findAll('dashboard-application-category');
				})
				.then(() => {
					const numApps = this.get('store').peekAll('dashboard-application').get('length'),
						setupFn = (numApps <= 24) ? this._setupApps.bind(this) : this._setupCategories.bind(this);

					return setupFn();
				})
				.catch((err) => {
					if(window.developmentMode) console.error('application-chooser::didInsertElement error:\n', err);
					this.sendAction('controller-action', 'display-status-message', {
						'type': 'danger',
						'message': err.message
					});
				});
			},

			'_setupApps': function() {
				return new _ember['default'].RSVP.Promise((resolve, reject) => {
					this.dummyFunc()
					.then(() => {
						const _displayData = _ember['default'].Object.create({
							'applications': ((this.get('store').peekAll('dashboard-application')) || (_ember['default'].ArrayProxy.create({ 'content': _ember['default'].A([]) }))).sortBy('name')
						});

						_displayData.applications.forEach((application, idx) => {
							application.set('bgColorClass', this.get('backgroundColors')[(idx % (this.get('backgroundColors.length')))]);
						});

						this.set('displayData', _displayData);
						resolve();
					})
					.catch((err) => {
						console.error('allApplications, period error: ', err);
						reject(err);
					});
				});
			},

			'_setupCategories': function() {
				return new _ember['default'].RSVP.Promise((resolve, reject) => {
					this.dummyFunc()
					.then(() => {
						const promiseResolutions = [];
						this.get('store').peekAll('dashboard-application-category').forEach((dashboardCategory) => {
							promiseResolutions.push(dashboardCategory.get('allApplications'));
						});

						return _ember['default'].RSVP.all(promiseResolutions);
					})
					.then((results) => {
						const totalApps = _ember['default'].ArrayProxy.create({ 'content': _ember['default'].A([]) });
						results.forEach((result) => {
							totalApps.addObjects(result);
						});

// TODO: Categorize apps into categories, etc.

						resolve();
					})
					.catch((err) => {
						console.error('allApplications, period error: ', err);
						reject(err);
					});
				});
			}
		});
	}
);
