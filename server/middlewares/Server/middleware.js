/**
 * @file      server/middlewares/Server/middleware.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @summary   The Twy'r Web Application Server Middleware - provides functionality for all server related operations
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

class Server extends TwyrBaseMiddleware {
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

			promiseResolutions.push(apiService.addAsync(`${this.name}::applications`, this._getServerApplicationsAsync.bind(this)));

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

			promiseResolutions.push(apiService.removeAsync(`${this.name}::applications`, this._getServerApplicationsAsync.bind(this)));

			return promises.all(promiseResolutions);
		})
		.then(() => {
			if(callback) callback();
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_getServerApplications(mediaType, callback) {
		const inflection = require('inflection');
		const databaseSrvc = this.$dependencies.DatabaseService.knex;

		this._dummyAsync()
		.then(() => {
			return databaseSrvc.raw('SELECT id, server, name, description, is_default FROM server_applications WHERE server = ? AND media = ?', [this.$serverId, mediaType]);
		})
		.then((serverApplications) => {
			serverApplications = serverApplications.rows;

			const promiseResolutions = [];
			serverApplications.forEach((serverApplication) => {
				promiseResolutions.push(databaseSrvc.raw('SELECT id, name FROM server_application_screens WHERE server_application = ?', [serverApplication.id]));
			});

			promiseResolutions.push(serverApplications);
			return promises.all(promiseResolutions);
		})
		.then((results) => {
			const serverApplications = results.pop();

			results.forEach((serverApplicationScreens, idx) => {
				serverApplicationScreens = serverApplicationScreens.rows;
				serverApplications[idx].screens = serverApplicationScreens;
			});

			const promiseResolutions = [];
			serverApplications.forEach((serverApplication) => {
				promiseResolutions.push(databaseSrvc.raw('SELECT A.name AS menu_name, B.id AS id, B.server_application AS application, B.server_application_menu AS menu, B.server_application_screen AS screen, B.parent, B.display_text, B.is_home FROM server_application_menus A INNER JOIN server_application_menu_items B ON (B.server_application_menu = A.id) WHERE A.server_application = ?', [serverApplication.id]));
			});

			promiseResolutions.push(serverApplications);
			return promises.all(promiseResolutions);
		})
		.then((results) => {
			const serverApplications = results.pop();

			results.forEach((serverApplicationMenus, idx) => {
				serverApplicationMenus = serverApplicationMenus.rows;
				serverApplications[idx].menus = serverApplicationMenus;
			});

			serverApplications.forEach((serverApplication) => {
				serverApplication.id = inflection.dasherize(serverApplication.name.toLowerCase());
				serverApplication.tenant_folder = 'server';
			});
			if(callback) callback(null, serverApplications);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	get basePath() { return __dirname; }
}

exports.middleware = Server;
