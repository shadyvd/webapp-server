/**
 * @file      server/services/LocalizationService/service.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Localization Service - responsible for translating strings according to User Locale
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

class LocalizationService extends TwyrBaseService {
	constructor(module) {
		super(module);
		this._addDependencies('ConfigurationService', 'LoggerService');
	}

	start(dependencies, callback) {
		this._dummyAsync()
		.then(() => {
			const superStartAsync = promises.promisify(super.start.bind(this));
			return superStartAsync(dependencies);
		})
		.then((status) => {
			return promises.all([status, this._setupI18NAsync()]);
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
			return promises.all([status, this._teardownI18NAsync()]);
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
			return this._teardownI18NAsync();
		})
		.then(() => {
			this.$config = config;
			return this._setupI18NAsync();
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

	_setupI18N(callback) {
		this._dummyAsync()
		.then(() => {
			const i18n = require('i18n'),
				path = require('path');

			const loggerSrvc = this.$dependencies.LoggerService;
			const thisConfig = JSON.parse(JSON.stringify(this.$config));

			thisConfig.directory = path.isAbsolute(thisConfig.directory) ? thisConfig.directory : path.join(path.dirname(require.main.filename), thisConfig.directory);
			thisConfig.logDebugFn = (message) => { loggerSrvc.debug(message); };
			thisConfig.logWarnFn = (message) => { loggerSrvc.warn(message); };
			thisConfig.logErrorFn = (message) => { loggerSrvc.error(message); };

			// Hard-coded because of a memory leak in i18n module
			thisConfig.autoReload = false;

			i18n.configure(this.$config);
			this.$i18n = i18n;

			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_teardownI18N(callback) {
		if(!this.$i18n) {
			if(callback) callback(null, true);
			return;
		}

		this._dummyAsync()
		.then(() => {
			delete this.$i18n;

			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	get Interface() { return this.$i18n; }
	get basePath() { return __dirname; }
}

exports.service = LocalizationService;
