/**
 * @file      server/middlewares/TwyrBaseMiddleware.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Base Class for Middlewares - providing common functionality required for all middlewares
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
const TwyrBaseModule = require('./../TwyrBaseModule').TwyrBaseModule;

class TwyrBaseMiddleware extends TwyrBaseModule {
	constructor(module, loader) {
		super(module, loader);

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
		.then((status) => {
			return promises.all([status, this._setupJSONAPIMappersAsync()]);
		})
		.then((status) => {
			return promises.all([status[0], this._registerApisAsync()]);
		})
		.then((status) => {
			if(callback) callback(null, status[0]);
			return null;
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
			return promises.all([status, this._deregisterApisAsync()]);
		})
		.then((status) => {
			return promises.all([status[0], this._deleteJSONAPIMappersAsync()]);
		})
		.then((status) => {
			if(callback) callback(null, status[0]);
			return null;
		})
		.catch((stopErr) => {
			if(callback) callback(stopErr);
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
			if(callback) callback(err);
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
			if(callback) callback(err);
		});
	}

	_registerApis(callback) {
		if(callback) callback();
	}

	_deregisterApis(callback) {
		if(callback) callback();
	}

	get basePath() { return __dirname; }
	get dependencies() { return ['ApiService', 'CacheService', 'ConfigurationService', 'DatabaseService', 'LoggerService']; }
}

exports.TwyrBaseMiddleware = TwyrBaseMiddleware;
