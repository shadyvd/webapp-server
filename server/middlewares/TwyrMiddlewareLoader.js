/**
 * @file      server/middlewares/TwyrMiddlewareLoader.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Middlewares dependency manager and service loader
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
const TwyrMiddlewareError = require('./TwyrMiddlewareError').TwyrMiddlewareError,
	TwyrModuleLoader = require('./../TwyrModuleLoader').TwyrModuleLoader;

class TwyrMiddlewareLoader extends TwyrModuleLoader {
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
			if(err instanceof TwyrMiddlewareError) throw err;

			const error = new TwyrMiddlewareError(`${this.name}::load: Load Utilities Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._loadServicesAsync(configSrvc);
		})
		.catch((err) => {
			if(err instanceof TwyrMiddlewareError) throw err;

			const error = new TwyrMiddlewareError(`${this.name}::load: Load Services Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._loadMiddlewaresAsync(configSrvc || this.$module.$services.ConfigurationService.Interface);
		})
		.catch((err) => {
			if(err instanceof TwyrMiddlewareError) throw err;

			const error = new TwyrMiddlewareError(`${this.name}::load: Load Middlewares Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrMiddlewareError))
				error = new TwyrMiddlewareError(`${this.name}::load: Execute Callback Error`, err);

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
			if(err instanceof TwyrMiddlewareError) throw err;

			const error = new TwyrMiddlewareError(`${this.name}::initialize: Initialize Services Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._initializeMiddlewaresAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrMiddlewareError) throw err;

			const error = new TwyrMiddlewareError(`${this.name}::initialize: Initialize Middlewares Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrMiddlewareError))
				error = new TwyrMiddlewareError(`${this.name}::initialize: Execute Callback Error`, err);

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
			if(err instanceof TwyrMiddlewareError) throw err;

			const error = new TwyrMiddlewareError(`${this.name}::start: Start Services Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._startMiddlewaresAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrMiddlewareError) throw err;

			const error = new TwyrMiddlewareError(`${this.name}::start: Start Middlewares Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrMiddlewareError))
				error = new TwyrMiddlewareError(`${this.name}::start: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	stop(callback) {
		const finalStatus = [];

		this._dummyAsync()
		.then(() => {
			return this._stopMiddlewaresAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrMiddlewareError) throw err;

			const error = new TwyrMiddlewareError(`${this.name}::stop: Stop Middlewares Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._stopServicesAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrMiddlewareError) throw err;

			const error = new TwyrMiddlewareError(`${this.name}::stop: Stop Services Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrMiddlewareError))
				error = new TwyrMiddlewareError(`${this.name}::stop: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	uninitialize(callback) {
		const finalStatus = [];

		this._dummyAsync()
		.then(() => {
			return this._uninitializeMiddlewaresAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrMiddlewareError) throw err;

			const error = new TwyrMiddlewareError(`${this.name}::uninitialize: Uninitialize Middlewares Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._uninitializeServicesAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrMiddlewareError) throw err;

			const error = new TwyrMiddlewareError(`${this.name}::uninitialize: Uninitialize Services Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrMiddlewareError))
				error = new TwyrMiddlewareError(`${this.name}::uninitialize: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	unload(callback) {
		const finalStatus = [];

		this._dummyAsync()
		.then(() => {
			return this._unloadMiddlewaresAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrMiddlewareError) throw err;

			const error = new TwyrMiddlewareError(`${this.name}::unload: Unload Middlewares Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._unloadServicesAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrMiddlewareError) throw err;

			const error = new TwyrMiddlewareError(`${this.name}::unload: Unload Services Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._unloadUtilitiesAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrMiddlewareError) throw err;

			const error = new TwyrMiddlewareError(`${this.name}::unload: Unload Utilities Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrMiddlewareError))
				error = new TwyrMiddlewareError(`${this.name}::unload: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}
}

exports.TwyrMiddlewareLoader = TwyrMiddlewareLoader;
