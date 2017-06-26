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
const TwyrBaseModule = require('./../TwyrBaseModule').TwyrBaseModule,
	TwyrComponentError = require('./TwyrComponentError').TwyrComponentError;

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
		this._dummyAsync()
		.then(() => {
			const expressLogger = require('morgan');

			const loggerSrvc = this.$dependencies.LoggerService,
				router = this.$router;

			const loggerStream = {
				'write': (message) => {
					loggerSrvc.silly(message);
				}
			};

			router
			.use(expressLogger('combined', {
				'stream': loggerStream
			}))
			.use((request, response, next) => {
				this._dummyAsync()
				.then(() => {
					if(this.$enabled) {
						next();
						return;
					}

					const httpErrors = require('http-errors');
					throw httpErrors('404', `${this.name} is disabled`);
				})
				.catch((err) => {
					let error = err;
					if(!(error instanceof TwyrComponentError))
						error = new TwyrComponentError(`${this.name} is disabled`, err);

					next(error);
				});
			});

			if(callback) callback(null, true);
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrComponentError))
				error = new TwyrComponentError(`Error setting up the router`, err);

			if(callback) callback(error);
		});
	}

	_addRoutes(callback) {
		this._dummyAsync()
		.then(() => {
			const path = require('path');
			const mountPath = '/';

			Object.keys(this.$components).forEach((subComponentName) => {
				const subRouter = this.$components[subComponentName].getRouter();
				this.$router.use(path.join(mountPath, subComponentName), subRouter);
			});

			this.$router.use((request, response, next) => {
				const error = new TwyrComponentError(`Unknown route: ${request.originalUrl}`);
				next(error);
			});

			if(callback) callback(null, true);
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrComponentError))
				error = new TwyrComponentError(`Error adding routes`, err);

			if(callback) callback(error);
		});
	}

	_deleteRoutes(callback) {
		// NOTICE: Undocumented ExpressJS API. Be careful upgrading :-)
		this._dummyAsync()
		.then(() => {
			if(this.$router) this.$router.stack.length = 0;
			if(callback) callback(null, true);
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrComponentError))
				error = new TwyrComponentError(`Error deleting routes`, err);

			if(callback) callback(error);
		});
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
			let error = err;
			if(!(error instanceof TwyrComponentError))
				error = new TwyrComponentError(`Error returning empty Ember assets`, err);

			if(callback) callback(error);
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
		.catch((err) => {
			if(err instanceof TwyrComponentError) throw err;

			const error = new TwyrComponentError(`Error generating Ember assets`, err);
			throw error;
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
		.catch((err) => {
			if(err instanceof TwyrComponentError) throw err;

			const error = new TwyrComponentError(`Error generating sub-component Ember assets`, err);
			throw error;
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
			let error = err;
			if(!(error instanceof TwyrComponentError))
				error = new TwyrComponentError(`Error returning Ember assets`, err);

			if(callback) callback(error);
		});
	}

	_getEmberModels(tenant, user, mediaType, renderer, callback) {
		const fs = require('fs'),
			path = require('path');

		const filesystem = promises.promisifyAll(fs);
		const modelDirPath = path.join(this.basePath, 'ember/models');

		this._dummyAsync()
		.then(() => {
			return this._existsAsync(modelDirPath);
		})
		.catch((err) => {
			if(err instanceof TwyrComponentError) throw err;

			const error = new TwyrComponentError(`Error checking Model folder existence`, err);
			throw error;
		})
		.then((modelDirExists) => {
			if(!modelDirExists) return [];
			return filesystem.readdirAsync(modelDirPath);
		})
		.catch((err) => {
			if(err instanceof TwyrComponentError) throw err;

			const error = new TwyrComponentError(`Error reading Ember Model folder`, err);
			throw error;
		})
		.then((modelDirObjects) => {
			const promiseResolutions = [];

			for(const modelDirObject of modelDirObjects)
				promiseResolutions.push(filesystem.statAsync(path.join(modelDirPath, modelDirObject)));

			promiseResolutions.push(modelDirObjects);
			return promises.all(promiseResolutions);
		})
		.catch((err) => {
			if(err instanceof TwyrComponentError) throw err;

			const error = new TwyrComponentError(`Error stat-ing Ember Model folder`, err);
			throw error;
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
		.catch((err) => {
			if(err instanceof TwyrComponentError) throw err;

			const error = new TwyrComponentError(`Error reading Ember Models`, err);
			throw error;
		})
		.then((modelFiles) => {
			if(callback) callback(null, modelFiles);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrComponentError))
				error = new TwyrComponentError(`Error returning Ember Models`, err);

			if(callback) callback(error);
		});
	}

	_getEmberComponents(tenant, user, mediaType, renderer, callback) {
		const _ = require('lodash'),
			fs = require('fs-extra'),
			path = require('path');

		const filesystem = promises.promisifyAll(fs);
		const componentDirPath = path.join(this.basePath, 'ember/components');

		this._dummyAsync()
		.then(() => {
			return this._existsAsync(componentDirPath);
		})
		.catch((err) => {
			if(err instanceof TwyrComponentError) throw err;

			const error = new TwyrComponentError(`Error checking Ember Component folder existence`, err);
			throw error;
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
		.catch((err) => {
			if(err instanceof TwyrComponentError) throw err;

			const error = new TwyrComponentError(`Error reading Ember Components`, err);
			throw error;
		})
		.then((componentJS) => {
			if(callback) callback(null, componentJS);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrComponentError))
				error = new TwyrComponentError(`Error returning Ember Components`, err);

			if(callback) callback(error);
		});
	}

	_getEmberComponentHTMLs(tenant, user, mediaType, renderer, callback) {
		const _ = require('lodash'),
			fs = require('fs-extra'),
			path = require('path');

		const filesystem = promises.promisifyAll(fs);
		const componentHTMLDirPath = path.join(this.basePath, 'ember/componentHTMLs');

		this._dummyAsync()
		.then(() => {
			return this._existsAsync(componentHTMLDirPath);
		})
		.catch((err) => {
			if(err instanceof TwyrComponentError) throw err;

			const error = new TwyrComponentError(`Error checking Ember Component HTML folder existence`, err);
			throw error;
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
		.catch((err) => {
			if(err instanceof TwyrComponentError) throw err;

			const error = new TwyrComponentError(`Error rendering Ember Component HTMLs`, err);
			throw error;
		})
		.then((componentHTMLs) => {
			if(callback) callback(null, componentHTMLs);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrComponentError))
				error = new TwyrComponentError(`Error returning Ember Component HTMLs`, err);

			if(callback) callback(error);
		});
	}

	_getEmberServices(tenant, user, mediaType, renderer, callback) {
		const fs = require('fs'),
			path = require('path');

		const filesystem = promises.promisifyAll(fs);
		const srvcDirPath = path.join(this.basePath, 'ember/services');

		this._dummyAsync()
		.then(() => {
			return this._existsAsync(srvcDirPath);
		})
		.catch((err) => {
			if(err instanceof TwyrComponentError) throw err;

			const error = new TwyrComponentError(`Error checking Ember Service folder existence`, err);
			throw error;
		})
		.then((srvcDirExists) => {
			if(!srvcDirExists) return [];
			return filesystem.readdirAsync(srvcDirPath);
		})
		.catch((err) => {
			if(err instanceof TwyrComponentError) throw err;

			const error = new TwyrComponentError(`Error reading Ember Service folder`, err);
			throw error;
		})
		.then((srvcDirObjects) => {
			const promiseResolutions = [];

			for(const srvcDirObject of srvcDirObjects)
				promiseResolutions.push(filesystem.statAsync(path.join(srvcDirPath, srvcDirObject)));

			promiseResolutions.push(srvcDirObjects);
			return promises.all(promiseResolutions);
		})
		.catch((err) => {
			if(err instanceof TwyrComponentError) throw err;

			const error = new TwyrComponentError(`Error stat-ing Ember Service folder`, err);
			throw error;
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
		.catch((err) => {
			if(err instanceof TwyrComponentError) throw err;

			const error = new TwyrComponentError(`Error reading Ember Services`, err);
			throw error;
		})
		.then((srvcFiles) => {
			if(callback) callback(null, srvcFiles);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrComponentError))
				error = new TwyrComponentError(`Error returning Ember Services`, err);

			if(callback) callback(error);
		});
	}

	_getEmberHelpers(tenant, user, mediaType, renderer, callback) {
		const fs = require('fs'),
			path = require('path');

		const filesystem = promises.promisifyAll(fs);
		const helperDirPath = path.join(this.basePath, 'ember/helpers');

		this._dummyAsync()
		.then(() => {
			return this._existsAsync(helperDirPath);
		})
		.catch((err) => {
			if(err instanceof TwyrComponentError) throw err;

			const error = new TwyrComponentError(`Error checking Ember Helper folder existence`, err);
			throw error;
		})
		.then((helperDirExists) => {
			if(!helperDirExists) return [];
			return filesystem.readdirAsync(helperDirPath);
		})
		.catch((err) => {
			if(err instanceof TwyrComponentError) throw err;

			const error = new TwyrComponentError(`Error reading Ember Helper folder existence`, err);
			throw error;
		})
		.then((helperDirObjects) => {
			const promiseResolutions = [];

			for(const helperDirObject of helperDirObjects)
				promiseResolutions.push(filesystem.statAsync(path.join(helperDirPath, helperDirObject)));

			promiseResolutions.push(helperDirObjects);
			return promises.all(promiseResolutions);
		})
		.catch((err) => {
			if(err instanceof TwyrComponentError) throw err;

			const error = new TwyrComponentError(`Error stat-ing Ember Helper folder existence`, err);
			throw error;
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
		.catch((err) => {
			if(err instanceof TwyrComponentError) throw err;

			const error = new TwyrComponentError(`Error reading Ember Helpers`, err);
			throw error;
		})
		.then((helperFiles) => {
			if(callback) callback(null, helperFiles);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrComponentError))
				error = new TwyrComponentError(`Error returning Ember Helpers`, err);

			if(callback) callback(error);
		});
	}

	_emptyEmberAsset(callback) {
		this._dummyAsync()
		.then(() => {
			if(callback) callback(null, []);
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrComponentError))
				error = new TwyrComponentError(`Error returning Empty Ember Asset`, err);

			if(callback) callback(error);
		});
	}

	get Router() { return this.$router; }
	get basePath() { return __dirname; }
	get dependencies() { return ['ApiService', 'CacheService', 'ConfigurationService', 'ExpressService', 'LoggerService']; }
}

exports.TwyrBaseComponent = TwyrBaseComponent;
