/**
 * @file      server/services/ConfigurationService/services/FileConfigurationService/service.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Filesystem-based Configuration Service
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

class FileConfigurationService extends TwyrBaseService {
	constructor(module) {
		super(module);
	}

	start(dependencies, callback) {
		const chokidar = require('chokidar'),
			path = require('path');

		const env = (process.env.NODE_ENV || 'development').toLowerCase(),
			rootPath = path.dirname(require.main.filename);

		this.$watcher = chokidar.watch(path.join(rootPath, 'config', env), {
			'ignored': /[/\\]\./,
			'ignoreInitial': true
		});

		this.$watcher
			.on('add', this._onNewConfiguration.bind(this))
			.on('change', this._onUpdateConfiguration.bind(this))
			.on('unlink', this._onDeleteConfiguration.bind(this));

		this.$cacheMap = {};

		super.start(dependencies, callback);
	}

	stop(callback) {
		this.$watcher.close();
		super.stop(callback);
	}

	loadConfig(module, callback) {
		const fs = require('fs-extra'),
			path = require('path');

		const filesystem = promises.promisifyAll(fs);
		const env = (process.env.NODE_ENV || 'development').toLowerCase(),
			rootPath = path.dirname(require.main.filename);

		const configPath = path.join(rootPath, 'config', `${path.relative(rootPath, module.basePath).replace('server', env)}.js`);

		filesystem.ensureDirAsync(path.dirname(configPath))
		.then(() => {
			return this._existsAsync(configPath, filesystem.R_OK);
		})
		.then((doesExist) => {
			let config = {};

			if(doesExist) config = require(configPath).config;

			this.$cacheMap[configPath] = config;
			if(callback) callback(null, config);
			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${module} Load Configuration From File Error: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	saveConfig(module, config, callback) {
		const deepEqual = require('deep-equal'),
			fs = require('fs-extra'),
			path = require('path');

		const filesystem = promises.promisifyAll(fs);
		const env = (process.env.NODE_ENV || 'development').toLowerCase(),
			rootPath = path.dirname(require.main.filename);

		const configPath = path.join(rootPath, 'config', `${path.relative(rootPath, module.basePath).replace('server', env)}.js`),
			configString = `exports.config = ${JSON.stringify(config, undefined, '\t')};\n`;

		if(deepEqual(this.$cacheMap[configPath], config)) {
			if(callback) callback(null, config);
			return;
		}

		filesystem.ensureDirAsync(path.dirname(configPath))
		.then(() => {
			this.$cacheMap[configPath] = config;
			return filesystem.writeFileAsync(configPath, configString);
		})
		.then(() => {
			if(callback) callback(null, config);
			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${module} Save Configuration to File Error: ${err.stack}`);
			if(callback) callback(err);
		});
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

	_onNewConfiguration(filePath) {
		const path = require('path');

		const env = (process.env.NODE_ENV || 'development').toLowerCase(),
			rootPath = path.dirname(require.main.filename);

		const twyrModule = path.relative(rootPath, filePath).replace(`config/${env}/`, '').replace('.js', '');

		this.$cacheMap[filePath] = require(filePath).config;
		this.$module.emit('new-config', this.name, twyrModule, require(filePath).config);
	}

	_onUpdateConfiguration(filePath) {
		const deepEqual = require('deep-equal'),
			path = require('path');

		const env = (process.env.NODE_ENV || 'development').toLowerCase(),
			rootPath = path.dirname(require.main.filename);

		const twyrModule = path.relative(rootPath, filePath).replace(`config/${env}/`, '').replace('.js', '');

		delete require.cache[filePath];
		setTimeout(() => {
			if(deepEqual(this.$cacheMap[filePath], require(filePath).config))
				return;

			this.$cacheMap[filePath] = require(filePath).config;
			this.$module.emit('update-config', this.name, twyrModule, require(filePath).config);
		}, 500);
	}

	_onDeleteConfiguration(filePath) {
		const path = require('path');

		const env = (process.env.NODE_ENV || 'development').toLowerCase(),
			rootPath = path.dirname(require.main.filename);

		const twyrModule = path.relative(rootPath, filePath).replace(`config/${env}/`, '').replace('.js', '');

		delete require.cache[filePath];
		delete this.$cacheMap[filePath];

		this.$module.emit('delete-config', this.name, twyrModule);
	}

	_processConfigChange(configUpdateModule, config) {
		const deepEqual = require('deep-equal'),
			fs = require('fs-extra'),
			path = require('path');

		const filesystem = promises.promisifyAll(fs);
		const env = (process.env.NODE_ENV || 'development').toLowerCase(),
			rootPath = path.dirname(require.main.filename);

		const configPath = path.join(rootPath, 'config', env, `${configUpdateModule}.js`),
			configString = `exports.config = ${JSON.stringify(config, undefined, '\t')};`;

		if(deepEqual(this.$cacheMap[configPath], config))
			return;

		filesystem.ensureDirAsync(path.dirname(configPath))
		.then(() => {
			this.$cacheMap[configPath] = config;
			return filesystem.writeFileAsync(configPath, configString);
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${configPath} Save Configuration to File Error: ${err.stack}`);
		});
	}

	_processStateChange() {
		return;
	}

	get basePath() { return __dirname; }
}

exports.service = FileConfigurationService;
