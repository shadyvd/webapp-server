/**
 * @file      server/services/CacheService/service.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Cache Service - based on Redis
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

class CacheService extends TwyrBaseService {
	constructor(module) {
		super(module);
		this._addDependencies('ConfigurationService', 'LocalizationService', 'LoggerService');
	}

	start(dependencies, callback) {
		this._dummyAsync()
		.then(() => {
			const superStartAsync = promises.promisify(super.start.bind(this));
			return superStartAsync(dependencies);
		})
		.then((status) => {
			return promises.all([status, this._setupCacheAsync()]);
		})
		.then((status) => {
			if(callback) callback(null, status[0]);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	stop(callback) {
		this._dummyAsync()
		.then(() => {
			const superStopAsync = promises.promisify(super.stop.bind(this));
			return superStopAsync();
		})
		.then((status) => {
			return promises.all([status, this._teardownCacheAsync()]);
		})
		.then((status) => {
			if(callback) callback(null, status[0]);
			return null;
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
			return this._teardownCacheAsync();
		})
		.then(() => {
			this.$config = config;
			return this._setupCacheAsync();
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

	_setupCache(callback) {
		const thisConfig = JSON.parse(JSON.stringify(this.$config));
		thisConfig.options.retry_strategy = (options) => {
			if(options.error.code === 'ECONNREFUSED')
				return new Error('The server refused the connection');

			if(options.total_retry_time > 1000 * 60 * 60)
				return new Error('Retry time exhausted');

			if(options.times_connected > 10)
				return undefined;

			// reconnect after
			return Math.max(options.attempt * 100, 3000);
		};

		const redis = require('redis');
		redis.RedisClient.prototype = promises.promisifyAll(redis.RedisClient.prototype);
		redis.Multi.prototype = promises.promisifyAll(redis.Multi.prototype);

		this.$cache = redis.createClient(this.$config.port, this.$config.host, this.$config.options);
		this.$cache.on('connect', (status) => {
			if(callback) callback(null, status);
		});

		this.$cache.on('error', (err) => {
			if(callback) callback(err);
		});
	}

	_teardownCache(callback) {
		if(!this.$cache) {
			if(callback) callback(null, true);
			return;
		}

		this._dummyAsync()
		.then(() => {
			return this.$cache.quitAsync();
		})
		.then(() => {
			this.$cache.end(true);
			delete this.$cache;

			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	get Interface() { return this.$cache; }
	get basePath() { return __dirname; }
}

exports.service = CacheService;
