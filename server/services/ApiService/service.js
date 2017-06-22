/**
 * @file      server/services/ApiService/service.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application API Service - allows middleware to expose interfaces for use by other modules without direct references to each other
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
const TwyrBaseService = require('./../TwyrBaseService').TwyrBaseService;

class ApiService extends TwyrBaseService {
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
			const customMatch = function(pattern, data) {
				const items = this.find(pattern, true) || [];
				items.push(data);

				return {
					'find': function() {
						return items.length ? items : [];
					},

					'remove': function(search, api) {
						const apiIdx = items.indexOf(api);
						if(apiIdx < 0) return false;

						items.splice(apiIdx, 1);
						return true;
					}
				};
			};

			this.$patrun = require('patrun')(customMatch);
			if(callback) callback(null, status);
		})
		.catch((startErr) => {
			if(callback) callback(startErr);
		});
	}

	stop(callback) {
		this._dummyAsync()
		.then(() => {
			const superStopAsync = promises.promisify(super.stop.bind(this));
			return superStopAsync();
		})
		.then((status) => {
			delete this.$patrun;
			if(callback) callback(null, status);
		})
		.catch((stopErr) => {
			if(callback) callback(stopErr);
		});
	}

	add(pattern, api, callback) {
		if(typeof api !== 'function') {
			if(callback) callback(new Error(`API Service expects a function for the pattern: ${pattern}`));
			return;
		}

		api = promises.promisify(api);
		pattern = pattern.split('::').reduce((obj, value) => {
			obj[value] = value;
			return obj;
		}, {});

		this.$patrun.add(pattern, api);
		if(callback) callback(null, true);
	}

	execute(pattern, data, callback) {
		this._dummyAsync()
		.then(() => {
			const promiseResolutions = [];

			pattern = pattern.split('::').reduce((obj, value) => {
				obj[value] = value;
				return obj;
			}, {});

			if(!Array.isArray(data))
				data = [data];

			this.$patrun.find(pattern).forEach((api) => {
				promiseResolutions.push(api(...data));
			});

			return promises.all(promiseResolutions);
		})
		.then((results) => {
			if(callback) callback(null, results.length > 1 ? results : results[0]);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	remove(pattern, api, callback) {
		if(typeof api !== 'function') {
			if(callback) callback(new Error(`API Service expects a function for the pattern: ${pattern}`));
			return;
		}

		api = promises.promisify(api);
		pattern = pattern.split('::').reduce((obj, value) => {
			obj[value] = value;
			return obj;
		}, {});

		this.$patrun.remove(pattern, api);
		if(callback) callback(null, true);
	}

	get Interface() {
		return {
			'add': this.add.bind(this),
			'addAsync': this.addAsync.bind(this),

			'execute': this.execute.bind(this),
			'executeAsync': this.executeAsync.bind(this),

			'remove': this.remove.bind(this),
			'removeAsync': this.removeAsync.bind(this)
		};
	}

	get basePath() { return __dirname; }
	get dependencies() { return ['ConfigurationService', 'LoggerService']; }
}

exports.service = ApiService;
