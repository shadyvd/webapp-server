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
const TwyrBaseComponent = require('./../TwyrBaseComponent').TwyrBaseComponent,
	TwyrComponentError = require('./../TwyrComponentError').TwyrComponentError,
	TwyrJSONAPIError = require('./../TwyrComponentError').TwyrJSONAPIError;

class Masterdata extends TwyrBaseComponent {
	constructor(module) {
		super(module);
	}

	_addRoutes(callback) {
		this._dummyAsync()
		.then(() => {
			this.$router.get('/genders', this._getGenders.bind(this));
			this.$router.get('/contactTypes', this._getContactTypes.bind(this));
			super._addRoutes(callback);
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrComponentError))
				error = new TwyrComponentError(`Error adding routes`, err);

			if(callback) callback(error);
		});
	}

	_getClientsideAssets(tenant, user, mediaType, renderer, callback) {
		this._getEmptyClientsideAssets(tenant, user, mediaType, renderer, callback);
	}

	_getGenders(request, response, next) {
		this._dummyAsync()
		.then(() => {
			if(!request.user) throw new Error('This information is available only to logged-in Users');

			const apiService = this.$dependencies.ApiService;
			return apiService.executeAsync('Masterdata::genders');
		})
		.catch((err) => {
			if(err instanceof TwyrJSONAPIError) throw err;

			const error = new TwyrJSONAPIError(`Error retrieving gender masterdata`);
			error.addErrorObject(err);

			throw error;
		})
		.then((genderList) => {
			response.status(200).json(genderList);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrJSONAPIError)) {
				error = new TwyrJSONAPIError(`Error sending login response`);
				error.addErrorObject(err);
			}

			next(error);
		});
	}

	_getContactTypes(request, response, next) {
		this._dummyAsync()
		.then(() => {
			if(!request.user) throw new Error('This information is available only to logged-in Users');

			const apiService = this.$dependencies.ApiService;
			return apiService.executeAsync('Masterdata::contactTypes');
		})
		.catch((err) => {
			if(err instanceof TwyrJSONAPIError) throw err;

			const error = new TwyrJSONAPIError(`Error retrieving contact type masterdata`);
			error.addErrorObject(err);

			throw error;
		})
		.then((contactTypeList) => {
			response.status(200).json(contactTypeList);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrJSONAPIError)) {
				error = new TwyrJSONAPIError(`Error sending login response`);
				error.addErrorObject(err);
			}

			next(error);
		});
	}

	get basePath() { return __dirname; }
}

exports.component = Masterdata;
