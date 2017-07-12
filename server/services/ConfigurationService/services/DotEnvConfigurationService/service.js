/**
 * @file      server/services/ConfigurationService/services/DotEnvConfigurationService/service.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @summary   The Twy'r Web Application .env file-based Configuration Service
 *
 */

'use strict';

/**
 * Module dependencies, required for ALL Twyr modules
 * @ignore
 */
// const promises = require('bluebird');

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseService = require('./../../../TwyrBaseService').TwyrBaseService;

class DotEnvConfigurationService extends TwyrBaseService {
	constructor(module) {
		super(module);
	}

	start(dependencies, callback) {
		const chokidar = require('chokidar'),
			path = require('path'),
			rootPath = path.dirname(require.main.filename);

		this['$watcher'] = chokidar.watch(path.join(rootPath, '.env'), {
			'ignored': /[\/\\]\./,
			'ignoreInitial': true
		});

		this['$watcher'].on('change', this._onUpdateConfiguration.bind(this));
		this['$cacheMap'] = {};

		super.start(dependencies, callback);
	}

	stop(callback) {
		this['$watcher'].close();
		super.stop(callback);
	}

	loadConfig(module, callback) {
		if(callback) callback(null, {});
	}

	saveConfig(module, config, callback) {
		if(callback) callback(null, config);
	}

	getModuleState(module, callback) {
		if(callback) callback(null, true);
	}

	setModuleState(module, enabled, callback) {
		if(callback) callback(null, enabled);
	}

	getModuleId(module, callback) {
		if(callback) callback(null, null);
	}

	_onUpdateConfiguration(filePath) {
		return;
	}

	_processConfigChange(configUpdateModule, config) {
		return;
	}

	_processStateChange(configUpdateModule, state) {
		return;
	}

	get basePath() { return __dirname; }
}

exports.service = DotEnvConfigurationService;
