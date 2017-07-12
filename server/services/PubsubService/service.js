/**
 * @file      server/services/PubsubService/service.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @summary   The Twy'r Web Application Publish/Subscribe Service - based on Ascoltatori
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

class PubsubService extends TwyrBaseService {
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
			this.$listeners = {};
			return promises.all([status, this._setupAscoltatoriAsync()]);
		})
		.then((status) => {
			if(callback) callback(null, status[0]);
			return null;
		})
		.catch((setupErr) => {
			if(callback) callback(setupErr);
		});
	}

	publish(strategy, topic, data, options, callback) {
		this._dummyAsync()
		.then(() => {
			const promiseResolutions = [];

			if(!Array.isArray(strategy))
				strategy = [strategy];

			if(typeof options === 'function' && !callback) {
				callback = options;
				options = undefined;
			}

			Object.keys(this.$listeners).forEach((pubsubStrategy) => {
				if(strategy.indexOf('*') < 0 && strategy.indexOf(pubsubStrategy) < 0) return;
				promiseResolutions.push(this.$listeners[pubsubStrategy].publishAsync(topic, data, options));
			});

			if(!promiseResolutions.length) {
				if(callback) callback(new TypeError('Unknown Strategy'));
				return;
			}

			return promises.all(promiseResolutions);
		})
		.then(() => {
			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	subscribe(strategy, topic, listener, callback) {
		this._dummyAsync()
		.then(() => {
			const promiseResolutions = [];

			if(!Array.isArray(strategy))
				strategy = [strategy];

			Object.keys(this.$listeners).forEach((pubsubStrategy) => {
				if(strategy.indexOf('*') < 0 && strategy.indexOf(pubsubStrategy) < 0) return;
				promiseResolutions.push(this.$listeners[pubsubStrategy].subscribeAsync(topic, listener));
			});

			if(!promiseResolutions.length) {
				if(callback) callback(new TypeError('Unknown Strategy'));
				return;
			}

			return promises.all(promiseResolutions);
		})
		.then(() => {
			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	unsubscribe(topic, listener, callback) {
		this._dummyAsync()
		.then(() => {
			const promiseResolutions = [];

			Object.keys(this.$listeners).forEach((pubsubStrategy) => {
				promiseResolutions.push(this.$listeners[pubsubStrategy].unsubscribeAsync(topic, listener));
			});

			return promises.all(promiseResolutions);
		})
		.then(() => {
			if(callback) callback(null, true);
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
			return promises.all([status, this._teardownAscoltatoriAsync()]);
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
			return this._teardownAscoltatoriAsync();
		})
		.then(() => {
			this.$config = config;
			return this._setupAscoltatoriAsync();
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

	_setupAscoltatori(callback) {
		const config = this.$config,
			listeners = this.$listeners;

		this._dummyAsync()
		.then(() => {
			const ascoltatori = promises.promisifyAll(require('ascoltatori'));
			const promiseResolutions = [];

			Object.keys(config).forEach((pubsubStrategy) => {
				const buildSettings = JSON.parse(JSON.stringify(config[pubsubStrategy]));
				buildSettings[pubsubStrategy] = require(buildSettings[pubsubStrategy]);

				promiseResolutions.push(ascoltatori.buildAsync(buildSettings));
			});

			return promises.all(promiseResolutions);
		})
		.then((ascoltatories) => {
			Object.keys(config).forEach((pubsubStrategy, index) => {
				listeners[pubsubStrategy] = promises.promisifyAll(ascoltatories[index]);
			});

			if(callback) callback(null);
			return null;
		})
		.catch((err) => {
			this.$dependencies.LoggerService.error(`${this.name}::_setupAscoltatori: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	_teardownAscoltatori(callback) {
		const listeners = this.$listeners;

		this._dummyAsync()
		.then(() => {
			const promiseResolutions = [];

			Object.keys(listeners).forEach((pubsubStrategy) => {
				promiseResolutions.push(listeners[pubsubStrategy].closeAsync());
			});

			return promises.all(promiseResolutions);
		})
		.then(() => {
			Object.keys(listeners).forEach((listener) => {
				delete listeners[listener];
			});

			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			this.$dependencies.LoggerService.error(`${this.name}::_teardownAscoltatori: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	get Interface() {
		return {
			'publish': this.publish.bind(this),
			'publishAsync': this.publishAsync.bind(this),

			'subscribe': this.subscribe.bind(this),
			'subscribeAsync': this.subscribeAsync.bind(this),

			'unsubscribe': this.unsubscribe.bind(this),
			'unsubscribeAsync': this.unsubscribeAsync.bind(this)
		};
	}

	get basePath() { return __dirname; }
}

exports.service = PubsubService;
