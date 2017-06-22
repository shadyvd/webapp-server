define(
	'twyr-webapp/adapters/dashboard-application-category',
	['exports', 'twyr-webapp/adapters/application'],
	function(exports, _appAdapter) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/adapters/dashboard-application-category');

		exports['default'] = _appAdapter['default'].extend({
			'namespace': '/Applications'
		});
	}
);

define(
	'twyr-webapp/models/dashboard-application-category',
	['exports', 'ember', 'ember-data', 'ember-data/attr', 'ember-data/relationships', 'twyr-webapp/models/base'],
	function(exports, _ember, _emberData, _attr, _relationships, _twyrBaseModel) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/models/dashboard-application-category');
		exports['default'] = _twyrBaseModel['default'].extend({
			'name': _attr['default']('string'),
			'parent': _relationships.belongsTo('dashboard-application-category', { 'inverse': 'children', 'async': true }),
			'children': _relationships.hasMany('dashboard-application-category', { 'inverse': 'parent', 'async': true }),

			'applications': _relationships.hasMany('dashboard-application', { 'inverse': 'category', 'async': true }),

			'allApplications': _ember['default'].computed('applications.length', 'children.length', 'children.@each.allApplications.length', {
				'get': function() {
					const promiseResolutions = [];

					promiseResolutions.push(this.get('applications'));
					promiseResolutions.push(new _ember['default'].RSVP.Promise((resolve, reject) => {
						const childAllApps = [];
						this.get('children')
						.then((childCategories)  =>{
							childCategories.forEach((childCategory) => {
								childAllApps.push(childCategory.get('allApplications'));
							});

							return _ember['default'].RSVP.all(childAllApps);
						})
						.then((results) => {
							const allChildCategoryApps = _ember['default'].ArrayProxy.create({ 'content': _ember['default'].A([]) });
							results.forEach((childAllApps) => {
								allChildCategoryApps.addObjects(childAllApps);
							});

							resolve(allChildCategoryApps);
							return null;
						})
						.catch((err) => {
							reject(err);
						});
					}));

					const appList = _emberData['default'].PromiseArray.create({
						'promise': new _ember['default'].RSVP.Promise((resolve, reject) => {
							_ember['default'].RSVP.all(promiseResolutions)
							.then((results) => {
								const allChildCategoryApps = _ember['default'].ArrayProxy.create({ 'content': _ember['default'].A([]) });
								results.forEach((childAllApps) => {
									allChildCategoryApps.addObjects(childAllApps);
								});

								resolve(allChildCategoryApps);
								return null;
							})
							.catch(function(err) {
								reject(err);
							});
						})
					});

					return appList;
				}
			}).readOnly()
		});
	}
);

define(
	'twyr-webapp/adapters/dashboard-application',
	['exports', 'twyr-webapp/adapters/application'],
	function(exports, _appAdapter) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/adapters/dashboard-application');

		exports['default'] = _appAdapter['default'].extend({
			'namespace': '/Applications'
		});
	}
);

define(
	'twyr-webapp/models/dashboard-application',
	['exports', 'ember', 'ember-data/attr', 'ember-data/relationships', 'twyr-webapp/models/base'],
	function(exports, _ember, _attr, _relationships, _twyrBaseModel) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/models/dashboard-application');
		exports['default'] = _twyrBaseModel['default'].extend({
			'name': _attr['default']('string'),
			'route': _attr['default']('string'),
			'description': _attr['default']('string', { 'defaultValue': 'Hello, World!' }),
			'category': _relationships.belongsTo('dashboard-application-category', { 'inverse': 'applications' })
		});
	}
);

