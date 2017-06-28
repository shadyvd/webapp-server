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
const TwyrModuleLoader = require('./../TwyrModuleLoader').TwyrModuleLoader;

class TwyrMiddlewareLoader extends TwyrModuleLoader {
	constructor(module) {
		super(module);
	}

	load(configSrvc, basePath, callback) {
		Object.defineProperty(this, '$basePath', {
			'__proto__': null,
			'value': basePath
		});

		if(!this.$locale) {
			Object.defineProperty(this, '$locale', {
				'__proto__': null,
				'value': this.$module.$locale
			});
		}

		const finalStatus = [];
		this._dummyAsync()
		.then(() => {
			return this._loadUtilitiesAsync(configSrvc);
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._loadServicesAsync(configSrvc);
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._loadMiddleWaresAsync(configSrvc);
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${this.$module.name}::load error: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	initialize(callback) {
		const finalStatus = [];

		this._dummyAsync()
		.then(() => {
			return this._initializeServicesAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._initializeMiddleWaresAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${this.$module.name}::initialize error: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	start(callback) {
		const finalStatus = [];

		this._dummyAsync()
		.then(() => {
			return this._startServicesAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._startMiddleWaresAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${this.$module.name}::start error: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	stop(callback) {
		const finalStatus = [];

		this._dummyAsync()
		.then(() => {
			return this._stopMiddleWaresAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._stopServicesAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${this.$module.name}::stop error: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	uninitialize(callback) {
		const finalStatus = [];

		this._dummyAsync()
		.then(() => {
			return this._uninitializeMiddleWaresAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._uninitializeServicesAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${this.$module.name}::uninitialize error: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	unload(callback) {
		const finalStatus = [];

		this._dummyAsync()
		.then(() => {
			return this._unloadMiddleWaresAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._unloadServicesAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._unloadUtilitiesAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${this.$module.name}::unload error: ${err.stack}`);
			if(callback) callback(err);
		});
	}
}

exports.TwyrMiddlewareLoader = TwyrMiddlewareLoader;
