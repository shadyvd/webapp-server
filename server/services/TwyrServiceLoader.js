/**
 * @file      server/services/TwyrServiceLoader.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Services dependency manager and service loader
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
const TwyrModuleLoader = require('./../TwyrModuleLoader').TwyrModuleLoader,
	TwyrServiceError = require('./TwyrServiceError').TwyrServiceError;

class TwyrServiceLoader extends TwyrModuleLoader {
	constructor(module) {
		super(module);
	}

	load(configSrvc, basePath, callback) {
		const finalStatus = [];

		this._dummyAsync()
		.then(() => {
			Object.defineProperty(this, '$basePath', {
				'__proto__': null,
				'value': basePath
			});

			if(!this.$locale) {
				Object.defineProperty(this, '$locale', {
					'__proto__': null,
					'value': this.$module ? this.$module.locale : 'en'
				});
			}

			return this._loadUtilitiesAsync(configSrvc);
		})
		.catch((err) => {
			if(err instanceof TwyrServiceError) throw err;

			const error = new TwyrServiceError(`${this.name}::load: Load Utilities Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._loadServicesAsync(configSrvc);
		})
		.catch((err) => {
			if(err instanceof TwyrServiceError) throw err;

			const error = new TwyrServiceError(`${this.name}::load: Load Services Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrServiceError))
				error = new TwyrServiceError(`${this.name}::load: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	initialize(callback) {
		const finalStatus = [];

		this._dummyAsync()
		.then(() => {
			return this._initializeServicesAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrServiceError) throw err;

			const error = new TwyrServiceError(`${this.name}::initialize: Initialize Services Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrServiceError))
				error = new TwyrServiceError(`${this.name}::initialize: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	start(callback) {
		const finalStatus = [];

		this._dummyAsync()
		.then(() => {
			return this._startServicesAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrServiceError) throw err;

			const error = new TwyrServiceError(`${this.name}::start: Start Services Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrServiceError))
				error = new TwyrServiceError(`${this.name}::start: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	stop(callback) {
		const finalStatus = [];

		this._dummyAsync()
		.then(() => {
			return this._stopServicesAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrServiceError) throw err;

			const error = new TwyrServiceError(`${this.name}::stop: Stop Services Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrServiceError))
				error = new TwyrServiceError(`${this.name}::stop: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	uninitialize(callback) {
		const finalStatus = [];

		this._dummyAsync()
		.then(() => {
			return this._uninitializeServicesAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrServiceError) throw err;

			const error = new TwyrServiceError(`${this.name}::uninitialize: Uninitialize Services Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrServiceError))
				error = new TwyrServiceError(`${this.name}::uninitialize: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	unload(callback) {
		const finalStatus = [];

		this._dummyAsync()
		.then(() => {
			return this._unloadServicesAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrServiceError) throw err;

			const error = new TwyrServiceError(`${this.name}::unload: Unload Services Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._unloadUtilitiesAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrServiceError) throw err;

			const error = new TwyrServiceError(`${this.name}::unload: Unload Utilities Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrServiceError))
				error = new TwyrServiceError(`${this.name}::unload: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}
}

exports.TwyrServiceLoader = TwyrServiceLoader;
