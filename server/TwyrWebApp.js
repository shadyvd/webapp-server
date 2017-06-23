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
	TwyrBaseModule = require('./TwyrBaseModule').TwyrBaseModule;

class TwyrWebApp extends TwyrBaseModule {
	constructor(application, clusterId, workerId) {
		super();
		this.$application = application;
		this.$uuid = `${clusterId}-${workerId}`;

		this._loadConfig();
	}

	start(dependencies, callback) {
		this._dummyAsync()
		.then(() => {
			const superStartAsync = promises.promisify(super.start.bind(this));
			return superStartAsync(dependencies);
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

	_subModuleReconfigure(subModule, callback) {
		this._dummyAsync()
		.then(() => {
			const superSubmoduleReconfigureAsync = promises.promisify(super._subModuleReconfigure.bind(this));
			return superSubmoduleReconfigureAsync(subModule);
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

	_subModuleStateChange(subModule, state, callback) {
		this._dummyAsync()
		.then(() => {
			const superSubmoduleStatechangeAsync = promises.promisify(super._subModuleStateChange.bind(this));
			return superSubmoduleStatechangeAsync(subModule, state);
		})
		.then((status) => {
			if(subModule.name !== 'ExpressService')
				return [status];

			if(!state)
				return [status];

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

	_addRoutes(callback) {
		const path = require('path');

		const expressApp = this.$services.ExpressService.Interface,
			loggerSrvc = this.$services.LoggerService.Interface;

		this._dummyAsync()
		.then(() => {
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
				const cacheSrvc = this.$services.CacheService.Interface,
					mediaType = request.device.type,
					renderAsync = promises.promisify(response.render.bind(response));

				const tenant = request.tenant;
				let user = undefined;

				if(request.user && request.user.modules) {
					user = JSON.parse(JSON.stringify(request.user));
					Object.keys(user.modules).forEach((moduleName) => {
						user.modules[moduleName] = user.modules[moduleName].filter((emberComponent) => {
							return emberComponent.media === mediaType;
						});
					});
				}

				cacheSrvc.getAsync(`twyr!webapp!${mediaType}!user!${user.id}!${tenant}!indexTemplate`)
				.then((indexTemplate) => {
					if(indexTemplate) return promises.all([indexTemplate, false]);
					return promises.all([this._getClientsideAssetsAsync(tenant, user, mediaType, renderAsync), true]);
				})
				.then((results) => {
					response.status(200).send(results[0]);
					return results;
				})
				.catch((err) => {
					next(err);
					throw err;
				})
				.then((results) => {
					const indexTemplate = results[0],
						toCache = results[1];

					if(toCache && (process.env.NODE_ENV || 'development') === 'production') {
						const cacheMulti = promises.promisifyAll(cacheSrvc.multi());
						cacheMulti.setAsync(`twyr!webapp!${mediaType}!user!${user.id}!${tenant}!indexTemplate`, indexTemplate);
						cacheMulti.expireAsync(`twyr!webapp!${mediaType}!user!${user.id}!${tenant}!indexTemplate`, 900);

						return cacheMulti.execAsync();
					}

					return null;
				})
				.catch((err) => {
					const errMessage = (err instanceof TwyrBaseError) ? err.toString() : err.message;
					loggerSrvc.error(`Error saving twyr!webapp!${mediaType}!user!${user.id}!${tenant}!indexTemplate to the cache:\n${errMessage}`);
				});
			});

			expressApp.use((error, request, response, next) => {
				if(request.xhr)
					response.status(422).json({ 'error': error.message });
				else
					next(error);
			});

			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
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
		.then((results) => {
			const selectedTemplate = results.shift(),
				selectedTemplateConfiguration = results.shift();

			return this.$templates[selectedTemplate].renderAsync(renderer, selectedTemplateConfiguration);
		})
		.then((renderedTemplate) => {
			if(callback) callback(null, renderedTemplate);
		})
		.catch((err) => {
			if(callback) callback(err);
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
		.then((baseRoute) => {
			if(callback) callback(null, [baseRoute]);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
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
		.then((baseControllers) => {
			if(callback) callback(null, baseControllers);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
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
		.then((baseModel) => {
			if(callback) callback(null, [baseModel]);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
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
		.then((baseComponent) => {
			if(callback) callback(null, [baseComponent]);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
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
		.then((baseComponentHTML) => {
			if(callback) callback(null, [baseComponentHTML]);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
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
		.then((baseService) => {
			if(callback) callback(null, [baseService]);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
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
		.then((baseHelper) => {
			if(callback) callback(null, [baseHelper]);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
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
		.then((results) => {
			const dbSrvc = this.$services.DatabaseService.Interface.knex,
				id = results.shift(),
				moduleTemplates = results.shift();

			if(!moduleTemplates.rows.length && tenant !== 'www')
				return dbSrvc.raw('SELECT name FROM modules WHERE id IN (SELECT module FROM server_templates WHERE id IN (SELECT server_template FROM tenants_server_templates WHERE tenant = (SELECT id FROM tenants WHERE sub_domain = ?)) AND media = ?) AND id IN (SELECT id FROM fn_get_module_descendants(?))', ['www', mediaType, id]);

			return moduleTemplates;
		})
		.then((moduleTemplates) => {
			if(moduleTemplates.rows.length !== 1)
				throw new Error(`Incorrect template configuration for ${tenant}`);

			if(callback) callback(null, moduleTemplates.rows[0].name);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
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
