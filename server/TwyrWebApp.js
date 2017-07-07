/**
 * @file      server/TwyrWebApp.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Application Class
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
const TwyrBaseError = require('./TwyrBaseError').TwyrBaseError,
	TwyrBaseModule = require('./TwyrBaseModule').TwyrBaseModule,
	TwyrJSONAPIError = require('./components/TwyrComponentError').TwyrJSONAPIError;

class TwyrWebApp extends TwyrBaseModule {
	constructor(application, clusterId, workerId) {
		super();
		this.$application = application;
		this.$uuid = `${clusterId}-${workerId}`;

		this._loadConfig();
	}

	load(configSrvc, callback) {
		this._dummyAsync()
		.then(() => {
			const osLocale = require('os-locale');
			return osLocale();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::load: Get OS Locale Error`, err);
			throw error;
		})
		.then((locale) => {
			Object.defineProperty(this, '$locale', {
				'__proto__': null,
				'value': locale
			});

			const superLoadAsync = promises.promisify(super.load.bind(this));
			return superLoadAsync(configSrvc);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::load: Base Load Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, status);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::load: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	start(dependencies, callback) {
		this._dummyAsync()
		.then(() => {
			const superStartAsync = promises.promisify(super.start.bind(this));
			return superStartAsync(dependencies);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::start: Base Start Error`, err);
			throw error;
		})
		.then((status) => {
			return promises.all([status, this._addRoutesAsync()]);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::start: Add Routes Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, status[0]);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::start: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	_subModuleReconfigure(subModule, callback) {
		this._dummyAsync()
		.then(() => {
			const superSubmoduleReconfigureAsync = promises.promisify(super._subModuleReconfigure.bind(this));
			return superSubmoduleReconfigureAsync(subModule);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_subModuleReconfigure: Base _subModuleReconfigure Error`, err);
			throw error;
		})
		.then((status) => {
			if(subModule.name !== 'ExpressService')
				return [status];
			else
				return promises.all([status, this._addRoutesAsync()]);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_subModuleReconfigure: Add Routes Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, status[0]);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_subModuleReconfigure: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	_subModuleStateChange(subModule, state, callback) {
		this._dummyAsync()
		.then(() => {
			const superSubmoduleStatechangeAsync = promises.promisify(super._subModuleStateChange.bind(this));
			return superSubmoduleStatechangeAsync(subModule, state);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_subModuleStateChange: Base _subModuleStateChange Error`, err);
			throw error;
		})
		.then((status) => {
			if(subModule.name !== 'ExpressService')
				return [status];

			if(!state)
				return [status];

			return promises.all([status, this._addRoutesAsync()]);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_subModuleStateChange: Add Routes Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, status[0]);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_subModuleReconfigure: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	_addRoutes(callback) {
		const expressApp = this.$services.ExpressService.Interface;

		this._dummyAsync()
		.then(() => {
			expressApp.use((request, response, next) => {
				this._dummyAsync()
				.then(() => {
					let user = undefined;
					if(request.user && request.user.modules) {
						user = JSON.parse(JSON.stringify(request.user));
						Object.keys(user.modules).forEach((moduleName) => {
							user.modules[moduleName] = user.modules[moduleName].filter((emberComponent) => {
								return emberComponent.media === request.device.type;
							});
						});
					}

					request.user = user;
					next();
				})
				.catch((err) => {
					const error = new TwyrBaseError(err.message, err);
					next(error);
				});
			});

			const path = require('path');
			const mountPath = '/';

			if(this.$templates) {
				Object.keys(this.$templates).forEach((tmplName) => {
					const subRouter = this.$templates[tmplName].Router;
					expressApp.use(path.join(mountPath, tmplName), subRouter);
				});
			}

			if(this.$components) {
				Object.keys(this.$components).forEach((componentName) => {
					const subRouter = this.$components[componentName].Router;
					expressApp.use(path.join(mountPath, componentName), subRouter);
				});
			}

			expressApp.use((request, response, next) => {
				this._dummyAsync()
				.then(() => {
					const cacheSrvc = this.$services.CacheService.Interface;
					return cacheSrvc.getAsync(`twyr!webapp!${request.device.type}!user!${request.user.id}!${request.tenant}!indexTemplate`);
				})
				.catch((err) => {
					const error = new TwyrBaseError(`${this.name}::Error retrieving cached index page for user ${request.user.id}`, err);
					throw error;
				})
				.then((indexTemplate) => {
					if(indexTemplate) return promises.all([indexTemplate, false]);

					const renderAsync = promises.promisify(response.render.bind(response));
					return promises.all([this._getClientsideAssetsAsync(request.tenant, request.user, request.device.type, renderAsync), true]);
				})
				.catch((err) => {
					if(err instanceof TwyrBaseError) throw err;

					const error = new TwyrBaseError(`${this.name}::Error generating client side assets for user ${request.user.id}`, err);
					throw error;
				})
				.then((results) => {
					response.status(200).send(results[0]);
					return results;
				})
				.catch((err) => {
					if(err instanceof TwyrBaseError) throw err;

					const error = new TwyrBaseError(`${this.name}::Error sending response for user ${request.user.id}`, err);
					throw error;
				})
				.then((results) => {
					const indexTemplate = results[0],
						toCache = results[1];

					if(toCache && (process.env.NODE_ENV || 'development') === 'production') {
						const cacheSrvc = this.$services.CacheService.Interface;
						const cacheMulti = promises.promisifyAll(cacheSrvc.multi());

						cacheMulti.setAsync(`twyr!webapp!${request.device.type}!user!${request.user.id}!${request.tenant}!indexTemplate`, indexTemplate);
						cacheMulti.expireAsync(`twyr!webapp!${request.device.type}!user!${request.user.id}!${request.tenant}!indexTemplate`, 900);

						return cacheMulti.execAsync();
					}

					return null;
				})
				.catch((err) => {
					let error = err;
					if(!(error instanceof TwyrBaseError))
						error = new TwyrBaseError(`${this.name}::Error caching twyr!webapp!${request.device.type}!user!${request.user.id}!${request.tenant}!indexTemplate`, err);

					next(error);
				});
			});

			expressApp.use((error, request, response, next) => {
				if(response.finished) return;
				if(response.headersSent) next(error);

				if(error instanceof TwyrJSONAPIError) {
					response.status(422).json(error.toJSON());
					return;
				}

				if(error instanceof TwyrBaseError) {
					response.status(400).send(error.toString());
					return;
				}

				response.status(400).send(error.stack);
			});

			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_addRoutes: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	_getClientsideAssets(tenant, user, mediaType, renderer, callback) {
		this._dummyAsync()
		.then(() => {
			const promiseResolutions = [];

			promiseResolutions.push(this._getEmberRouterHandlersAsync(tenant, user, mediaType, renderer));
			promiseResolutions.push(this._getEmberControllersAsync(tenant, user, mediaType, renderer));
			promiseResolutions.push(this._getEmberModelsAsync(tenant, user, mediaType, renderer));
			promiseResolutions.push(this._getEmberComponentsAsync(tenant, user, mediaType, renderer));
			promiseResolutions.push(this._getEmberComponentHTMLsAsync(tenant, user, mediaType, renderer));
			promiseResolutions.push(this._getEmberServicesAsync(tenant, user, mediaType, renderer));
			promiseResolutions.push(this._getEmberHelpersAsync(tenant, user, mediaType, renderer));

			return promises.all(promiseResolutions);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_getClientsideAssets: Error Generating Ember assets`, err);
			throw error;
		})
		.then((clientAssets) => {
			const webappLevelAssets = {};
			webappLevelAssets.RouterHandlers = clientAssets[0];
			webappLevelAssets.Controllers = clientAssets[1];
			webappLevelAssets.Models = clientAssets[2];
			webappLevelAssets.Components = clientAssets[3];
			webappLevelAssets.ComponentHTMLs = clientAssets[4];
			webappLevelAssets.Services = clientAssets[5];
			webappLevelAssets.Helpers = clientAssets[6];

			const promiseResolutions = [];
			Object.keys(this.$components).forEach((componentName) => {
				promiseResolutions.push(this.$components[componentName]._getClientsideAssetsAsync(tenant, user, mediaType, renderer));
			});

			promiseResolutions.push(webappLevelAssets);
			return promises.all(promiseResolutions);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_getClientsideAssets: Error generating sub-component Ember assets`, err);
			throw error;
		})
		.then((componentAssets) => {
			const _ = require('lodash');

			const webappLevelAssets = componentAssets.pop();
			webappLevelAssets.renderConfig = {
				'developmentMode': (process.env.NODE_ENV || 'development') === 'development',
				'title': this.$config.title || `Twy'r Web Application`,
				'baseYear': this.$config.baseYear,
				'currentYear': (new Date()).getFullYear()
			};

			['RouterHandlers', 'Controllers', 'Models', 'Components', 'ComponentHTMLs', 'Services', 'Helpers'].forEach((key) => {
				webappLevelAssets[key] = (webappLevelAssets[key] || []).concat(_.map(componentAssets, key)).join('\n').trim();
			});

			return promises.all([this._selectTemplateAsync(tenant, user, mediaType, renderer), webappLevelAssets]);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::Error selecting a template for rendering`, err);
			throw error;
		})
		.then((results) => {
			const selectedTemplate = results.shift(),
				selectedTemplateConfiguration = results.shift();

			return this.$templates[selectedTemplate].renderAsync(renderer, selectedTemplateConfiguration);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::Error rendering the template`, err);
			throw error;
		})
		.then((renderedTemplate) => {
			if(callback) callback(null, renderedTemplate);
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_getClientsideAssets: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	_getEmberRouterHandlers(tenant, user, mediaType, renderer, callback) {
		this._dummyAsync()
		.then(() => {
			const fs = require('fs'),
				path = require('path');

			const filesystem = promises.promisifyAll(fs);
			return filesystem.readFileAsync(path.join(this.basePath, 'ember/routeHandlers/baseRouteHandler.js'), 'utf8');
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::Error reading the baseRouteHandler`, err);
			throw error;
		})
		.then((baseRoute) => {
			if(callback) callback(null, [baseRoute]);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_getemberRouterHandlers: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	_getEmberControllers(tenant, user, mediaType, renderer, callback) {
		this._dummyAsync()
		.then(() => {
			const fs = require('fs'),
				path = require('path');

			const filesystem = promises.promisifyAll(fs);
			const controllerPath = path.join(this.basePath, 'ember/controllers'),
				promiseResolutions = [];

			promiseResolutions.push(filesystem.readFileAsync(path.join(controllerPath, 'baseController.js'), 'utf8'));
			promiseResolutions.push(filesystem.readFileAsync(path.join(controllerPath, 'applicationController.js'), 'utf8'));

			return promises.all(promiseResolutions);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::Error reading the base Controllers`, err);
			throw error;
		})
		.then((baseControllers) => {
			if(callback) callback(null, baseControllers);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_getEmberControllers: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	_getEmberModels(tenant, user, mediaType, renderer, callback) {
		this._dummyAsync()
		.then(() => {
			const fs = require('fs'),
				path = require('path');

			const filesystem = promises.promisifyAll(fs);
			return filesystem.readFileAsync(path.join(this.basePath, 'ember/models/baseModel.js'), 'utf8');
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::Error reading the base Model`, err);
			throw error;
		})
		.then((baseModel) => {
			if(callback) callback(null, [baseModel]);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_getEmberModels: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	_getEmberComponents(tenant, user, mediaType, renderer, callback) {
		this._dummyAsync()
		.then(() => {
			const fs = require('fs'),
				path = require('path');

			const filesystem = promises.promisifyAll(fs);
			return filesystem.readFileAsync(path.join(this.basePath, 'ember/components/baseComponent.js'), 'utf8');
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::Error reading the base Component`, err);
			throw error;
		})
		.then((baseComponent) => {
			if(callback) callback(null, [baseComponent]);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_getEmberComponents: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	_getEmberComponentHTMLs(tenant, user, mediaType, renderer, callback) {
		this._dummyAsync()
		.then(() => {
			const fs = require('fs'),
				path = require('path');

			const filesystem = promises.promisifyAll(fs);
			return filesystem.readFileAsync(path.join(this.basePath, 'ember/componentHTMLs/baseComponent.ejs'), 'utf8');
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::Error reading the base Component HTML`, err);
			throw error;
		})
		.then((baseComponentHTML) => {
			if(callback) callback(null, [baseComponentHTML]);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_getEmberComponentHTMLs: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	_getEmberServices(tenant, user, mediaType, renderer, callback) {
		this._dummyAsync()
		.then(() => {
			const fs = require('fs'),
				path = require('path');

			const filesystem = promises.promisifyAll(fs);
			return filesystem.readFileAsync(path.join(this.basePath, 'ember/services/baseService.js'), 'utf8');
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::Error reading the base Service`, err);
			throw error;
		})
		.then((baseService) => {
			if(callback) callback(null, [baseService]);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_getEmberServices: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	_getEmberHelpers(tenant, user, mediaType, renderer, callback) {
		this._dummyAsync()
		.then(() => {
			const fs = require('fs'),
				path = require('path');

			const filesystem = promises.promisifyAll(fs);
			return filesystem.readFileAsync(path.join(this.basePath, 'ember/helpers/baseHelper.js'), 'utf8');
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::Error reading the base Helper`, err);
			throw error;
		})
		.then((baseHelper) => {
			if(callback) callback(null, [baseHelper]);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_getEmberHelpers: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	_selectTemplate(tenant, user, mediaType, renderer, callback) {
		this._dummyAsync()
		.then(() => {
			const configSrvc = this.$services.ConfigurationService.Interface;
			return configSrvc.getModuleIdAsync(this);
		})
		.then((id) => {
			const dbSrvc = this.$services.DatabaseService.Interface.knex;
			return promises.all([id, dbSrvc.raw('SELECT name FROM modules WHERE id IN (SELECT module FROM server_templates WHERE id IN (SELECT server_template FROM tenants_server_templates WHERE tenant = (SELECT id FROM tenants WHERE sub_domain = ?)) AND media = ?) AND id IN (SELECT id FROM fn_get_module_descendants(?))', [tenant, mediaType, id])]);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::Error selecting default template for this tenant from the database`, err);
			throw error;
		})
		.then((results) => {
			const dbSrvc = this.$services.DatabaseService.Interface.knex,
				id = results.shift(),
				moduleTemplates = results.shift();

			if(!moduleTemplates.rows.length && tenant !== 'www')
				return dbSrvc.raw('SELECT name FROM modules WHERE id IN (SELECT module FROM server_templates WHERE id IN (SELECT server_template FROM tenants_server_templates WHERE tenant = (SELECT id FROM tenants WHERE sub_domain = ?)) AND media = ?) AND id IN (SELECT id FROM fn_get_module_descendants(?))', ['www', mediaType, id]);

			return moduleTemplates;
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::Error selecting default template for www tenant from the database`, err);
			throw error;
		})
		.then((moduleTemplates) => {
			if(moduleTemplates.rows.length !== 1)
				throw new TwyrBaseError(`Incorrect template configuration for ${tenant}`);

			if(callback) callback(null, moduleTemplates.rows[0].name);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_selectTemplate: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	_loadConfig() {
		const path = require('path');

		const env = (process.env.NODE_ENV || 'development').toLowerCase(),
			rootPath = path.dirname(require.main.filename);

		this.$config = require(path.join(rootPath, 'config', env, this.name)).config;
	}

	get basePath() { return __dirname; }
}

exports.TwyrWebApp = TwyrWebApp;
