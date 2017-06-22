/**
 * @file      server/components/TwyrBaseComponent.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Base Class for Components - providing common functionality required for all components
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

class TwyrBaseComponent extends TwyrBaseModule {
	constructor(module, loader) {
		super(module, loader);

		const TwyrComponentLoader = require('./TwyrComponentLoader').TwyrComponentLoader;
		loader = loader || promises.promisifyAll(new TwyrComponentLoader(this), {
			'filter': () => {
				return true;
			}
		});

		this.$loader = loader;
		this.$router = require('express').Router();
	}

	start(dependencies, callback) {
		this._dummyAsync()
		.then(() => {
			const superStartAsync = promises.promisify(super.start.bind(this));
			return superStartAsync(dependencies);
		})
		.then(() => {
			return this._setupRouterAsync();
		})
		.then((status) => {
			return promises.all([status, this._addRoutesAsync()]);
		})
		.then((status) => {
			if(callback) callback(null, status[0]);
			return null;
		})
		.catch((setupRouterErr) => {
			if(callback) callback(setupRouterErr);
		});
	}

	stop(callback) {
		this._dummyAsync()
		.then(() => {
			const superStopAsync = promises.promisify(super.stop.bind(this));
			return superStopAsync();
		})
		.then((status) => {
			return promises.all([status, this._deleteRoutesAsync()]);
		})
		.then((status) => {
			if(callback) callback(null, status[0]);
			return null;
		})
		.catch((setupRouterErr) => {
			if(callback) callback(setupRouterErr);
		});
	}

	_setupRouter(callback) {
		const expressLogger = require('morgan');

		const router = this.$router,
			twyrLogger = this.$dependencies.LoggerService;

		const loggerStream = {
			'write': (message) => {
				twyrLogger.silly(message);
			}
		};

		router
		.use(expressLogger('combined', {
			'stream': loggerStream
		}))
		.use((request, response, next) => {
			if(this.$enabled) {
				next();
				return;
			}

			const httpErrors = require('http-errors');
			const disabledError = httpErrors('404', `${this.name} is disabled`);

			twyrLogger.error(`${this.name} is disabled: ${disabledError}`);
			next(disabledError);
		});

		if(callback) callback();
	}

	_addRoutes(callback) {
		const path = require('path');

		const loggerSrvc = this.$dependencies.LoggerService,
			mountPath = '/';

		Object.keys(this.$components).forEach((subComponentName) => {
			const subRouter = this.$components[subComponentName].getRouter();
			this.$router.use(path.join(mountPath, subComponentName), subRouter);
		});

		this.$router.use((request, response) => {
			loggerSrvc.error(`Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${request.body.username}\n`);
			response.sendStatus(404);
		});

		if(callback) callback();
	}

	_deleteRoutes(callback) {
		// NOTICE: Undocumented ExpressJS API. Be careful upgrading :-)
		if(this.$router) this.$router.stack.length = 0;
		if(callback) callback();
	}

	_getEmptyClientsideAssets(tenant, user, mediaType, renderer, callback) {
		this._dummyAsync()
		.then(() => {
			const emptyAssets = {};

			emptyAssets.Models = '';
			emptyAssets.Components = '';
			emptyAssets.ComponentHTMLs = '';
			emptyAssets.Services = '';
			emptyAssets.Helpers = '';

			if(callback) callback(null, emptyAssets);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_getClientsideAssets(tenant, user, mediaType, renderer, callback) {
		this._dummyAsync()
		.then(() => {
			const promiseResolutions = [];

			promiseResolutions.push(this._getEmberModelsAsync(tenant, user, mediaType, renderer));
			promiseResolutions.push(this._getEmberComponentsAsync(tenant, user, mediaType, renderer));
			promiseResolutions.push(this._getEmberComponentHTMLsAsync(tenant, user, mediaType, renderer));
			promiseResolutions.push(this._getEmberServicesAsync(tenant, user, mediaType, renderer));
			promiseResolutions.push(this._getEmberHelpersAsync(tenant, user, mediaType, renderer));

			return promises.all(promiseResolutions);
		})
		.then((clientAssets) => {
			const componentLevelAssets = {};
			componentLevelAssets.Models = clientAssets[0];
			componentLevelAssets.Components = clientAssets[1];
			componentLevelAssets.ComponentHTMLs = clientAssets[2];
			componentLevelAssets.Services = clientAssets[3];
			componentLevelAssets.Helpers = clientAssets[4];

			const promiseResolutions = [];
			Object.keys(this.$components).forEach((componentName) => {
				promiseResolutions.push(this.$components[componentName]._getClientsideAssetsAsync(tenant, user, mediaType, renderer));
			});

			promiseResolutions.push(componentLevelAssets);
			return promises.all(promiseResolutions);
		})
		.then((componentAssets) => {
			const _ = require('lodash');

			const componentLevelAssets = componentAssets.pop();
			['Models', 'Components', 'ComponentHTMLs', 'Services', 'Helpers'].forEach((key) => {
				componentLevelAssets[key] = (componentLevelAssets[key] || []).concat(_.map(componentAssets, key)).join('\n').trim();
			});

			if(callback) callback(null, componentLevelAssets);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_getEmberModels(tenant, user, mediaType, renderer, callback) {
		const fs = require('fs'),
			path = require('path');

		const filesystem = promises.promisifyAll(fs);
		const loggerSrvc = this.$dependencies.LoggerService;

		const modelDirPath = path.join(this.basePath, 'ember/models');
		this._dummyAsync()
		.then(() => {
			return this._existsAsync(modelDirPath);
		})
		.then((modelDirExists) => {
			if(!modelDirExists) return [];
			return filesystem.readdirAsync(modelDirPath);
		})
		.then((modelDirObjects) => {
			const promiseResolutions = [];

			for(const modelDirObject of modelDirObjects)
				promiseResolutions.push(filesystem.statAsync(path.join(modelDirPath, modelDirObject)));

			promiseResolutions.push(modelDirObjects);
			return promises.all(promiseResolutions);
		})
		.then((results) => {
			const modelDirObjects = results.pop(),
				modelDirStats = results;

			const modelDirFiles = [];
			modelDirObjects.forEach((modelDirObject, idx) => {
				if(!modelDirStats[idx].isFile())
					return;

				modelDirFiles.push(path.join(modelDirPath, modelDirObject));
			});

			const promiseResolutions = [];
			modelDirFiles.forEach((modelDirFile) => {
				promiseResolutions.push(filesystem.readFileAsync(modelDirFile, 'utf8'));
			});

			return promises.all(promiseResolutions);
		})
		.then((modelFiles) => {
			if(callback) callback(null, modelFiles);
			return null;
		})
		.catch((err) => {
			loggerSrvc.error(`${this.name}::_getEmberModels:\nUser: ${user}\nMediaType: ${mediaType}\nError: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	_getEmberComponents(tenant, user, mediaType, renderer, callback) {
		const _ = require('lodash'),
			fs = require('fs-extra'),
			path = require('path');

		const filesystem = promises.promisifyAll(fs);
		const loggerSrvc = this.$dependencies.LoggerService;

		const componentDirPath = path.join(this.basePath, 'ember/components');
		this._dummyAsync()
		.then(() => {
			return this._existsAsync(componentDirPath);
		})
		.then((componentDirExists) => {
			if(!componentDirExists) return [];

			const components = _.map(user.modules[this.name], 'ember_component'),
				promiseResolutions = [];

			components.forEach((component) => {
				promiseResolutions.push(filesystem.readFileAsync(path.join(componentDirPath, `${component}.js`), 'utf8'));
			});

			return promises.all(promiseResolutions);
		})
		.then((componentJS) => {
			if(callback) callback(null, componentJS);
			return null;
		})
		.catch((err) => {
			loggerSrvc.error(`${this.name}::_getEmberComponents:\nUser: ${user}\nMediaType: ${mediaType}\nError: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	_getEmberComponentHTMLs(tenant, user, mediaType, renderer, callback) {
		const _ = require('lodash'),
			fs = require('fs-extra'),
			path = require('path');

		const filesystem = promises.promisifyAll(fs);
		const loggerSrvc = this.$dependencies.LoggerService;

		const componentHTMLDirPath = path.join(this.basePath, 'ember/componentHTMLs');
		this._dummyAsync()
		.then(() => {
			return this._existsAsync(componentHTMLDirPath);
		})
		.then((componentHTMLDirExists) => {
			if(!componentHTMLDirExists) return [];

			const templateFiles = _.map(user.modules[this.name], 'ember_templates');
			const promiseResolutions = [];

			let allTemplateFiles = [];
			templateFiles.forEach((componentTemplateFiles) => {
				allTemplateFiles = allTemplateFiles.concat(componentTemplateFiles);
			});

			allTemplateFiles.forEach((templateFile) => {
				promiseResolutions.push(filesystem.readFileAsync(path.join(componentHTMLDirPath, `${templateFile}.ejs`), 'utf8'));
			});

			return promises.all(promiseResolutions);
		})
		.then((componentHTMLs) => {
			if(callback) callback(null, componentHTMLs);
			return null;
		})
		.catch((err) => {
			loggerSrvc.error(`${this.name}::_getEmberComponentHTMLs:\nUser: ${user}\nMediaType: ${mediaType}\nError: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	_getEmberServices(tenant, user, mediaType, renderer, callback) {
		const fs = require('fs'),
			path = require('path');

		const filesystem = promises.promisifyAll(fs);
		const loggerSrvc = this.$dependencies.LoggerService;

		const srvcDirPath = path.join(this.basePath, 'ember/services');
		this._dummyAsync()
		.then(() => {
			return this._existsAsync(srvcDirPath);
		})
		.then((srvcDirExists) => {
			if(!srvcDirExists) return [];
			return filesystem.readdirAsync(srvcDirPath);
		})
		.then((srvcDirObjects) => {
			const promiseResolutions = [];

			for(const srvcDirObject of srvcDirObjects)
				promiseResolutions.push(filesystem.statAsync(path.join(srvcDirPath, srvcDirObject)));

			promiseResolutions.push(srvcDirObjects);
			return promises.all(promiseResolutions);
		})
		.then((results) => {
			const srvcDirObjects = results.pop(),
				srvcDirStats = results;

			const srvcDirFiles = [];
			srvcDirObjects.forEach((srvcDirObject, idx) => {
				if(!srvcDirStats[idx].isFile())
					return;

				srvcDirFiles.push(path.join(srvcDirPath, srvcDirObject));
			});

			const promiseResolutions = [];
			srvcDirFiles.forEach((srvcDirFile) => {
				promiseResolutions.push(filesystem.readFileAsync(srvcDirFile, 'utf8'));
			});

			return promises.all(promiseResolutions);
		})
		.then((srvcFiles) => {
			if(callback) callback(null, srvcFiles);
			return null;
		})
		.catch((err) => {
			loggerSrvc.error(`${this.name}::_getEmberServices:\nUser: ${user}\nMediaType: ${mediaType}\nError: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	_getEmberHelpers(tenant, user, mediaType, renderer, callback) {
		const fs = require('fs'),
			path = require('path');

		const filesystem = promises.promisifyAll(fs);
		const loggerSrvc = this.$dependencies.LoggerService;

		const helperDirPath = path.join(this.basePath, 'ember/helpers');
		this._dummyAsync()
		.then(() => {
			return this._existsAsync(helperDirPath);
		})
		.then((helperDirExists) => {
			if(!helperDirExists) return [];
			return filesystem.readdirAsync(helperDirPath);
		})
		.then((helperDirObjects) => {
			const promiseResolutions = [];

			for(const helperDirObject of helperDirObjects)
				promiseResolutions.push(filesystem.statAsync(path.join(helperDirPath, helperDirObject)));

			promiseResolutions.push(helperDirObjects);
			return promises.all(promiseResolutions);
		})
		.then((results) => {
			const helperDirObjects = results.pop(),
				helperDirStats = results;

			const helperDirFiles = [];
			helperDirObjects.forEach((helperDirObject, idx) => {
				if(!helperDirStats[idx].isFile())
					return;

				helperDirFiles.push(path.join(helperDirPath, helperDirObject));
			});

			const promiseResolutions = [];
			helperDirFiles.forEach((helperDirFile) => {
				promiseResolutions.push(filesystem.readFileAsync(helperDirFile, 'utf8'));
			});

			return promises.all(promiseResolutions);
		})
		.then((helperFiles) => {
			if(callback) callback(null, helperFiles);
			return null;
		})
		.catch((err) => {
			loggerSrvc.error(`${this.name}::_getEmberHelpers:\nUser: ${user}\nMediaType: ${mediaType}\nError: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	_emptyEmberAsset(callback) {
		this._dummyAsync()
		.then(() => {
			if(callback) callback(null, []);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	get Router() { return this.$router; }
	get basePath() { return __dirname; }
	get dependencies() { return ['ApiService', 'CacheService', 'ConfigurationService', 'ExpressService', 'LoggerService']; }
}

exports.TwyrBaseComponent = TwyrBaseComponent;
