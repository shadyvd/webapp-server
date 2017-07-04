/**
 * @file      server/services/AuthService/service.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Authentication Service - based on Passport and its infinite strategies
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

class AuthService extends TwyrBaseService {
	constructor(module) {
		super(module);
		this._addDependencies('ConfigurationService', 'CacheService', 'DatabaseService', 'LocalizationService', 'LoggerService');
	}

	start(dependencies, callback) {
		this._dummyAsync()
		.then(() => {
			const superStartAsync = promises.promisify(super.start.bind(this));
			return superStartAsync(dependencies);
		})
		.then((status) => {
			return promises.all([status, this._setupPassportAsync()]);
		})
		.then((status) => {
			if(callback) callback(null, status[0]);
			return null;
		})
		.catch((setupErr) => {
			if(callback) callback(setupErr);
		});
	}

	stop(callback) {
		this._dummyAsync()
		.then(() => {
			const superStopAsync = promises.promisify(super.stop.bind(this));
			return superStopAsync();
		})
		.then((status) => {
			return promises.all([status, this._teardownPassportAsync()]);
		})
		.then((status) => {
			if(callback) callback(null, status[0]);
		})
		.catch((teardownErr) => {
			if(callback) callback(teardownErr);
		});
	}

	_reconfigure(config, callback) {
		if(!this.$enabled) {
			this.$config = JSON.parse(JSON.stringify(config));
			if(callback) callback();
			return;
		}

		this._dummyAsync()
		.then(() => {
			return this._teardownPassportAsync();
		})
		.then(() => {
			this.$config = config;
			return this._setupPassportAsync();
		})
		.then(() => {
			const superReconfigureAsync = promises.promisify(super._reconfigure.bind(this));
			return superReconfigureAsync(config);
		})
		.then((status) => {
			if(callback) callback(null, status);
			return null;
		})
		.catch((err) => {
			this.$dependencies.LoggerService.error(`${this.name}::_reconfigure:\n${err.stack}`);
			if(callback) callback(err);
		});
	}

	_setupPassport(callback) {
		this._dummyAsync()
		.then(() => {
			const fs = require('fs'),
				path = require('path');

			const filesystem = promises.promisifyAll(fs);
			const authStrategyPath = path.resolve(path.join(this.basePath, this.$config.strategies.path));
			this.$passport = promises.promisifyAll(require('passport'));

			return filesystem.readdirAsync(authStrategyPath);
		})
		.then((availableStrategies) => {
			const path = require('path');

			availableStrategies.forEach((thisStrategyFile) => {
				const thisStrategy = require(path.join(this.basePath, this.$config.strategies.path, thisStrategyFile)).strategy;
				if(thisStrategy) thisStrategy.bind(this)();
			});

			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_teardownPassport(callback) {
		delete this.$passport;
		if(callback) callback(null);
	}

	get Interface() { return this.$passport; }
	get basePath() { return __dirname; }
}

exports.service = AuthService;
