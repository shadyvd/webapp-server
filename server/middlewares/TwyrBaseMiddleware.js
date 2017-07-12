/**
 * @file      server/middlewares/TwyrBaseMiddleware.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @summary   The Twy'r Web Application Base Class for Middlewares - providing common functionality required for all middlewares
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
const TwyrBaseModule = require('./../TwyrBaseModule').TwyrBaseModule,
	TwyrMiddlewareError = require('./TwyrMiddlewareError').TwyrMiddlewareError;

class TwyrBaseMiddleware extends TwyrBaseModule {
	constructor(module, loader) {
		super(module, loader);
		this._addDependencies('ApiService', 'CacheService', 'ConfigurationService', 'DatabaseService', 'LoggerService');

		const TwyrMiddlewareLoader = require('./TwyrMiddlewareLoader').TwyrMiddlewareLoader;
		const actualLoader = loader || promises.promisifyAll(new TwyrMiddlewareLoader(this), {
			'filter': () => {
				return true;
			}
		});

		this.$loader = actualLoader;
	}

	start(dependencies, callback) {
		this._dummyAsync()
		.then(() => {
			const superStartAsync = promises.promisify(super.start.bind(this));
			return superStartAsync(dependencies);
		})
		.catch((err) => {
			if(err instanceof TwyrMiddlewareError) throw err;

			const error = new TwyrMiddlewareError(`${this.name}::start: Super Start Error`, err);
			throw error;
		})
		.then((status) => {
			return promises.all([status, this._setupJSONAPIMappersAsync()]);
		})
		.catch((err) => {
			if(err instanceof TwyrMiddlewareError) throw err;

			const error = new TwyrMiddlewareError(`${this.name}::start: Setup JSON API Mapper Error`, err);
			throw error;
		})
		.then((status) => {
			return promises.all([status[0], this._registerApisAsync()]);
		})
		.catch((err) => {
			if(err instanceof TwyrMiddlewareError) throw err;

			const error = new TwyrMiddlewareError(`${this.name}::start: Register API Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, status[0]);
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
		this._dummyAsync()
		.then(() => {
			const superStopAsync = promises.promisify(super.stop.bind(this));
			return superStopAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrMiddlewareError) throw err;

			const error = new TwyrMiddlewareError(`${this.name}::stop: Super Stop Error`, err);
			throw error;
		})
		.then((status) => {
			return promises.all([status, this._deregisterApisAsync()]);
		})
		.catch((err) => {
			if(err instanceof TwyrMiddlewareError) throw err;

			const error = new TwyrMiddlewareError(`${this.name}::stop: De-register API Error`, err);
			throw error;
		})
		.then((status) => {
			return promises.all([status[0], this._deleteJSONAPIMappersAsync()]);
		})
		.catch((err) => {
			if(err instanceof TwyrMiddlewareError) throw err;

			const error = new TwyrMiddlewareError(`${this.name}::stop: Remove JSON API Mapper Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, status[0]);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrMiddlewareError))
				error = new TwyrMiddlewareError(`${this.name}::stop: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	_setupJSONAPIMappers(callback) {
		this._dummyAsync()
		.then(() => {
			const JsonApiDeserializer = require('jsonapi-serializer').Deserializer,
				JsonApiSerializer = require('jsonapi-serializer').Serializer;

			const JsonApiMapper = require('jsonapi-mapper');
			const JsonApiQueryParser = require('jsonapi-query-parser');

			if(!this.$jsonApiSerializer) {
				this.$jsonApiSerializer = promises.promisifyAll(new JsonApiSerializer({
					'keyForAttribute': 'underscore_case',
					'included': false,
					'relations': true,
					'disableLinks': true
				}));
			}

			if(!this.$jsonApiDeserializer) {
				this.$jsonApiDeserializer = promises.promisifyAll(new JsonApiDeserializer({
					'keyForAttribute': 'underscore_case',
					'included': false,
					'relations': true,
					'disableLinks': true
				}));
			}

			if(!this.$jsonApiMapper) {
				this.$jsonApiMapper = new JsonApiMapper.Bookshelf('https://twyr.github.io', {
					'keyForAttribute': 'underscore_case',
					'included': false,
					'relations': true,
					'disableLinks': true
				});
			}

			if(!this.$jsonApiQueryParser)
				this.$jsonApiQueryParser = new JsonApiQueryParser();

			if(callback) callback(null, true);
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrMiddlewareError))
				error = new TwyrMiddlewareError(`${this.name}::_setupJSONAPIMappers: Setup JSON API Mapper Error`, err);

			if(callback) callback(error);
		});
	}

	_deleteJSONAPIMappers(callback) {
		this._dummyAsync()
		.then(() => {
			delete this.$jsonApiSerializer;
			delete this.$jsonApiDeserializer;
			delete this.$jsonApiMapper;
			delete this.$jsonApiQueryParser;

			if(callback) callback(null, true);
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrMiddlewareError))
				error = new TwyrMiddlewareError(`${this.name}::_deleteJSONAPIMappers: Delete JSON API Mapper Error`, err);

			if(callback) callback(error);
		});
	}

	_registerApis(callback) {
		if(callback) callback();
	}

	_deregisterApis(callback) {
		if(callback) callback();
	}

	get basePath() { return __dirname; }
}

exports.TwyrBaseMiddleware = TwyrBaseMiddleware;
