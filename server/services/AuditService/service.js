/**
 * @file      server/services/AuditService/service.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Audit Service - send audit logs via pubsub
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
const TwyrBaseService = require('./../TwyrBaseService').TwyrBaseService,
	TwyrServiceError = require('./../TwyrServiceError').TwyrServiceError;

class AuditService extends TwyrBaseService {
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
			return promises.all([status, this._setupAuditCacheAsync()]);
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
			return promises.all([status, this._teardownAuditCacheAsync()]);
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
			return this._teardownAuditCacheAsync();
		})
		.then(() => {
			this.$config = config;
			return this._setupAuditCacheAsync();
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

	_setupAuditCache(callback) {
		this._dummyAsync()
		.then(() => {
			this.$auditCache = require('memory-cache');
			if(callback) callback(null, true);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_teardownAuditCache(callback) {
		if(!this.$auditCache) {
			if(callback) callback(null, true);
			return;
		}

		this._dummyAsync()
		.then(() => {
			this.$auditCache.clear();
			delete this.$auditCache;

			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_addRequest(requestDetails, callback) {
		if(!this.$auditCache) {
			const requestDetailsError = new TwyrServiceError('Audit capture not available');

			this.$dependencies.LoggerService.error(requestDetailsError.toString());
			if(callback) callback(requestDetailsError);

			return;
		}

		if(!(requestDetails.id && requestDetails.userId)) {
			const requestDetailsError = new TwyrServiceError('Incorrectly formed request details');

			this.$dependencies.LoggerService.error(requestDetailsError.toString());
			if(callback) callback(requestDetailsError);

			return;
		}

		this._dummyAsync()
		.then(() => {
			let hasResponse = this.$auditCache.get(requestDetails.id);
			if(hasResponse) {
				const deepmerge = require('deepmerge');
				hasResponse = deepmerge(hasResponse, requestDetails);

				this.$auditCache.put(requestDetails.id, hasResponse, 600000, this._processTimedoutRequests.bind(this));
				return this._publishAuditAsync(requestDetails.id);
			}
			else {
				this.$auditCache.put(requestDetails.id, requestDetails, 600000, this._processTimedoutRequests.bind(this));
				return null;
			}
		})
		.then(() => {
			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			const requestDetailsError = new TwyrServiceError('Request capture error', err);

			this.$dependencies.LoggerService.error(requestDetailsError.toString());
			if(callback) callback(requestDetailsError);
		});
	}

	_addResponse(responseDetails, callback) {
		if(!this.$auditCache) {
			const responseDetailsError = new TwyrServiceError('Audit capture not available');

			this.$dependencies.LoggerService.error(responseDetailsError.toString());
			if(callback) callback(responseDetailsError);

			return;
		}

		if(!(responseDetails.id && responseDetails.userId)) {
			const responseDetailsError = new TwyrServiceError('Incorrectly formed response details');

			this.$dependencies.LoggerService.error(responseDetailsError.toString());
			if(callback) callback(responseDetailsError);

			return;
		}

		this._dummyAsync()
		.then(() => {
			let hasRequest = this.$auditCache.get(responseDetails.id);
			if(hasRequest) {
				const deepmerge = require('deepmerge');
				hasRequest = deepmerge(hasRequest, responseDetails);

				this.$auditCache.put(responseDetails.id, hasRequest, 600000, this._processTimedoutRequests.bind(this));
				return this._publishAuditAsync(responseDetails.id);
			}
			else {
				this.$auditCache.put(responseDetails.id, responseDetails, 600000, this._processTimedoutRequests.bind(this));
				return null;
			}
		})
		.then(() => {
			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			const responseDetailsError = new TwyrServiceError('Response capture error', err);

			this.$dependencies.LoggerService.error(responseDetailsError.toString());
			if(callback) callback(responseDetailsError);
		});
	}

	_publishAudit(id, callback) {
		if(!this.$auditCache) {
			if(callback) callback(null, false);
			return;
		}

		const auditDetails = this.$auditCache.get(id);
		if(!auditDetails) {
			if(callback) callback(null, false);
			return;
		}

		this._dummyAsync()
		.then(() => {
			this.$dependencies.LoggerService.info(`${this.name} LOG (Will use Pubsub in the future)`, auditDetails);
			this.$auditCache.del(id);

			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_processTimedoutRequests(key, value) {
		this._dummyAsync()
		.then(() => {
			value.error = 'Timed Out';

			this.$dependencies.LoggerService.info(`${this.name} LOG (Will use Pubsub in the future)`, value);
			this.$auditCache.del(key);

			return null;
		})
		.catch((err) => {
			this.$dependencies.LoggerService.error(`${this.name} LOG (Will use Pubsub in the future)`, err);
		});
	}

	get Interface() {
		return {
			'addRequestAsync': this._addRequestAsync.bind(this),
			'addResponseAsync': this._addResponseAsync.bind(this)
		};
	}

	get basePath() { return __dirname; }
	get dependencies() { return ['ConfigurationService', 'LoggerService', 'PubsubService']; }
}

exports.service = AuditService;
