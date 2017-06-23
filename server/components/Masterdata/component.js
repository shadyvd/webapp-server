/**
 * @file      server/components/Masterdata/component.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Masterdata Component - provides functionality to retrieve master data
 *
 */

'use strict';

/**
 * Module dependencies, required for ALL Twy'r modules
 * @ignore
 */
// const promises = require('bluebird');

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseComponent = require('./../TwyrBaseComponent').TwyrBaseComponent;

class Masterdata extends TwyrBaseComponent {
	constructor(module) {
		super(module);
	}

	_getClientsideAssets(tenant, user, mediaType, renderer, callback) {
		this._getEmptyClientsideAssets(tenant, user, mediaType, renderer, callback);
	}

	_addRoutes(callback) {
		this._dummyAsync()
		.then(() => {
			this.$router.get('/genders', this._getGenders.bind(this));
			this.$router.get('/contactTypes', this._getContactTypes.bind(this));
			super._addRoutes(callback);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_getGenders(request, response) {
		const apiService = this.$dependencies.ApiService;
		response.type('application/javascript');

		this._dummyAsync()
		.then(() => {
			if(!request.user) throw new Error('This information is available only to logged-in Users');
			return apiService.executeAsync('Masterdata::genders');
		})
		.then((genderList) => {
			response.status(200).json(genderList);
			return null;
		})
		.catch((err) => {
//			loggerSrvc.error(`Error Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${JSON.stringify(request.body, undefined, '\t')}\nError: ${err.stack}\n`);
			response.status(400).json({ 'code': 400, 'message': err.message });
		});
	}

	_getContactTypes(request, response) {
		const apiService = this.$dependencies.ApiService;
		response.type('application/javascript');

		this._dummyAsync()
		.then(() => {
			if(!request.user) throw new Error('This information is available only to logged-in Users');
			return apiService.executeAsync('Masterdata::contactTypes');
		})
		.then((contactTypeList) => {
			response.status(200).json(contactTypeList);
			return null;
		})
		.catch((err) => {
//			loggerSrvc.error(`Error Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${JSON.stringify(request.body, undefined, '\t')}\nError: ${err.stack}\n`);
			response.status(400).json({ 'code': 400, 'message': err.message });
		});
	}

	get basePath() { return __dirname; }
}

exports.component = Masterdata;
