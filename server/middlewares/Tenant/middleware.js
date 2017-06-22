/**
 * @file      server/middlewares/Tenant/middleware.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Tenant Middleware - provides functionality for all single-tenant related operations
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

class Tenant extends TwyrBaseMiddleware {
	constructor(module) {
		super(module);
	}

	_registerApis(callback) {
		this._dummyAsync()
		.then(() => {
			const apiService = this.$dependencies.ApiService,
				promiseResolutions = [];

			promiseResolutions.push(apiService.addAsync(`${this.name}::applications`, this._getTenantApplicationsAsync.bind(this)));

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

			promiseResolutions.push(apiService.removeAsync(`${this.name}::applications`, this._getTenantApplicationsAsync.bind(this)));

			return promises.all(promiseResolutions);
		})
		.then(() => {
			if(callback) callback();
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_getTenantApplications(tenant, mediaType, callback) {
		const inflection = require('inflection');
		const databaseSrvc = this.$dependencies.DatabaseService.knex;

		this._dummyAsync()
		.then(() => {
			return databaseSrvc.raw('SELECT id, tenant, name, description, is_default FROM tenant_applications WHERE tenant = (SELECT id FROM tenants WHERE sub_domain = ?) AND media = ?', [tenant, mediaType]);
		})
		.then((tenantApplications) => {
			tenantApplications = tenantApplications.rows;

			const promiseResolutions = [];
			tenantApplications.forEach((tenantApplication) => {
				promiseResolutions.push(databaseSrvc.raw('SELECT id, name FROM tenant_application_screens WHERE tenant_application = ?', [tenantApplication.id]));
			});

			promiseResolutions.push(tenantApplications);
			return promises.all(promiseResolutions);
		})
		.then((results) => {
			const tenantApplications = results.pop();

			results.forEach((tenantApplicationScreens, idx) => {
				tenantApplicationScreens = tenantApplicationScreens.rows;
				tenantApplications[idx].screens = tenantApplicationScreens;
			});

			const promiseResolutions = [];
			tenantApplications.forEach((tenantApplication) => {
				promiseResolutions.push(databaseSrvc.raw('SELECT A.name AS menu_name, B.id AS id, B.tenant_application AS application, B.tenant_application_menu AS menu, B.tenant_application_screen AS screen, B.parent, B.display_text, B.is_home FROM tenant_application_menus A INNER JOIN tenant_application_menu_items B ON (B.tenant_application_menu = A.id) WHERE A.tenant_application = ?', [tenantApplication.id]));
			});

			promiseResolutions.push(tenantApplications);
			return promises.all(promiseResolutions);
		})
		.then((results) => {
			const tenantApplications = results.pop();

			results.forEach((tenantApplicationMenus, idx) => {
				tenantApplicationMenus = tenantApplicationMenus.rows;
				tenantApplications[idx].menus = tenantApplicationMenus;
			});

			tenantApplications.forEach((tenantApplication) => {
				tenantApplication.id = inflection.dasherize(tenantApplication.name.toLowerCase());
				tenantApplication.tenant_folder = tenant;
			});

			if(callback) callback(null, tenantApplications);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	get basePath() { return __dirname; }
}

exports.middleware = Tenant;
