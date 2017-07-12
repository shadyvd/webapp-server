/**
 * @file      server/services/AuditService/service.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @summary   The Twy'r Web Application Audit Service - send audit logs via pubsub
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
		this._addDependencies('ConfigurationService', 'LocalizationService', 'LoggerService', 'PubsubService');
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

//			return this.$dependencies.PubsubService.subscribeAsync('*', 'TWYR_AUDIT', this._logPublishedMessages.bind(this));
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

				this.$auditCache.put(requestDetails.id, hasResponse, 10000, this._processTimedoutRequests.bind(this));
				return this._publishAuditAsync(requestDetails.id);
			}
			else {
				this.$auditCache.put(requestDetails.id, requestDetails, 10000, this._processTimedoutRequests.bind(this));
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

				this.$auditCache.put(responseDetails.id, hasRequest, 10000, this._processTimedoutRequests.bind(this));
				return this._publishAuditAsync(responseDetails.id);
			}
			else {
				this.$auditCache.put(responseDetails.id, responseDetails, 10000, this._processTimedoutRequests.bind(this));
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

	_addResponsePayload(payloadDetails, callback) {
		if(!this.$auditCache) {
			const payloadDetailsError = new TwyrServiceError('Audit capture not available');

			this.$dependencies.LoggerService.error(payloadDetailsError.toString());
			if(callback) callback(payloadDetailsError);

			return;
		}

		if(!payloadDetails.id) {
			const payloadDetailsError = new TwyrServiceError('Incorrectly formed payload details');

			this.$dependencies.LoggerService.error(payloadDetailsError.toString());
			if(callback) callback(payloadDetailsError);

			return;
		}

		this._dummyAsync()
		.then(() => {
			let hasRequest = this.$auditCache.get(payloadDetails.id);
			if(hasRequest) {
				const deepmerge = require('deepmerge');
				hasRequest = deepmerge(hasRequest, payloadDetails);

				this.$auditCache.put(payloadDetails.id, hasRequest, 10000, this._processTimedoutRequests.bind(this));
			}
			else
				this.$auditCache.put(payloadDetails.id, payloadDetails, 10000, this._processTimedoutRequests.bind(this));

			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			const payloadDetailsError = new TwyrServiceError('Payload capture error', err);

			this.$dependencies.LoggerService.error(payloadDetailsError.toString());
			if(callback) callback(payloadDetailsError);
		});
	}

	_publishAudit(id, callback) {
		if(!this.$auditCache) {
			if(callback) callback(null, false);
			return;
		}

		const alreadyScheduled = this.$auditCache.get(`${id}-scheduled`);
		if(alreadyScheduled) {
			if(callback) callback(null, true);
			return;
		}

		this.$auditCache.put(`${id}-scheduled`, setTimeout(() => {
			this._dummyAsync()
			.then(() => {
				return this._cleanBeforePublishAsync(id);
			})
			.then((auditDetails) => {
				if(auditDetails.error) {
					this.$dependencies.LoggerService.error(`Error Servicing Request ${auditDetails.id} - ${auditDetails.url}:`, auditDetails);
					return this.$dependencies.PubsubService.publishAsync('*', 'TWYR_AUDIT', JSON.stringify(auditDetails));
				}
				else {
					this.$dependencies.LoggerService.debug(`Serviced Request ${auditDetails.id} - ${auditDetails.url}:`, auditDetails);
					return this.$dependencies.PubsubService.publishAsync('*', 'TWYR_AUDIT', JSON.stringify(auditDetails));
				}
			})
			.then(() => {
				if(callback) callback(null, true);
				return null;
			})
			.catch((err) => {
				if(callback) callback(err);
			})
			.finally(() => {
				this.$auditCache.del(`${id}-scheduled`);
				this.$auditCache.del(id);
			});
		}, 500));
	}

	_processTimedoutRequests(key, value) {
		this._dummyAsync()
		.then(() => {
			return this._cleanBeforePublishAsync(key, value);
		})
		.then((auditDetails) => {
			auditDetails.error = 'Timed Out';
			this.$dependencies.LoggerService.error(`Error Servicing Request ${auditDetails.id} - ${auditDetails.url}:`, auditDetails);

			return this.$dependencies.PubsubService.publishAsync('*', 'TWYR_AUDIT', JSON.stringify(auditDetails));
		})
		.then(() => {
			this.$auditCache.del(key);
			return null;
		})
		.catch((err) => {
			this.$dependencies.LoggerService.error(`${this.name} process timedout request error:`, err.stack);
		});
	}

	_cleanBeforePublish(id, value, callback) {
		if(value && typeof value === 'function' && !callback) {
			callback = value;
			value = undefined;
		}

		const auditDetails = value || this.$auditCache.get(id);
		if(!auditDetails) {
			if(callback) callback(null, false);
			return;
		}

		if(!Object.keys(auditDetails).length) {
			if(callback) callback(null, false);
			return;
		}

		Object.keys(auditDetails).forEach((key) => {
			if(!auditDetails[key]) {
				delete auditDetails[key];
				return;
			}
			const dangerousKeys = Object.keys(auditDetails[key]).filter((auditDetailsKeyKey) => {
				return (auditDetailsKeyKey.toLowerCase().indexOf('password') >= 0) || (auditDetailsKeyKey.toLowerCase().indexOf('image') >= 0) || (auditDetailsKeyKey.toLowerCase().indexOf('random') >= 0) || (auditDetailsKeyKey === '_');
			});

			dangerousKeys.forEach((dangerousKey) => {
				delete auditDetails[key][dangerousKey];
			});

			if(!Object.keys(auditDetails[key]).length)
				delete auditDetails[key];
		});

		if(auditDetails.params) {
			Object.keys(auditDetails.params).forEach((key) => {
				auditDetails.url = auditDetails.url.replace(`/${auditDetails.params[key]}`, '');
			});
		}

		if(callback) callback(null, auditDetails);
	}

	_logPublishedMessages(topic, auditMessage) {
		this.$dependencies.LoggerService.info('Sent Audit Message:', JSON.parse(auditMessage));
	}

	get Interface() {
		return {
			'addRequest': this._addRequest.bind(this),
			'addRequestAsync': this._addRequestAsync.bind(this),
			'addResponse': this._addResponse.bind(this),
			'addResponseAsync': this._addResponseAsync.bind(this),
			'addResponsePayload': this._addResponsePayload.bind(this),
			'addResponsePayloadAsync': this._addResponsePayloadAsync.bind(this)
		};
	}

	get basePath() { return __dirname; }
}

exports.service = AuditService;
