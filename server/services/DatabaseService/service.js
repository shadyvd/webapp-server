/**
 * @file      server/services/DatabaseService/service.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Database Service - built on top of Knex / Booksshelf and so supports MySQL, PostgreSQL, and a few others
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

class DatabaseService extends TwyrBaseService {
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
			return promises.all([status, this._setupBookshelfAsync()]);
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
			return promises.all([status, this._teardownBookshelfAsync()]);
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
			return this._teardownBookshelfAsync();
		})
		.then(() => {
			this.$config = config;
			return this._setupBookshelfAsync();
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

	_setupBookshelf(callback) {
		try {
			const bookshelf = require('bookshelf'),
				jsonApiParams = require('bookshelf-jsonapi-params'),
				knex = require('knex');

			const knexInstance = knex(this.$config);
			knexInstance.on('query', this._databaseQuery.bind(this));
			knexInstance.on('query-error', this._databaseQueryError.bind(this));

			this.$database = bookshelf(knexInstance);
			this.$database.plugin(jsonApiParams, {
				'pagination': {
					'limit': 25
				}
			});

			if(callback) callback(null);
		}
		catch(err) {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${this.name}::_setupBookshelf error: ${err.stack}`);
			if(callback) callback(err);
		}
	}

	_teardownBookshelf(callback) {
		if(!this.$database) {
			if(callback) callback(null, true);
			return;
		}

		this._dummyAsync()
		.then(() => {
			return this.$database.knex.destroy();
		})
		.then(() => {
			delete this.$database;

			if(callback) callback(null, true);
			return null;
		})
		.catch((destroyErr) => {
			if(callback) callback(destroyErr);
		});
	}

	_databaseQuery(queryData) {
		this.$dependencies.LoggerService.silly(`${this.name}::_databaseQuery: ${JSON.stringify(queryData, undefined, '\t')}`);
	}

	_databaseQueryError() {
		this.$dependencies.LoggerService.error(`${this.name}::_databaseQueryError: ${JSON.stringify(arguments, undefined, '\t')}`);
	}

	_databaseNotice() {
		this.$dependencies.LoggerService.info(`${this.name}::_databaseNotice: ${JSON.stringify(arguments, undefined, '\t')}`);
	}

	_databaseError() {
		this.$dependencies.LoggerService.error(`${this.name}::_databaseError: ${JSON.stringify(arguments, undefined, '\t')}`);
	}

	get Interface() { return this.$database; }
	get basePath() { return __dirname; }
	get dependencies() { return ['ConfigurationService', 'LoggerService']; }
}

exports.service = DatabaseService;
