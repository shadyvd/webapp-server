/**
 * @file      server/middlewares/Application/middleware.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @summary   The Twy'r Web Application Application Middleware - provides functionality for all application related operations
 *
 */

'use strict';

/**
 * Module dependencies, required for ALL Twy'r modules
 * @ignore
 */
const promises = require('bluebird');

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseMiddleware = require('./../TwyrBaseMiddleware').TwyrBaseMiddleware;

class Application extends TwyrBaseMiddleware {
	constructor(module) {
		super(module);
	}

	start(dependencies, callback) {
		this._dummyAsync()
		.then(() => {
			const superStartAsync = promises.promisify(super.start.bind(this));
			return superStartAsync(dependencies);
		})
		.then((status) => {
			let server = this.$module;
			while(server.$module) server = server.$module;

			const configService = this.$dependencies.ConfigurationService;
			return promises.all([status, configService.getModuleIdAsync(server)]);
		})
		.then((results) => {
			this.$serverId = results[1];

			if(callback) callback(null, results[0]);
			return null;
		})
		.catch((startErr) => {
			if(callback) callback(startErr);
		});
	}

	_registerApis(callback) {
		this._dummyAsync()
		.then(() => {
			const apiService = this.$dependencies.ApiService,
				promiseResolutions = [];

			promiseResolutions.push(apiService.addAsync(`${this.name}::applicationWithCategory`, this._getTenantUserApplicationsWithCategoryAsync.bind(this)));

			return promises.all(promiseResolutions);
		})
		.then(() => {
			if(callback) callback();
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_deregisterApis(callback) {
		this._dummyAsync()
		.then(() => {
			const apiService = this.$dependencies.ApiService,
				promiseResolutions = [];

			promiseResolutions.push(apiService.removeAsync(`${this.name}::applicationWithCategory`, this._getTenantUserApplicationsWithCategoryAsync.bind(this)));

			return promises.all(promiseResolutions);
		})
		.then(() => {
			if(callback) callback();
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_getTenantUserApplicationsWithCategory(tenant, user, media, callback) {
		const cacheService = this.$dependencies.CacheService,
			dbService = this.$dependencies.DatabaseService.knex;

		this._dummyAsync()
		.then(() => {
			return promises.all([
				dbService.raw('SELECT id FROM tenant_folders WHERE tenant = (SELECT id FROM tenants WHERE sub_domain = ?) AND parent IS NULL AND name = ?', [tenant, 'Application Categories']),
				cacheService.getAsync(`twyr!webapp!${media}!user!${user.id}!${tenant}!applications`)
			]);
		})
		.then((results) => {
			const tenantApplicationCategoryFolderId = results[0].rows[0].id,
				tenantUserApplications = JSON.parse(results[1] || '[]');

			return promises.all([
				dbService.raw('SELECT id, name, category, description FROM server_applications WHERE media = ?', [media]),
				dbService.raw('SELECT * FROM (SELECT * FROM fn_get_folder_descendants(?)) A LEFT OUTER JOIN (SELECT X.id AS application_id, X.name AS application_name, X.description AS application_description, Y.tenant_folder AS category FROM tenant_applications X INNER JOIN tenant_application_categories Y ON (Y.tenant_application = X.id) WHERE X.tenant = (SELECT id FROM tenants WHERE sub_domain = ?) AND X.media = ?) B ON (B.category = A.id)', [tenantApplicationCategoryFolderId, tenant, media]),
				tenantUserApplications
			]);
		})
		.then((results) => {
			const inflection = require('inflection');

			let serverApplications = results.shift().rows,
				tenantApplicationCategories = results.shift().rows;

			const tenantUserApplications = results.shift();
			const responseData = { 'data': [], 'included': [] };

			serverApplications = serverApplications.filter((serverApplication) => {
				return tenantUserApplications.indexOf(inflection.dasherize(serverApplication.name).toLowerCase()) >= 0;
			});

			tenantApplicationCategories = tenantApplicationCategories.filter((tenantApplication) => {
				return tenantUserApplications.indexOf(inflection.dasherize(tenantApplication.application_name).toLowerCase()) >= 0;
			});

			const uniqueServerApplicationCategories = [];
			serverApplications.forEach((serverApplication) => {
				if(uniqueServerApplicationCategories.indexOf(serverApplication.category) >= 0)
					return;

				uniqueServerApplicationCategories.push(serverApplication.category);
				const categoryJSON = {
					'id': serverApplication.category,
					'type': 'dashboard-application-categories',
					'attributes': {
						'name': serverApplication.category
					},
					'relationships': {
						'applications': {
							'data': []
						}
					}
				};

				serverApplications
				.filter((application) => {
					return application.category === serverApplication.category;
				})
				.forEach((categoryMatchApp) => {
					categoryJSON.relationships.applications.data.push({
						'id': categoryMatchApp.id,
						'type': 'dashboard-application'
					});
				});

				responseData.included.push({
					'id': serverApplication.id,
					'type': 'dashboard-application',
					'attributes': {
						'name': serverApplication.name,
						'route': inflection.dasherize(serverApplication.name).toLowerCase(),
						'description': serverApplication.description
					},
					'relationships': {
						'category': {
							'id': serverApplication.category,
							'type': 'dashboard-application-categories'
						}
					}
				});

				responseData.data.push(categoryJSON);
			});

			const uniqueTenantApplicationCategories = [];
			tenantApplicationCategories.forEach((tenantApplicationCategory) => {
				if(uniqueTenantApplicationCategories.indexOf(tenantApplicationCategory.category) >= 0)
					return;

				uniqueTenantApplicationCategories.push(tenantApplicationCategory.category);
				const categoryJSON = {
					'id': tenantApplicationCategory.id,
					'type': 'dashboard-application-categories',
					'attributes': {
						'name': tenantApplicationCategory.name
					},
					'relationships': {
						'parent': {
							'data': {
								'id': tenantApplicationCategory.parent,
								'type': 'dashboard-application-categories'
							}

						},

						'children': {
							'data': []
						},

						'applications': {
							'data': []
						}
					}
				};

				tenantApplicationCategories
				.filter((childCategory) => {
					return childCategory.parent === tenantApplicationCategory.id;
				})
				.forEach((childCategory) => {
					categoryJSON.relationships.children.data.push({
						'id': childCategory.id,
						'type': 'dashboard-application-categories'
					});
				});

				tenantApplicationCategories
				.filter((appCategory) => {
					return appCategory.category === tenantApplicationCategory.id;
				})
				.forEach((appCategory) => {
					categoryJSON.relationships.applications.data.push({
						'id': appCategory.application_id,
						'type': 'dashboard-application'
					});
				});

				responseData.included.push({
					'id': tenantApplicationCategory.application_id,
					'type': 'dashboard-application',
					'attributes': {
						'name': tenantApplicationCategory.application_name,
						'route': inflection.dasherize(tenantApplicationCategory.application_name).toLowerCase(),
						'description': tenantApplicationCategory.application_description
					},
					'relationships': {
						'category': {
							'id': tenantApplicationCategory.category,
							'type': 'dashboard-application-categories'
						}
					}
				});

				responseData.data.push(categoryJSON);
			});

			if(callback) callback(null, responseData);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	get basePath() { return __dirname; }
}

exports.middleware = Application;
