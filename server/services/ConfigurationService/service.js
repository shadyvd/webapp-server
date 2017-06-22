/**
 * @file      server/services/ConfigurationService/service.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Configuration Service
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

class ConfigurationService extends TwyrBaseService {
	constructor(module) {
		super(module);

		const ConfigurationServiceLoader = require('./ConfigurationServiceLoader').ConfigurationServiceLoader;

		const configLoader = promises.promisifyAll(new ConfigurationServiceLoader(this), {
			'filter': () => {
				return true;
			}
		});

		this.$loader = configLoader;
	}

	load(configSrvc, callback) {
		const path = require('path');

		const env = (process.env.NODE_ENV || 'development').toLowerCase(),
			rootPath = path.dirname(require.main.filename);

		const configPath = path.join(rootPath, 'config', `${path.relative(rootPath, this.basePath).replace('server', env)}.js`);

		delete require.cache[configPath];
		this.$config = require(configPath).config;

		this.on('new-config', this._processConfigChange.bind(this));
		this.on('update-config', this._processConfigChange.bind(this));
		this.on('delete-config', this._processConfigChange.bind(this));

		this.on('update-state', this._processStateChange.bind(this));

		super.load(configSrvc, (err, status) => {
			if(err) {
				if(callback) callback(err);
				return;
			}

			if(!this.$prioritizedSubServices) {
				this.$prioritizedSubServices = [].concat(Object.keys(this.$services));
				this.$prioritizedSubServices.sort((left, right) => {
					return (this.$config.priorities[left] || 100) - (this.$config.priorities[right] || 100);
				});
			}

			if(callback) callback(null, status);
		});
	}

	loadConfig(module, callback) {
		this._dummyAsync()
		.then(() => {
			const promiseResolutions = [];

			this.$prioritizedSubServices.forEach((subService) => {
				promiseResolutions.push(this.$services[subService].loadConfigAsync(module));
			});

			return promises.all(promiseResolutions);
		})
		.then((loadedConfigs) => {
			const deepmerge = require('deepmerge');
			let mergedConfig = {};

			loadedConfigs.forEach((loadedConfig) => {
				if(!loadedConfig) return;
				mergedConfig = deepmerge(mergedConfig, loadedConfig);
			});

			return this.saveConfigAsync(module, mergedConfig);
		})
		.then((mergedConfig) => {
			return promises.all([mergedConfig, this.getModuleStateAsync(module)]);
		})
		.then((result) => {
			const enabled = result[1],
				mergedConfig = result[0];

			if(callback) callback(null, { 'configuration': mergedConfig, 'state': enabled });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	saveConfig(module, config, callback) {
		this._dummyAsync()
		.then(() => {
			const promiseResolutions = [];

			Object.keys(this.$services).forEach((subService) => {
				promiseResolutions.push(this.$services[subService].saveConfigAsync(module, config));
			});

			return promises.all(promiseResolutions);
		})
		.then(() => {
			if(callback) callback(null, config);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	getModuleState(module, callback) {
		this._dummyAsync()
		.then(() => {
			const promiseResolutions = [];

			Object.keys(this.$services).forEach((subService) => {
				promiseResolutions.push(this.$services[subService].getModuleStateAsync(module));
			});

			return promises.all(promiseResolutions);
		})
		.then((moduleStates) => {
			let moduleState = true;
			moduleStates.forEach((state) => {
				moduleState = moduleState && state;
			});

			if(callback) callback(null, moduleState);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	setModuleState(module, enabled, callback) {
		this._dummyAsync()
		.then(() => {
			const promiseResolutions = [];

			Object.keys(this.$services).forEach((subService) => {
				promiseResolutions.push(this.$services[subService].setModuleStateAsync(module, enabled));
			});

			return promises.all(promiseResolutions);
		})
		.then((moduleStates) => {
			let moduleState = true;
			moduleStates.forEach((state) => {
				moduleState = moduleState && state;
			});

			if(callback) callback(null, moduleState);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	getModuleId(module, callback) {
		this._dummyAsync()
		.then(() => {
			const promiseResolutions = [];

			Object.keys(this.$services).forEach((subService) => {
				promiseResolutions.push(this.$services[subService].getModuleIdAsync(module));
			});

			return promises.all(promiseResolutions);
		})
		.then((moduleIds) => {
			let moduleId = null;
			moduleIds.forEach((id) => {
				if(!id) return;
				moduleId = id;
			});

			if(callback) callback(null, moduleId);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_processConfigChange(eventFirerModule, configUpdateModule, config) {
		Object.keys(this.$services).forEach((subService) => {
			if(subService === eventFirerModule)
				return;

			this.$services[subService]._processConfigChange(configUpdateModule, config);
		});

		const currentModule = this._getModuleFromPath(configUpdateModule);
		if(currentModule) currentModule._reconfigure(config);
	}

	_processStateChange(eventFirerModule, stateUpdateModule, state) {
		Object.keys(this.$services).forEach((subService) => {
			if(subService === eventFirerModule)
				return;

			this.$services[subService]._processStateChange(stateUpdateModule, state);
		});

		const currentModule = this._getModuleFromPath(stateUpdateModule);
		if(currentModule) currentModule._changeState(state);
	}

	_getModuleFromPath(pathFromRoot) {
		let currentModule = this,
			pathSegments = null;

		while(currentModule.$module) currentModule = currentModule.$module;

		pathSegments = pathFromRoot.split('/');
		pathSegments.forEach((pathSegment) => {
			if(!currentModule) return;

			if(currentModule[`$${pathSegment}`]) {
				currentModule = currentModule[`$${pathSegment}`];
				return;
			}

			if(currentModule[pathSegment]) {
				currentModule = currentModule[pathSegment];
				return;
			}

			currentModule = null;
		});

		return currentModule;
	}

	get basePath() { return __dirname; }
}

exports.service = ConfigurationService;
