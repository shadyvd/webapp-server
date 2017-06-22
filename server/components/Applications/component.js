/**
 * @file      server/components/Applications/component.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Application Component - provides functionality to render Twy'r Applications
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
const TwyrBaseComponent = require('./../TwyrBaseComponent').TwyrBaseComponent;

class Applications extends TwyrBaseComponent {
	constructor(module) {
		super(module);
	}

	initialize(callback) {
		const path = require('path');
		const helperPath = path.join(this.basePath, this.$config.helperPath);

		this._dummyAsync()
		.then(() => {
			const superInitializeAsync = promises.promisify(super.initialize.bind(this));
			return superInitializeAsync();
		})
		.then((status) => {
			// Initialize the helpers...
			return promises.all([status, this.$loader._findFilesAsync(helperPath, 'helper.js')]);
		})
		.then((results) => {
			const helperFiles = results.pop(),
				status = results.pop();

			if(!this.$helpers) this.$helpers = {};
			for(const helperFile of helperFiles) {
				const helper = require(helperFile).helper;
				const helperName = path.relative(helperPath, path.dirname(helperFile)).split('/');

				if(!helper) continue;
				if(!helper.method) continue;

				let helperObject = this.$helpers;
				helperName.forEach((helperNameSegment, idx) => {
					if(idx === helperName.length - 1) {
						helperObject[helperNameSegment] = promises.promisify(helper.method.bind(this));
						return;
					}

					if(!helperObject[helperNameSegment]) {
						helperObject[helperNameSegment] = {};
						helperObject = helperObject[helperNameSegment];
					}
				});
			}

			if(callback) callback(null, status);
			return null;
		})
		.catch((loadErr) => {
			if(callback) callback(loadErr);
		});
	}

	_addRoutes(callback) {
		this._dummyAsync()
		.then(() => {
			this.$router.get('/logo.png', this._getTenantLogo.bind(this));
			this.$router.get('/dashboard-application-categories', this._getApplicationsWithCategory.bind(this));

			if(callback) callback();
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_getTenantLogo(request, response, next) {
		const path = require('path');

		const loggerSrvc = this.$dependencies.LoggerService,
			rootPath = path.dirname(require.main.filename);

		const logoFolder = path.isAbsolute(this.$config.tenantAssetsPath) ? this.$config.tenantAssetsPath : path.join(rootPath, this.$config.tenantAssetsPath);

		const defaultPath = path.join(logoFolder, 'www', 'img/logo.png'),
			logoPath = path.join(logoFolder, request.tenant, 'img/logo.png');

		loggerSrvc.debug(`Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${request.body.username}\n`);

		this._dummyAsync()
		.then(() => {
			return promises.all([this._existsAsync(logoPath), this._existsAsync(defaultPath)]);
		})
		.then((exists) => {
			const defaultLogoExists = exists.pop(),
				tenantLogoExists = exists.pop();

			if(tenantLogoExists) {
				response.sendFile(logoPath);
				return null;
			}

			if(defaultLogoExists) {
				response.sendFile(defaultPath);
				return null;
			}

			throw new Error('No Logo File found!');
		})
		.catch((err) => {
			next(err);
		});
	}

	_getApplicationsWithCategory(request, response) {
		const apiService = this.$dependencies.ApiService,
			loggerSrvc = this.$dependencies.LoggerService;

		loggerSrvc.debug(`Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${request.body.username}\n`);
		response.type('application/javascript');

		this._dummyAsync()
		.then(() => {
			if(request.user.id === 'ffffffff-ffff-4fff-ffff-ffffffffffff') throw new Error('Public visitors do not have access to application categories');
			return apiService.executeAsync('Application::applicationWithCategory', [request.tenant, request.user, request.device.type]);
		})
		.then((applicationCategory) => {
			response.status(200).json(applicationCategory);
			return null;
		})
		.catch((err) => {
			loggerSrvc.error(`Error Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${JSON.stringify(request.body, undefined, '\t')}\nError: ${err.stack}\n`);
			response.status(400).json({
				'errors': [{
					'status': 400,
					'source': { 'pointer': '/data' },
					'title': 'Get application category error',
					'detail': err.stack.split('\n', 1)[0].replace('error: ', '').trim()
				}]
			});
		});
	}

	_getClientsideAssets(tenant, user, mediaType, renderer, callback) {
		this._dummyAsync()
		.then(() => {
			const apiService = this.$dependencies.ApiService;
			return promises.all([
				apiService.executeAsync('Server::applications', [mediaType]),
				apiService.executeAsync('Tenant::applications', [tenant, mediaType])
			]);
		})
		.then((applications) => {
			const serverApplications = applications[0],
				tenantApplications = applications[1];

			const promiseResolutions = [];
			serverApplications.forEach((serverApplication) => {
				promiseResolutions.push(this._prepareTenantApplicationForUserAsync(tenant, user, mediaType, serverApplication, renderer));
			});

			tenantApplications.forEach((tenantApplication) => {
				promiseResolutions.push(this._prepareTenantApplicationForUserAsync(tenant, user, mediaType, tenantApplication, renderer));
			});

			return promises.all(promiseResolutions);
		})
		.then((loadedTenantApplications) => {
			loadedTenantApplications = loadedTenantApplications.filter((loadedTenantApplication) => {
				return !!loadedTenantApplication.files.length;
			});

			const _ = require('lodash');

			const cacheMulti = promises.promisifyAll(this.$dependencies.CacheService.multi()),
				promiseResolutions = [],
				tenantUserApplicationIds = _.map(loadedTenantApplications, 'id').filter((tenantUserApplicationId) => { return tenantUserApplicationId !== this.name.toLowerCase(); });

			cacheMulti.setAsync(`twyr!webapp!${mediaType}!user!${user.id}!${tenant}!applications`, JSON.stringify(tenantUserApplicationIds));
			cacheMulti.expireAsync(`twyr!webapp!${mediaType}!user!${user.id}!${tenant}!applications`, 3600);

			promiseResolutions.push(this._generateEmberRouteMapAsync(tenant, user, mediaType, renderer, loadedTenantApplications));
			promiseResolutions.push(this._getEmberRouterHandlersAsync(tenant, user, mediaType, renderer, loadedTenantApplications));
			promiseResolutions.push(this._getEmberControllersAsync(tenant, user, mediaType, renderer, loadedTenantApplications));
			promiseResolutions.push(this._getEmberModelsAsync(tenant, user, mediaType, renderer, loadedTenantApplications));
			promiseResolutions.push(this._getEmberComponentsAsync(tenant, user, mediaType, renderer, loadedTenantApplications));
			promiseResolutions.push(this._getEmberComponentHTMLsAsync(tenant, user, mediaType, renderer, loadedTenantApplications));
			promiseResolutions.push(this._getEmberServicesAsync(tenant, user, mediaType, renderer, loadedTenantApplications));
			promiseResolutions.push(this._getEmberHelpersAsync(tenant, user, mediaType, renderer, loadedTenantApplications));

			promiseResolutions.push(cacheMulti.execAsync());
			promiseResolutions.push(loadedTenantApplications);
			return promises.all(promiseResolutions);
		})
		.then((clientAssets) => {
			const componentLevelAssets = {},
				loadedTenantApplications = clientAssets.pop();

			componentLevelAssets.RouterHandlers = clientAssets[1];
			componentLevelAssets.RouterHandlers.push(clientAssets[0]);

			componentLevelAssets.Controllers = clientAssets[2];
			componentLevelAssets.Models = clientAssets[3];
			componentLevelAssets.Components = clientAssets[4];
			componentLevelAssets.ComponentHTMLs = clientAssets[5];
			componentLevelAssets.Services = clientAssets[6];
			componentLevelAssets.Helpers = clientAssets[7];

			const promiseResolutions = [];
			Object.keys(this.$components).forEach((componentName) => {
				promiseResolutions.push(this.$components[componentName]._getClientsideAssetsAsync(tenant, user, mediaType, renderer, loadedTenantApplications));
			});

			promiseResolutions.push(componentLevelAssets);
			return promises.all(promiseResolutions);
		})
		.then((componentAssets) => {
			const _ = require('lodash');
			const componentLevelAssets = componentAssets.pop();

			['RouterHandlers', 'Controllers', 'Models', 'Components', 'ComponentHTMLs', 'Services', 'Helpers'].forEach((key) => {
				componentLevelAssets[key] = (componentLevelAssets[key] || []).concat(_.map(componentAssets, key)).join('\n').trim();
			});

			if(callback) callback(null, componentLevelAssets);
		})
		.catch((assetError) => {
			if(callback) callback(assetError);
		});
	}

	_prepareTenantApplicationForUser(tenant, user, mediaType, tenantApplication, renderer, callback) {
		this._dummyAsync()
		.then(() => {
			return this._loadTenantApplicationAsync(tenant, mediaType, tenantApplication);
		})
		.then((loadedTenantApplication) => {
			return this._removeUnauthorizedTenantApplicationScreensAsync(user, loadedTenantApplication, renderer);
		})
		.then((loadedTenantApplication) => {
			return this._markUnusedTenantApplicationScreensAsync(loadedTenantApplication);
		})
		.then((loadedTenantApplication) => {
			return this._reorganizeTenantApplicationMenusAsync(loadedTenantApplication);
		})
		.then((loadedTenantApplication) => {
			return this._removeUnusedTenantApplicationMenusAsync(loadedTenantApplication);
		})
		.then((loadedTenantApplication) => {
			if(callback) callback(null, loadedTenantApplication);
		})
		.catch((assetError) => {
			if(callback) callback(assetError);
		});
	}

	_generateEmberRouteMap(tenant, user, mediaType, renderer, tenantApplications, callback) {
		let emberRouteMap = `	// Application Route\n`;
		emberRouteMap += `this.route('user-home', { 'path': '/' });\n`;

		tenantApplications.forEach((tenantApplication, idx) => {
			emberRouteMap += `\n${this._createEmberRoutesFromOrganizedMenus(tenantApplication)}`;
			if(idx < tenantApplications.length - 1) emberRouteMap += '\n';
		});

		emberRouteMap = emberRouteMap.replace(/\n/g, '\n\t');

		const routes = `
var Router = require('twyr-webapp/router')['default'];
Router.map(function() {
${emberRouteMap}
});
			`;

		if(callback) callback(null, [routes]);
	}

	_getEmberRouterHandlers(tenant, user, mediaType, renderer, tenantApplications, callback) {
		const _getTenantApplicationDefaultRoute = function(tenantApplication) {
			if(!tenantApplication) return undefined;

			if(tenantApplication.menus && tenantApplication.menus.length) {
				let defaultMenuItem = tenantApplication.menus.filter((menuItem) => {
					return !!menuItem.is_home;
				})[0];

				if(!defaultMenuItem) {
					defaultMenuItem = tenantApplication.menus.filter((menuItem) => {
						return !!menuItem.screen;
					})[0];
				}

				if(!defaultMenuItem) return undefined;

				const routeName = [];
				routeName.unshift(defaultMenuItem.screen || defaultMenuItem.id);

				while(defaultMenuItem.parent) {
					defaultMenuItem = tenantApplication.menus.filter((menuItem) => {
						return menuItem.id === defaultMenuItem.parent;
					})[0];

					routeName.unshift(defaultMenuItem.screen || defaultMenuItem.id);
				}

				routeName.unshift(defaultMenuItem.menu);
				routeName.unshift(tenantApplication.id);
				return routeName.join('.');
			}

			if(tenantApplication.screens && tenantApplication.screens.length)
				return [tenantApplication.id, tenantApplication.screens[0].id].join('.');

			return undefined;
		};

		this._dummyAsync()
		.then(() => {
			const tenantId = tenantApplications.filter((tenantApplication) => {
				return !!tenantApplication.tenant && tenantApplication.tenant_folder === tenant;
			})[0].tenant;

			let defaultApplication = tenantApplications.filter((tenantApplication) => {
				return user.default_application === tenantApplication.id;
			})[0];

			if(!defaultApplication) {
				defaultApplication = tenantApplications.filter((tenantApplication) => {
					return tenantApplication.tenant === tenantId && tenantApplication.is_default;
				})[0];
			}

			if(!defaultApplication) {
				defaultApplication = tenantApplications.filter((tenantApplication) => {
					return tenantApplication.is_default && !tenantApplication.tenant;
				})[0];
			}

			if(!defaultApplication) defaultApplication = tenantApplications[0];
			if(!defaultApplication) throw new Error('No Applications found for user');

			const tenantApplicationRoutes = [];
			tenantApplications.forEach((tenantApplication) => {
				tenantApplicationRoutes.push(_getTenantApplicationDefaultRoute(tenantApplication));
			});

			const path = require('path');

			const promiseResolutions = [],
				routerHandlerPath = path.join(this.basePath, `ember/routeHandlers/default.ejs`);

			tenantApplicationRoutes.forEach((tenantApplicationRoute, idx) => {
				if(!tenantApplicationRoute) return;

				if(defaultApplication && defaultApplication.id === tenantApplications[idx].id)
					promiseResolutions.push(renderer(routerHandlerPath, { 'routeName': 'user-home', 'routePath': defaultApplication.id }));

				const tenantApplicationRouteSegments = tenantApplicationRoute.split('.');
				if(tenantApplicationRouteSegments.length <= 2) {
					promiseResolutions.push(renderer(routerHandlerPath, { 'routeName': tenantApplications[idx].id, 'routePath': tenantApplicationRoute }));
					return;
				}

				tenantApplicationRouteSegments.forEach((tenantApplicationRouteSegment, segidx) => {
					if(segidx === tenantApplicationRouteSegments.length - 1) return;

					if(segidx === tenantApplicationRouteSegments.length - 2) {
						promiseResolutions.push(renderer(routerHandlerPath, { 'routeName': tenantApplicationRouteSegments.slice(0, (idx + 1)).join('/') + '/index', 'routePath': tenantApplicationRoute }));
						return;
					}

					promiseResolutions.push(renderer(routerHandlerPath, { 'routeName': tenantApplicationRouteSegments.slice(0, (idx + 1)).join('/') + '/index', 'routePath': tenantApplicationRouteSegments.slice(0, (idx + 2)).join('.') }));
				});
			});

			return promises.all(promiseResolutions);
		})
		.then((tenantApplicationRouteHandlers) => {
			if(callback) callback(null, tenantApplicationRouteHandlers);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_getEmberControllers(tenant, user, mediaType, renderer, tenantApplications, callback) {
		const path = require('path');
		const controllerPath = path.join(this.basePath, `ember/controllers/default.ejs`);

		const _getScreenComponentParameters = function(screenContent) {
			const inflection = require('inflection');

			const componentSelectorRegex = new RegExp(/\{\{component ([^}]+)\}\}/, 'gi'),
				controllerFields = [];

			let htmlComponents;
			while((htmlComponents = componentSelectorRegex.exec(screenContent)) !== null) {
				htmlComponents.forEach((htmlComponent) => {
					if(htmlComponent.trim().indexOf('{{') >= 0)
						return;

					htmlComponent = htmlComponent.split(' ');
					htmlComponent.forEach((componentPart) => {
						if(componentPart.indexOf('=') < 0)
							return;

						if(componentPart.indexOf('layout') >= 0)
							return;

						if(componentPart.indexOf('model') >= 0)
							return;

						if(componentPart.indexOf('controller-action') >= 0)
							return;

						componentPart = componentPart.trim().replace(/"/g, '').split('=');
						componentPart[1] = inflection.dasherize(componentPart[1]).toLowerCase();
						if(controllerFields.indexOf(componentPart[1]) >= 0)
							return;

						controllerFields.push(componentPart[1]);
					});
				});
			}

			return controllerFields;
		};

		const _generateControllerForMenuItem = function(application, prepender, parentMenuItem, controllerArray) {
			parentMenuItem.menuItems.forEach((menuItem) => {
				if(menuItem.screen) {
					application.screens.forEach((screen, idx) => {
						if(screen.id !== menuItem.screen)
							return;

						const screenComponentParameters = _getScreenComponentParameters(application.files[idx]);
						controllerArray.push({
							'tenantFolder': application.tenant_folder,
							'applicationName': application.name,
							'screenName': screen.name,
							'controllerName': [prepender, screen.id].join('/'),
							'controllerFields': screenComponentParameters
						});
					});
				}

				_generateControllerForMenuItem(application, [prepender, menuItem.screen || menuItem.id].join('/'), menuItem, controllerArray);
			});
		};

		this._dummyAsync()
		.then(() => {
			const tenantApplicationControllers = [];
			tenantApplications.forEach((tenantApplication) => {
				tenantApplication.organized_menus.forEach((menu) => {
					_generateControllerForMenuItem(tenantApplication, [tenantApplication.id, menu.menuId].join('/'), menu, tenantApplicationControllers);
				});

				// Heaven knows what the App Developer is trying to accomplish, but hey...
				const unusedScreens = tenantApplication.screens.filter((screen) => {
					return !screen.associated_menu;
				});

				unusedScreens.forEach((screen, idx) => {
					const screenComponentParameters = _getScreenComponentParameters(tenantApplication.files[idx]);
					tenantApplicationControllers.push({
						'tenantFolder': tenantApplication.tenant_folder,
						'applicationName': tenantApplication.name,
						'screenName': screen.name,
						'controllerName': [tenantApplication.id, tenantApplication.screens[idx].id].join('/'),
						'controllerFields': screenComponentParameters
					});
				});
			});

			return tenantApplicationControllers;
		})
		.then((tenantApplicationControllers) => {
			const inflection = require('inflection');
			const rootPath = path.dirname(require.main.filename);

			const promiseResolutions = [];
			tenantApplicationControllers.forEach((tenantApplicationController) => {
				const thisControllerPath = path.join(rootPath, this.$config.tenantApplicationPath, tenant, inflection.dasherize(tenantApplicationController.applicationName).toLowerCase(), 'controllers', inflection.dasherize(tenantApplicationController.screenName).toLowerCase() + '.ejs');
				promiseResolutions.push(renderer.bind(this, thisControllerPath, tenantApplicationController));
			});

			promiseResolutions.push(tenantApplicationControllers);
			return promises.reduce(promiseResolutions, (result, renderFn) => {
				if(typeof renderFn !== 'function') {
					result.push(renderFn);
					return result;
				}

				return renderFn()
				.then((renderedController) => {
					result.push(renderedController);
					return result;
				})
				.catch(() => {
					result.push(undefined);
					return result;
				});
			}, []);
		})
		.then((renderedControllers) => {
			const inflection = require('inflection');
			const tenantApplicationControllers = renderedControllers.pop();

			const rootPath = path.dirname(require.main.filename);
			const promiseResolutions = [];

			tenantApplicationControllers.forEach((tenantApplicationController, idx) => {
				if(!!renderedControllers[idx]) {
					promiseResolutions.push(renderedControllers[idx]);
					return;
				}

				if(tenantApplicationController.tenantFolder === tenant) {
					promiseResolutions.push(undefined);
					return;
				}

				const thisControllerPath = path.join(rootPath, this.$config.tenantApplicationPath, tenantApplicationController.tenantFolder, inflection.dasherize(tenantApplicationController.applicationName).toLowerCase(), 'controllers', inflection.dasherize(tenantApplicationController.screenName).toLowerCase() + '.ejs');
				promiseResolutions.push(renderer.bind(this, thisControllerPath, tenantApplicationController));
			});

			promiseResolutions.push(tenantApplicationControllers);
			return promises.reduce(promiseResolutions, (result, renderFn) => {
				if(typeof renderFn !== 'function') {
					result.push(renderFn);
					return result;
				}

				return renderFn()
				.then((renderedController) => {
					result.push(renderedController);
					return result;
				})
				.catch(() => {
					result.push(undefined);
					return result;
				});
			}, []);
		})
		.then((renderedControllers) => {
			const tenantApplicationControllers = renderedControllers.pop();

			const promiseResolutions = [];
			tenantApplicationControllers.forEach((tenantApplicationController, idx) => {
				if(!!renderedControllers[idx]) {
					promiseResolutions.push(renderedControllers[idx]);
					return;
				}

				promiseResolutions.push(renderer(controllerPath, tenantApplicationController));
			});

			return promises.all(promiseResolutions);
		})
		.then((tenantApplicationControllers) => {
			if(callback) callback(null, tenantApplicationControllers);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_getEmberModels(tenant, user, mediaType, renderer, tenantApplications, callback) {
		super._getEmberModels(tenant, user, mediaType, renderer, callback);
	}

	_getEmberComponents(tenant, user, mediaType, renderer, tenantApplications, callback) {
		const _ = require('lodash'),
			fs = require('fs-extra'),
			path = require('path');

		const filesystem = promises.promisifyAll(fs);
		const loggerSrvc = this.$dependencies.LoggerService;

		this._dummyAsync()
		.then(() => {
			const components = _.map(user.modules[this.name], 'ember_component'),
				promiseResolutions = [];

			components.forEach((component) => {
				promiseResolutions.push(filesystem.readFileAsync(path.join(this.basePath, `ember/components/${component}.js`), 'utf8'));
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

	_getEmberComponentHTMLs(tenant, user, mediaType, renderer, tenantApplications, callback) {
		const _generateScreenForMenuItem = function(application, prepender, parentMenuItem, templateArray) {
			const cheerio = require('cheerio'),
				htmlEntities = require('html-entities').AllHtmlEntities;

			parentMenuItem.menuItems.forEach((menuItem) => {
				if(menuItem.screen) {
					application.screens.forEach((screen, idx) => {
						if(screen.id !== menuItem.screen)
							return;

						const $ = cheerio.load(application.files[idx]);
						$('div[type="text/x-handlebars"]').attr('data-template-name', [prepender, screen.id].join('/'));

						templateArray.push(htmlEntities.decode($.root().html()));
					});
				}
				else {
					const dataTmplName = [prepender, menuItem.id].join('/');
					templateArray.push(`<div type="text/x-handlebars" data-template-name="${dataTmplName}">{{outlet}}</div>`);
				}

				_generateScreenForMenuItem(application, [prepender, menuItem.screen || menuItem.id].join('/'), menuItem, templateArray);
			});
		};

		this._dummyAsync()
		.then(() => {
			const tenantApplicationFiles = [];
			tenantApplications.forEach((tenantApplication) => {
				tenantApplicationFiles.push(`<div type="text/x-handlebars" data-template-name="${tenantApplication.id}">{{outlet}}</div>`);

				tenantApplication.organized_menus.forEach((menu) => {
					tenantApplicationFiles.push(`<div type="text/x-handlebars" data-template-name="${tenantApplication.id}/${menu.menuId}">{{outlet}}</div>`);
					_generateScreenForMenuItem(tenantApplication, [tenantApplication.id, menu.menuId].join('/'), menu, tenantApplicationFiles);
				});

				// Heaven knows what the App Developer is trying to accomplish, but hey...
				const unusedScreens = tenantApplication.screens.filter((screen) => {
					return !screen.associated_menu;
				});

				const cheerio = require('cheerio'),
					htmlEntities = require('html-entities').AllHtmlEntities;

				unusedScreens.forEach((screen, idx) => {
					const $ = cheerio.load(tenantApplication.files[idx]);
					$('div[type="text/x-handlebars"]').attr('data-template-name', [tenantApplication.id, screen.id].join('/'));

					tenantApplicationFiles.push(htmlEntities.decode($.root().html()));
				});
			});

			return tenantApplicationFiles;
		})
		.then((componentHTMLs) => {
			const _ = require('lodash'),
				fs = require('fs-extra'),
				path = require('path');

			const filesystem = promises.promisifyAll(fs);
			const componentFiles = _.map(user.modules[this.name], 'ember_templates');
			let components = [];

			componentFiles.forEach((componentFile) => {
				components = components.concat(componentFile);
			});

			components.forEach((component) => {
				componentHTMLs.push(filesystem.readFileAsync(path.join(this.basePath, `ember/componentHTMLs/${component}.ejs`), 'utf8'));
			});

			return promises.all(componentHTMLs);
		})
		.then((componentHTMLs) => {
			if(callback) callback(null, componentHTMLs);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_getEmberServices(tenant, user, mediaType, renderer, tenantApplications, callback) {
		super._getEmberServices(tenant, user, mediaType, renderer, callback);
	}

	_getEmberHelpers(tenant, user, mediaType, renderer, tenantApplications, callback) {
		super._getEmberHelpers(tenant, user, mediaType, renderer, callback);
	}

	_loadTenantApplication(tenant, mediaType, tenantApplication, callback) {
		const fs = require('fs-extra'),
			inflection = require('inflection'),
			path = require('path');

		const filesystem = promises.promisifyAll(fs);
		const rootPath = path.dirname(require.main.filename);
		const tenantApplicationDirname = path.isAbsolute(this.$config.tenantApplicationPath) ? this.$config.tenantApplicationPath : path.join(rootPath, this.$config.tenantApplicationPath);
		let tenantApplicationPath = path.join(tenantApplicationDirname, tenant, mediaType, inflection.dasherize(tenantApplication.name).toLowerCase(), 'templates');

		this._dummyAsync()
		// Step 1: Check to ensure that the screens are present on the filesystem at the correct location
		.then(() => {
			const promiseResolutions = [];

			tenantApplication.screens.forEach((screen) => {
				promiseResolutions.push(filesystem.readFileAsync.bind(filesystem, path.join(tenantApplicationPath, inflection.dasherize(screen.name).toLowerCase()) + '.hbs'));
			});

			return promises.reduce(promiseResolutions, (result, readFileFn) => {
				return readFileFn()
				.then((screenContent) => {
					result.push(screenContent);
					return result;
				})
				.catch(() => {
					result.push(undefined);
					return result;
				});
			}, []);
		})
		.then((results) => {
			tenantApplicationPath = path.join(rootPath, this.$config.tenantApplicationPath, tenantApplication.tenant_folder, mediaType, inflection.dasherize(tenantApplication.name).toLowerCase(), 'templates');

			tenantApplication.screens.forEach((screen, idx) => {
				if(results[idx]) return;
				if(tenantApplication.tenant_folder === tenant) return;

				results[idx] = filesystem.readFileAsync.bind(filesystem, path.join(tenantApplicationPath, inflection.dasherize(screen.name).toLowerCase()) + '.hbs');
			});

			return promises.reduce(results, (result, readFileFn) => {
				if(typeof readFileFn !== 'function') {
					result.push(readFileFn);
					return result;
				}

				return readFileFn()
				.then((screenContent) => {
					result.push(screenContent);
					return result;
				})
				.catch(() => {
					result.push(undefined);
					return result;
				});
			}, []);
		})
		// Step 2: Read the existing screens into memory, and remove references to non-existing ones
		.then((results) => {
			tenantApplication.screens = tenantApplication.screens.filter((screen, idx) => {
				return !!results[idx];
			});

			const cheerio = require('cheerio'),
				htmlEntities = require('html-entities').AllHtmlEntities;

			const screens = results.filter((result) => { return !!result; });
			screens.forEach((screen, idx) => {
				const $ = cheerio.load(screen);

				$('div[type="text/x-handlebars"]').attr('data-template-name', tenantApplication.screens[idx].id);
				screens[idx] = htmlEntities.decode($.root().html());
			});

			tenantApplication.files = screens;
		})
		// Finally, return the modified tenant application object
		.then(() => {
			if(callback) callback(null, tenantApplication);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_removeUnauthorizedTenantApplicationScreens(user, tenantApplication, renderer, callback) {
		this._dummyAsync()
		.then(() => {
			const promiseResolutions = [];
			tenantApplication.files.forEach((file) => {
				promiseResolutions.push(this._processScreenAsync(user, file, renderer));
			});

			return promises.all(promiseResolutions);
		})
		.then((processedScreens) => {
			const screensToBeRemoved = [];
			processedScreens = processedScreens.filter((processedScreen, idx) => {
				if(!processedScreen) screensToBeRemoved.push(idx);
				return !!processedScreen;
			});

			screensToBeRemoved.reverse();
			screensToBeRemoved.forEach((screenIdx) => {
				tenantApplication.screens.splice(screenIdx, 1);
			});

			tenantApplication.files = processedScreens;
			if(callback) callback(null, tenantApplication);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_markUnusedTenantApplicationScreens(tenantApplication, callback) {
		this._dummyAsync()
		.then(() => {
			tenantApplication.screens.forEach((screen) => {
				const associatedMenuItem = tenantApplication.menus.filter((menuItem) => {
					return menuItem.screen === screen.id;
				})[0];

				screen.associated_menu = !!associatedMenuItem;
			});

			if(callback) callback(null, tenantApplication);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_reorganizeTenantApplicationMenus(tenantApplication, callback) {
		// FIXIT: This is a super-non-optimized solution! Basically, crap!!
		// Figure out a better way to do this when the time comes...
		const _organizeModuleMenus = function(menuItems, menuId, parentItem) {
			const relevantMenuItems = menuItems.filter((menuItem) => {
				if(menuItem.menu !== menuId)
					return false;

				if(menuItem.parent !== parentItem)
					return false;

				return true;
			});

			const routes = [];
			relevantMenuItems.forEach((relevantMenuItem) => {
				const subMenu = {
					'id': relevantMenuItem.id,
					'name': relevantMenuItem.display_text,
					'screen': relevantMenuItem.screen,
					'menuItems': _organizeModuleMenus(menuItems, menuId, relevantMenuItem.id)
				};

				routes.push(subMenu);
			});

			return routes;
		};

		const tenantApplicationMenuIds = [],
			tenantApplicationMenuNames = [];

		tenantApplication.menus.forEach((menuItem) => {
			if(tenantApplicationMenuIds.indexOf(menuItem.menu) >= 0)
				return;

			tenantApplicationMenuIds.push(menuItem.menu);
			tenantApplicationMenuNames.push(menuItem.menu_name);
		});

		const reOrgedMenus = [];
		tenantApplicationMenuIds.forEach((tenantApplicationMenuId, idx) => {
			reOrgedMenus.push({
				'menuId': tenantApplicationMenuId,
				'menuName': tenantApplicationMenuNames[idx],
				'menuItems': _organizeModuleMenus(tenantApplication.menus, tenantApplicationMenuId, null)
			});
		});

		tenantApplication.organized_menus = reOrgedMenus;
		if(callback) callback(null, tenantApplication);
	}

	_removeUnusedTenantApplicationMenus(tenantApplication, callback) {
		const _pruneUnusedMenuItems = function(parentMenuItem, availableScreens, removedMenuItems) {
			parentMenuItem.menuItems = parentMenuItem.menuItems.filter((menuItem) => {
				let isValidMenuItem = true;

				if(menuItem.screen) {
					const isScreenAvailable = availableScreens.filter((availableScreen) => {
						return availableScreen.id === menuItem.screen;
					});

					isValidMenuItem = !!isScreenAvailable.length;
				}

				_pruneUnusedMenuItems(menuItem, availableScreens, removedMenuItems);
				isValidMenuItem = isValidMenuItem || !!menuItem.menuItems.length;

				if(!isValidMenuItem) removedMenuItems.push(menuItem.id);
				return isValidMenuItem;
			});
		};

		const removedMenuItems = [];
		tenantApplication.organized_menus.forEach((tenantApplicationMenu) => {
			_pruneUnusedMenuItems(tenantApplicationMenu, tenantApplication.screens, removedMenuItems);
		});

		tenantApplication.menus = tenantApplication.menus.filter((menuItem) => {
			return removedMenuItems.indexOf(menuItem.id) < 0;
		});

		if(callback) callback(null, tenantApplication);
	}

	_createEmberRoutesFromOrganizedMenus(tenantApplication) {
		const inflection = require('inflection'),
			path = require('path');

		const _createEmberRoutesFromOrganizedMenuItems = function(menuItems) {
			let menuItemRouteMap = '';

			menuItems.forEach((menuItem, idx) => {
				const menuPath = path.join('/', inflection.dasherize(menuItem.name).toLowerCase());

				if(menuItem.screen) {
					if(menuItem.menuItems && menuItem.menuItems.length)
						menuItemRouteMap += `\nthis.route('${menuItem.screen}', { 'path': '${menuPath}' }, function() {\n	this.route('index', { 'path': '/' });\n	` + _createEmberRoutesFromOrganizedMenuItems(menuItem.menuItems) + `\n});`;
					else
						menuItemRouteMap += `this.route('${menuItem.screen}', { 'path': '${menuPath}' });`;
				}
				else
					menuItemRouteMap += `\nthis.route('${menuItem.id}', { 'path': '${menuPath}' }, function() {\n	this.route('index', { 'path': '/' });\n	` + _createEmberRoutesFromOrganizedMenuItems(menuItem.menuItems) + `\n});`;

				if(idx < menuItems.length - 1)
					menuItemRouteMap += '\n';
			});

			return menuItemRouteMap.replace(/\n/g, '\n\t');
		};

		let menuRouteMap = '';
		tenantApplication.organized_menus.forEach((menu) => {
			const menuPath = path.join('/', inflection.dasherize(menu.menuName).toLowerCase());
			menuRouteMap += `	this.route('${menu.menuId}', { 'path': '${menuPath}' }, function() {\n	this.route('index', { 'path': '/' });\n	` + _createEmberRoutesFromOrganizedMenuItems(menu.menuItems) + `\n});`;
		});

		if(menuRouteMap.trim() !== '')
			menuRouteMap = `	// Application Menu(s) Routes\n` + menuRouteMap.replace(/\n/g, '\n\t');

		// Heaven knows what the App Developer is trying to accomplish, but hey...
		const unusedScreens = tenantApplication.screens.filter((screen) => {
			return !screen.associated_menu;
		});

		let unusedScreenRouteMap = '';
		if(unusedScreens.length) {
			unusedScreenRouteMap += `	// Screens that don't have associated menu items\n`;
			unusedScreens.forEach((screen, sIdx) => {
				unusedScreenRouteMap += `this.route('${screen.id}', { 'path': '/${inflection.dasherize(screen.name).toLowerCase()}' });`;
				if(sIdx < unusedScreens.length - 1) unusedScreenRouteMap += '\n';
			});
		}

		const tenantApplicationMenuPath = path.join('/', inflection.dasherize(tenantApplication.name).toLowerCase());
		let emberRouteMap = `// ${tenantApplication.name} Application Routes\nthis.route('${tenantApplication.id}', { 'path': '${tenantApplicationMenuPath}' }, function() {\n`;

		emberRouteMap += `	// Default Index Route - just for form's sake\n	this.route('index', { 'path': '/' });\n`;

		if(menuRouteMap.trim() !== '') emberRouteMap += '\n' + menuRouteMap.replace(/\\n/g, '\n\t') + '\n';
		if(unusedScreenRouteMap.trim() !== '') emberRouteMap += '\n' + unusedScreenRouteMap.replace(/\n/g, '\n\t') + '\n';

		emberRouteMap += `});`;
		return emberRouteMap;
	}

	_processScreen(user, screen, renderer, callback) {
		const htmlEntities = require('html-entities').AllHtmlEntities;

		const $ = require('cheerio').load(screen),
			relevantElements = $('.twyr-design');

		const promiseResolutions = [];

		const _removeEmptyNodes = function(screenClone, domElement) {
			if(!domElement) return;

			domElement = screenClone(domElement);
			if(domElement.tagName === 'script')
				return;

			let domHTML = domElement.html().replace('&#xA0;', '').trim(),
				domText = domElement.text().replace('&#xA0;', '').trim();

			if(domHTML === '' && domText === '') {
				domElement.remove();
				return;
			}

			domElement.children().each((idx, content) => {
				_removeEmptyNodes(screenClone, content);
			});

			domHTML = domElement.html().replace('&#xA0;', '').trim();
			domText = domElement.text().replace('&#xA0;', '').trim();

			if(domHTML === '' && domText === '')
				domElement.remove();
		};

		this._dummyAsync()
		.then(() => {
			relevantElements.each((idx, relevantElement) => {
				relevantElement = $(relevantElement);

				let relevantHelper = this.$helpers;
				while(relevantHelper && typeof relevantHelper !== 'function') {
					const availHelpers = Object.keys(relevantHelper),
						currRelevantHelper = relevantHelper;

					for(const availHelper of availHelpers) {
						if(!relevantElement.hasClass(availHelper))
							continue;

						relevantHelper = relevantHelper[availHelper];
						break;
					}

					if(relevantHelper === currRelevantHelper)
						break;
				}

				if(!relevantHelper || typeof relevantHelper !== 'function')
					return;

				promiseResolutions.push(relevantHelper(relevantElement, user));
			});

			return promises.all(promiseResolutions);
		})
		.then(() => {
			const minify = require('html-minifier').minify;

			const screenClone = require('cheerio').load(minify($.root().html(), {
				'collapseWhitespace': true,
				'removeComments': true,
				'removeEmptyAttributes': true,
				'removeEmptyElements': true
			}));

			_removeEmptyNodes(screenClone, screenClone.root());
			if(callback) {
				callback(null, screenClone.root().contents().length ? htmlEntities.decode(minify($.root().html(), {
					'collapseWhitespace': true,
					'removeComments': true,
					'removeEmptyAttributes': true,
					'removeEmptyElements': false
				})) : null);
			}
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	get basePath() { return __dirname; }
}

exports.component = Applications;
