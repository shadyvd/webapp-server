/**
 * @file      server/middlewares/Masterdata/middleware.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @summary   The Twy'r Web Application Masterdata Middleware
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

class Masterdata extends TwyrBaseMiddleware {
	constructor(module) {
		super(module);
	}

	_registerApis(callback) {
		this._dummyAsync()
		.then(() => {
			const apiService = this.$dependencies.ApiService,
				promiseResolutions = [];

			promiseResolutions.push(apiService.addAsync(`${this.name}::genders`, this._getGendersAsync.bind(this)));
			promiseResolutions.push(apiService.addAsync(`${this.name}::contactTypes`, this._getContactTypesAsync.bind(this)));
			promiseResolutions.push(apiService.addAsync(`${this.name}::serverApplicationCategories`, this._getServerApplicationCategoriesAsync.bind(this)));

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

			promiseResolutions.push(apiService.removeAsync(`${this.name}::genders`, this._getGendersAsync.bind(this)));
			promiseResolutions.push(apiService.removeAsync(`${this.name}::contactTypes`, this._getContactTypesAsync.bind(this)));
			promiseResolutions.push(apiService.removeAsync(`${this.name}::serverApplicationCategories`, this._getServerApplicationCategoriesAsync.bind(this)));

			return promises.all(promiseResolutions);
		})
		.then(() => {
			if(callback) callback();
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_getGenders(callback) {
		const dbSrvc = this.$dependencies.DatabaseService.knex;

		this._dummyAsync()
		.then(() => {
			return dbSrvc.raw('SELECT unnest(enum_range(NULL::gender)) AS genders');
		})
		.then((genders) => {
			const responseData = [];
			genders.rows.forEach((genderData) => {
				responseData.push(genderData.genders);
			});

			if(callback) callback(null, responseData);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_getContactTypes(callback) {
		const dbSrvc = this.$dependencies.DatabaseService.knex;

		this._dummyAsync()
		.then(() => {
			return dbSrvc.raw('SELECT unnest(enum_range(NULL::contact_type)) AS contact_types');
		})
		.then((contactTypes) => {
			const responseData = [];
			contactTypes.rows.forEach((contactTypeData) => {
				responseData.push(contactTypeData.contact_types);
			});

			if(callback) callback(null, responseData);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_getServerApplicationCategories(callback) {
		const dbSrvc = this.$dependencies.DatabaseService.knex;

		this._dummyAsync()
		.then(() => {
			return dbSrvc.raw('SELECT unnest(enum_range(NULL::server_application_category)) AS server_application_category');
		})
		.then((serverApplicationCategories) => {
			const responseData = [];
			serverApplicationCategories.rows.forEach((serverApplicationCategory) => {
				responseData.push(serverApplicationCategory.server_application_category);
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

exports.middleware = Masterdata;
