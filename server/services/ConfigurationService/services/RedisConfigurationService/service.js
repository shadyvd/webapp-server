/**
 * @file      server/services/ConfigurationService/services/RedisConfigurationService/service.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @summary   The Twy'r Web Application Redis-based Configuration Service
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
const TwyrBaseService = require('./../../../TwyrBaseService').TwyrBaseService;

class RedisConfigurationService extends TwyrBaseService {
	constructor(module) {
		super(module);
	}

	start(dependencies, callback) {
		if(!this.$module.$config.subservices) {
			if(callback) callback(null, false);
			return;
		}

		if(!this.$module.$config.subservices[this.name]) {
			if(callback) callback(null, false);
			return;
		}

		this.$config = this.$module.$config.subservices[this.name];
		this.$cacheMap = {};

		this._dummyAsync()
		.then(() => {
			return this._setupCacheAsync();
		})
		.then(() => {
			super.start(dependencies, callback);
			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${this.name}::start Error: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	stop(callback) {
		this._dummyAsync()
		.then(() => {
			const stopAsync = promises.promisify(super.stop.bind(this));
			return stopAsync();
		})
		.then((status) => {
			return promises.all([status, this._teardownCacheAsync()]);
		})
		.then((status) => {
			if(callback) callback(null, status[0]);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	loadConfig(module, callback) {
		const path = require('path');

		const env = (process.env.NODE_ENV || 'development').toLowerCase(),
			rootPath = path.dirname(require.main.filename);

		const configPath = `twyr!webapp!${path.join(path.relative(rootPath, module.basePath).replace('server', env)).replace(new RegExp(path.sep, 'g'), '!')}!config`;

		this._dummyAsync()
		.then(() => {
			return this.$cache.getAsync(configPath);
		})
		.then((configString) => {
			this.$cacheMap[configPath] = this.$cacheMap[configPath] || {};
			this.$cacheMap[configPath].config = JSON.parse(configString || '{}');

			if(callback) callback(null, this.$cacheMap[configPath].config);
			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${module} Load Configuration from Cache Error: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	saveConfig(module, config, callback) {
		const deepEqual = require('deep-equal'),
			path = require('path');

		const env = (process.env.NODE_ENV || 'development').toLowerCase(),
			rootPath = path.dirname(require.main.filename);

		const configPath = `twyr!webapp!${path.join(path.relative(rootPath, module.basePath).replace('server', env)).replace(new RegExp(path.sep, 'g'), '!')}!config`,
			configString = JSON.stringify(config);

		this.$cacheMap[configPath] = this.$cacheMap[configPath] || {};
		if(deepEqual(this.$cacheMap[configPath].config, config)) {
			if(callback) callback(null, config);
			return;
		}

		this._dummyAsync()
		.then(() => {
			this.$cacheMap[configPath].config = config;
			return this.$cache.setAsync(configPath, configString);
		})
		.then(() => {
			if(callback) callback(null, config);
			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${module} Save Configuration to Cache Error: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	getModuleState(module, callback) {
		const path = require('path');

		const env = (process.env.NODE_ENV || 'development').toLowerCase(),
			rootPath = path.dirname(require.main.filename);

		const configPath = `twyr!webapp!${path.join(path.relative(rootPath, module.basePath).replace('server', env)).replace(new RegExp(path.sep, 'g'), '!')}!state`;

		this._dummyAsync()
		.then(() => {
			return this.$cache.getAsync(configPath);
		})
		.then((configString) => {
			this.$cacheMap[configPath] = this.$cacheMap[configPath] || {};
			this.$cacheMap[configPath].state = JSON.parse(configString || 'true');

			if(callback) callback(null, this.$cacheMap[configPath].state);
			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${module} Load State from Cache Error: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	setModuleState(module, enabled, callback) {
		const path = require('path');

		const env = (process.env.NODE_ENV || 'development').toLowerCase(),
			rootPath = path.dirname(require.main.filename);

		const configPath = `twyr!webapp!${path.join(path.relative(rootPath, module.basePath).replace('server', env)).replace(new RegExp(path.sep, 'g'), '!')}!state`;

		this.$cacheMap[configPath] = this.$cacheMap[configPath] || {};
		if(this.$cacheMap[configPath].state === enabled) {
			if(callback) callback(null, enabled);
			return;
		}

		this._dummyAsync()
		.then(() => {
			this.$cacheMap[configPath].state = enabled;
			return this.$cache.setAsync(configPath, JSON.stringify(enabled));
		})
		.then(() => {
			if(callback) callback(null, enabled);
			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${module} Save State to Cache Error: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	getModuleId(module, callback) {
		if(callback) callback(null, null);
	}

	_onUpdateConfiguration(pattern, channel, message) {
		const path = require('path');

		const configPath = channel.replace('__keyspace@0__:', ''),
			twyrModule = channel.replace(pattern.replace('*', ''), '').replace('!config', '').replace(/!/g, path.sep);

		if(configPath.indexOf('!config') < 0)
			return;

		if(message === 'del') {
			delete this.$cacheMap[configPath.replace('!config', '')].config;
			this.$module.emit('delete-config', this.name, twyrModule);
			return;
		}

		if(message === 'set') {
			this.$cache.getAsync(configPath)
			.then((newConfig) => {
				const deepEqual = require('deep-equal');

				newConfig = JSON.parse(newConfig);
				this.$cacheMap[configPath] = this.$cacheMap[configPath] || {};

				if(deepEqual(this.$cacheMap[configPath].config, newConfig))
					return;

				this.$cacheMap[configPath].config = newConfig;
				this.$module.emit('update-config', this.name, twyrModule, newConfig);
			})
			.catch((err) => {
				if((process.env.NODE_ENV || 'development') === 'development') console.error(`${module} Update Configuration to Cache Error: ${err.stack}`);
			});
		}
	}

	_processConfigChange(configUpdateModule, config) {
		const deepEqual = require('deep-equal'),
			path = require('path');

		const env = (process.env.NODE_ENV || 'development').toLowerCase();

		const configPath = `twyr!webapp!${path.join(env, configUpdateModule).replace(new RegExp(path.sep, 'g'), '!')}!config`,
			configString = JSON.stringify(config);

		this.$cacheMap[configPath] = this.$cacheMap[configPath] || {};
		if(deepEqual(this.$cacheMap[configPath].config, config))
			return;

		this._dummyAsync()
		.then(() => {
			this.$cacheMap[configPath].config = config;
			return this.$cache.setAsync(configPath, configString);
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${module} Save Configuration to Cache Error: ${err.stack}`);
		});
	}

	_processStateChange(configUpdateModule, state) {
		const path = require('path');

		const env = (process.env.NODE_ENV || 'development').toLowerCase();
		const configPath = `twyr!webapp!${path.join(env, configUpdateModule).replace(new RegExp(path.sep, 'g'), '!')}!state`;

		this.$cacheMap[configPath] = this.$cacheMap[configPath] || {};
		if(this.$cacheMap[configPath].state === state)
			return;

		this._dummyAsync()
		.then(() => {
			this.$cacheMap[configPath].state = state;
			return this.$cache.setAsync(configPath, JSON.stringify(state));
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${module} Save State to Cache Error: ${err.stack}`);
		});
	}

	_setupCache(callback) {
		const thisConfig = JSON.parse(JSON.stringify(this.$config));

		thisConfig.options.retry_strategy = (options) => {
			if(options.error.code === 'ECONNREFUSED') {
				// End reconnecting on a specific error and flush all commands with a individual error
				return new Error('The server refused the connection');
			}

			if(options.total_retry_time > 1000 * 60 * 60) {
				// End reconnecting after a specific timeout and flush all commands with a individual error
				return new Error('Retry time exhausted');
			}

			if(options.times_connected > 10) {
				// End reconnecting with built in error
				return undefined;
			}

			// reconnect after
			return Math.max(options.attempt * 100, 3000);
		};

		const redis = require('redis');
		redis.RedisClient.prototype = promises.promisifyAll(redis.RedisClient.prototype);
		redis.Multi.prototype = promises.promisifyAll(redis.Multi.prototype);

		this.$cache = redis.createClient(this.$config.port, this.$config.host, this.$config.options);

		this.$pubsub = redis.createClient(this.$config.port, this.$config.host, this.$config.options);
		this.$pubsub.config('SET', 'notify-keyspace-events', 'KEA');

		this.$pubsub.on('pmessage', this._onUpdateConfiguration.bind(this));
		this.$pubsub.psubscribeAsync(`__keyspace@0__:twyr!webapp!${(process.env.NODE_ENV || 'development')}!*`);

		this.$cache.on('connect', (status) => {
			if(callback) callback(null, status);
		});

		this.$cache.on('error', (err) => {
			if(callback) callback(err);
		});
	}

	_teardownCache(callback) {
		if(this.$cache) {
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

		if(this.$pubsub) {
			this._dummyAsync()
			.then(() => {
				return this.$pubsub.punsubscribeAsync(`__keyspace@0__:twyr!webapp!${(process.env.NODE_ENV || 'development')}!*`);
			})
			.then(() => {
				return this.$pubsub.quitAsync();
			})
			.then(() => {
				this.$pubsub.end(true);
				delete this.$pubsub;
				return null;
			})
			.catch((err) => {
				if((process.env.NODE_ENV || 'development') === 'development') console.error(`${module} Teardown Cache Error: ${err.stack}`);
			});
		}
	}

	get basePath() { return __dirname; }
}

exports.service = RedisConfigurationService;
