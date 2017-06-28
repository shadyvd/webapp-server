/**
 * @file      server/TwyrModuleLoader.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application dependency manager and service/component loader
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
const EventEmitter = require('events');

class TwyrModuleLoader extends EventEmitter {
	constructor(module) {
		super();

		// Sanity Check: The module itself must be valid...
		if(!module.name || !module.dependencies)
			return;

		if(!module.load || !module.initialize || !module.start || !module.stop || !module.uninitialize || !module.unload)
			return;

		Object.defineProperty(this, '$module', {
			'__proto__': null,
			'value': module
		});
	}

	load(configSrvc, basePath, callback) {
		Object.defineProperty(this, '$basePath', {
			'__proto__': null,
			'value': basePath
		});

		if(!this.$locale) {
			Object.defineProperty(this, '$locale', {
				'__proto__': null,
				'value': this.$module ? this.$module.locale : 'en'
			});
		}

		const finalStatus = [];
		this._dummyAsync()
		.then(() => {
			return this._loadUtilitiesAsync(configSrvc);
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._loadServicesAsync(configSrvc);
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._loadMiddleWaresAsync(configSrvc || this.$module.$services.ConfigurationService.Interface);
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._loadComponentsAsync(configSrvc || this.$module.$services.ConfigurationService.Interface);
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._loadTemplatesAsync(configSrvc || this.$module.$services.ConfigurationService.Interface);
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${this.$module.name}::load error: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	initialize(callback) {
		const finalStatus = [];

		this._dummyAsync()
		.then(() => {
			return this._initializeServicesAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._initializeMiddleWaresAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._initializeComponentsAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._initializeTemplatesAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${this.$module.name}::initialize error: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	start(callback) {
		const finalStatus = [];

		this._dummyAsync()
		.then(() => {
			return this._startServicesAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._startMiddleWaresAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._startComponentsAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._startTemplatesAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${this.$module.name}::start error: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	stop(callback) {
		const finalStatus = [];

		this._dummyAsync()
		.then(() => {
			return this._stopTemplatesAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._stopComponentsAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._stopMiddleWaresAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._stopServicesAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${this.$module.name}::stop error: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	uninitialize(callback) {
		const finalStatus = [];

		this._dummyAsync()
		.then(() => {
			return this._uninitializeTemplatesAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._uninitializeComponentsAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._uninitializeMiddleWaresAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._uninitializeServicesAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${this.$module.name}::uninitialize error: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	unload(callback) {
		const finalStatus = [];

		this._dummyAsync()
		.then(() => {
			return this._unloadTemplatesAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._unloadComponentsAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._unloadMiddleWaresAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._unloadServicesAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			return this._unloadUtilitiesAsync();
		})
		.then((status) => {
			if(!status) throw status;
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${this.$module.name}::unload error: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	_loadUtilities(configSrvc, callback) {
		this._dummyAsync()
		.then(() => {
			if(!this.$module.$utilities)
				this.$module.$utilities = {};

			if(!(this.$module.$config && this.$module.$config.utilities && this.$module.$config.utilities.path)) {
				if(callback) callback(null, { 'type': 'utilities', 'status': null });
				return;
			}

			const path = require('path');
			return this._findFilesAsync(path.join(this.$basePath, this.$module.$config.utilities.path), 'utility.js');
		})
		.then((definedUtilities) => {
			for(const definedUtility of definedUtilities) {
				const utility = require(definedUtility).utility;
				if(!utility) continue;

				if(!utility.name || !utility.method)
					continue;

				this.$module.$utilities[utility.name] = utility.method.bind(this.$module);
				if(utility.isAsync)
					this.$module.$utilities[`${utility.name}Async`] = promises.promisify(utility.method.bind(this.$module));
			}

			if(callback) callback(null, { 'type': 'utilities', 'status': Object.keys(this.$module.$utilities).length ? Object.keys(this.$module.$utilities) : null });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_loadServices(configSrvc, callback) {
		let actualConfigSrvc = configSrvc;

		this._dummyAsync()
		.then(() => {
			if(!this.$module.$services) this.$module.$services = {};

			if(!(this.$module.$config && this.$module.$config.services && this.$module.$config.services.path)) {
				if(callback) callback(null, { 'type': 'services', 'status': null });
				return;
			}

			const path = require('path');
			return this._findFilesAsync(path.join(this.$basePath, this.$module.$config.services.path), 'service.js');
		})
		.then((definedServices) => {
			const configSrvcResolution = [];
			if(!actualConfigSrvc) {
				for(const definedService of definedServices) {
					// Check validity of the definition...
					const Service = require(definedService).service;
					if(!Service) continue;

					if(!Service.prototype.load || !Service.prototype.initialize || !Service.prototype.start || !Service.prototype.stop || !Service.prototype.uninitialize || !Service.prototype.unload)
						continue;

					if(!Service.prototype.name || !Service.prototype.dependencies)
						continue;

					if(Service.prototype.name !== 'ConfigurationService')
						continue;

					// Ok... valid definition. Construct the service
					actualConfigSrvc = new Service(this.$module);
					actualConfigSrvc.$dependants = [];

					// Store the promisified object...
					this.$module.$services[actualConfigSrvc.name] = promises.promisifyAll(actualConfigSrvc, {
						'filter': () => {
							return true;
						}
					});
				}

				if(actualConfigSrvc) configSrvcResolution.push(actualConfigSrvc.loadAsync(null));
			}

			configSrvcResolution.push(definedServices);
			return promises.all(configSrvcResolution);
		})
		.then((results) => {
			const definedServices = results.pop(),
				promiseResolutions = [],
				serviceNames = [];

			for(const definedService of definedServices) {
				// Check validity of the definition...
				const Service = require(definedService).service;
				if(!Service) continue;

				if(!Service.prototype.load || !Service.prototype.initialize || !Service.prototype.start || !Service.prototype.stop || !Service.prototype.uninitialize || !Service.prototype.unload)
					continue;

				if(!Service.prototype.name || !Service.prototype.dependencies)
					continue;

				if(Service.prototype.name === 'ConfigurationService')
					continue;

				// Ok... valid definition. Construct the service
				const serviceInstance = new Service(this.$module);
				serviceInstance.$dependants = [];

				// Store the promisified object...
				this.$module.$services[serviceInstance.name] = promises.promisifyAll(serviceInstance, {
					'filter': () => {
						return true;
					}
				});

				serviceNames.push(serviceInstance.name);
				promiseResolutions.push(serviceInstance.loadAsync(actualConfigSrvc));
			}

			if(results.length) {
				serviceNames.unshift('ConfigurationService');
				promiseResolutions.unshift(results[0]);
			}

			return this._processPromisesAsync(serviceNames, promiseResolutions);
		})
		.then((result) => {
			if(callback) callback(null, { 'type': 'services', 'status': result });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err, { 'type': 'services', 'status': err });
		});
	}

	_loadMiddleWares(configSrvc, callback) {
		this._dummyAsync()
		.then(() => {
			if(!this.$module.$middlewares) this.$module.$middlewares = {};

			if(!(this.$module.$config && this.$module.$config.middlewares && this.$module.$config.middlewares.path)) {
				if(callback) callback(null, { 'type': 'middlewares', 'status': null });
				return;
			}

			const path = require('path');
			return this._findFilesAsync(path.join(this.$basePath, this.$module.$config.middlewares.path), 'middleware.js');
		})
		.then((definedMiddlewares) => {
			const middlewareNames = [],
				promiseResolutions = [];

			for(const definedMiddleware of definedMiddlewares) {
				// Check validity of the definition...
				const Middleware = require(definedMiddleware).middleware;
				if(!Middleware) continue;

				if(!Middleware.prototype.load || !Middleware.prototype.initialize || !Middleware.prototype.start || !Middleware.prototype.stop || !Middleware.prototype.uninitialize || !Middleware.prototype.unload)
					continue;

				if(!Middleware.prototype.name || !Middleware.prototype.dependencies)
					continue;

				// Ok... valid definition. Construct the middleware
				const middlewareInstance = new Middleware(this.$module);

				// Store the promisified object...
				this.$module.$middlewares[middlewareInstance.name] = promises.promisifyAll(middlewareInstance, {
					'filter': () => {
						return true;
					}
				});

				middlewareNames.push(middlewareInstance.name);
				promiseResolutions.push(middlewareInstance.loadAsync(configSrvc));
			}

			return this._processPromisesAsync(middlewareNames, promiseResolutions);
		})
		.then((result) => {
			if(callback) callback(null, { 'type': 'middlewares', 'status': result });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err, { 'type': 'middlewares', 'status': err });
		});
	}

	_loadComponents(configSrvc, callback) {
		this._dummyAsync()
		.then(() => {
			if(!this.$module.$components) this.$module.$components = {};

			if(!(this.$module.$config && this.$module.$config.components && this.$module.$config.components.path)) {
				if(callback) callback(null, { 'type': 'components', 'status': null });
				return;
			}

			const path = require('path');
			return this._findFilesAsync(path.join(this.$basePath, this.$module.$config.components.path), 'component.js');
		})
		.then((definedComponents) => {
			const componentNames = [],
				promiseResolutions = [];

			for(const definedComponent of definedComponents) {
				// Check validity of the definition...
				const Component = require(definedComponent).component;
				if(!Component) continue;

				if(!Component.prototype.load || !Component.prototype.initialize || !Component.prototype.start || !Component.prototype.stop || !Component.prototype.uninitialize || !Component.prototype.unload)
					continue;

				if(!Component.prototype.name || !Component.prototype.dependencies)
					continue;

				// Ok... valid definition. Construct the component
				const componentInstance = new Component(this.$module);

				// Store the promisified object...
				this.$module.$components[componentInstance.name] = promises.promisifyAll(componentInstance, {
					'filter': () => {
						return true;
					}
				});

				componentNames.push(componentInstance.name);
				promiseResolutions.push(componentInstance.loadAsync(configSrvc));
			}

			return this._processPromisesAsync(componentNames, promiseResolutions);
		})
		.then((result) => {
			if(callback) callback(null, { 'type': 'components', 'status': result });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err, { 'type': 'components', 'status': err });
		});
	}

	_loadTemplates(configSrvc, callback) {
		this._dummyAsync()
		.then(() => {
			if(!this.$module.$templates) this.$module.$templates = {};

			if(!(this.$module.$config && this.$module.$config.templates && this.$module.$config.templates.path)) {
				if(callback) callback(null, { 'self': this.$module.name, 'type': 'templates', 'status': null });
				return;
			}

			const path = require('path');
			return this._findFilesAsync(path.join(this.$basePath, this.$module.$config.templates.path), 'template.js');
		})
		.then((definedTemplates) => {
			const promiseResolutions = [],
				templateNames = [];

			for(const definedTemplate of definedTemplates) {
				// Check validity of the definition...
				const Template = require(definedTemplate).template;
				if(!Template) continue;

				if(!Template.prototype.load || !Template.prototype.initialize || !Template.prototype.start || !Template.prototype.stop || !Template.prototype.uninitialize || !Template.prototype.unload)
					continue;

				if(!Template.prototype.name || !Template.prototype.dependencies)
					continue;

				// Ok... valid definition. Construct the template
				const templateInstance = new Template(this.$module);

				// Store the promisified object...
				this.$module.$templates[templateInstance.name] = promises.promisifyAll(templateInstance, {
					'filter': () => {
						return true;
					}
				});

				templateNames.push(templateInstance.name);
				promiseResolutions.push(templateInstance.loadAsync(configSrvc));
			}

			return this._processPromisesAsync(templateNames, promiseResolutions);
		})
		.then((result) => {
			if(callback) callback(null, { 'type': 'templates', 'status': result });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err, { 'type': 'templates', 'status': err });
		});
	}

	_initializeServices(callback) {
		this._dummyAsync()
		.then(() => {
			const promiseResolutions = [],
				serviceNames = Object.keys(this.$module.$services || {});

			serviceNames.forEach((serviceName) => {
				const thisService = this.$module.$services[serviceName];
				promiseResolutions.push(thisService.initializeAsync());
			});

			return this._processPromisesAsync(serviceNames, promiseResolutions);
		})
		.then((status) => {
			if(callback) callback(null, { 'type': 'services', 'status': status });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err, { 'type': 'services', 'status': err });
		});
	}

	_initializeMiddleWares(callback) {
		this._dummyAsync()
		.then(() => {
			const middlewareNames = Object.keys(this.$module.$middlewares || {}),
				promiseResolutions = [];

			middlewareNames.forEach((middlewareName) => {
				const thisMiddleware = this.$module.$middlewares[middlewareName];
				promiseResolutions.push(thisMiddleware.initializeAsync());
			});

			return this._processPromisesAsync(middlewareNames, promiseResolutions);
		})
		.then((status) => {
			if(callback) callback(null, { 'type': 'middlewares', 'status': status });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err, { 'type': 'middlewares', 'status': err });
		});
	}

	_initializeComponents(callback) {
		this._dummyAsync()
		.then(() => {
			const componentNames = Object.keys(this.$module.$components || {}),
				promiseResolutions = [];

			componentNames.forEach((componentName) => {
				const thisComponent = this.$module.$components[componentName];
				promiseResolutions.push(thisComponent.initializeAsync());
			});

			return this._processPromisesAsync(componentNames, promiseResolutions);
		})
		.then((status) => {
			if(callback) callback(null, { 'type': 'components', 'status': status });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err, { 'type': 'components', 'status': err });
		});
	}

	_initializeTemplates(callback) {
		this._dummyAsync()
		.then(() => {
			const promiseResolutions = [],
				templateNames = Object.keys(this.$module.$templates || {});

			templateNames.forEach((templateName) => {
				const thisTemplate = this.$module.$templates[templateName];
				promiseResolutions.push(thisTemplate.initializeAsync());
			});

			return this._processPromisesAsync(templateNames, promiseResolutions);
		})
		.then((status) => {
			if(callback) callback(null, { 'type': 'templates', 'status': status });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err, { 'type': 'templates', 'status': err });
		});
	}

	_startServices(callback) {
		this._dummyAsync()
		.then(() => {
			const DepGraph = require('dependency-graph').DepGraph;

			const initOrder = new DepGraph(),
				promiseResolutions = [];

			const serviceNames = Object.keys(this.$module.$services || {});
			serviceNames.forEach((serviceName) => {
				initOrder.addNode(serviceName);
			});

			serviceNames.forEach((serviceName) => {
				const thisService = this.$module.$services[serviceName];
				if(!thisService.dependencies.length) return;

				thisService.dependencies.forEach((thisServiceDependency) => {
					if(serviceNames.indexOf(thisServiceDependency) < 0) return;
					initOrder.addDependency(thisService.name, thisServiceDependency);
				});
			});

			const initOrderList = initOrder.overallOrder();

			serviceNames.length = 0;
			initOrderList.forEach((serviceName) => {
				serviceNames.push(serviceName);
				promiseResolutions.push(this._startSingleServiceAsync.bind(this, serviceName));
			});

			// Start Services one after the other
			return promises.reduce(promiseResolutions, (result, serviceStart) => {
				return serviceStart()
				.then((status) => {
					result.push(status);
					return result;
				})
				.catch((err) => {
					result.push(err);
					return result;
				});
			}, [serviceNames]);
		})
		// Wait for the services to start...
		.then((startStatuses) => {
			const serviceNames = startStatuses.shift();
			return this._processPromisesAsync(serviceNames, startStatuses);
		})
		.then((result) => {
			if(callback) callback(null, { 'type': 'services', 'status': result });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err, { 'type': 'services', 'status': err });
		});
	}

	_startSingleService(serviceName, callback) {
		const thisService = this.$module.$services[serviceName];
		const thisServiceDependencies = {};

		this._dummyAsync()
		.then(() => {
			thisService.dependencies.forEach((thisServiceDependency) => {
				let currentDependency = null,
					currentModule = this.$module;

				while(!!currentModule && !currentDependency) {
					if(!currentModule.$services) {
						currentModule = currentModule.$module;
						continue;
					}

					currentDependency = currentModule.$services[thisServiceDependency];
					if(!currentDependency)
						currentModule = currentModule.$module;
					else
						break;
				}

				if(!currentDependency) throw new Error(`${thisService.name}::dependency::${thisServiceDependency} not found!`);

				const interfaceMethod = function() {
					if(!this.$enabled) return null;
					return this.Interface ? this.Interface : this;
				}.bind(currentDependency);

				Object.defineProperty(thisServiceDependencies, thisServiceDependency, {
					'__proto__': null,
					'configurable': true,
					'enumerable': true,
					'get': interfaceMethod
				});

				currentDependency.$dependants.push(thisService);
			});

			return thisService.startAsync(thisServiceDependencies);
		})
		.then((status) => {
			if(callback) callback(null, status);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_startMiddleWares(callback) {
		this._dummyAsync()
		.then(() => {
			const promiseResolutions = [];

			// Start each middleware
			const middlewareNames = Object.keys(this.$module.$middlewares || {});
			middlewareNames.forEach((middlewareName) => {
				promiseResolutions.push(this._startSingleMiddlewareAsync(middlewareName));
			});

			return this._processPromisesAsync(middlewareNames, promiseResolutions);
		})
		// Wait for the middlewares to start...
		.then((result) => {
			if(callback) callback(null, { 'type': 'middlewares', 'status': result });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err, { 'type': 'middlewares', 'status': err });
		});
	}

	_startSingleMiddleware(middlewareName, callback) {
		this._dummyAsync()
		.then(() => {
			const thisMiddleware = this.$module.$middlewares[middlewareName];
			const thisMiddlewareDependencies = {};

			thisMiddleware.dependencies.forEach((thisMiddlewareDependency) => {
				let currentDependency = null,
					currentModule = this.$module;

				while(!!currentModule && !currentDependency) {
					if(!currentModule.$services) {
						currentModule = currentModule.$module;
						continue;
					}

					currentDependency = currentModule.$services[thisMiddlewareDependency];
					if(!currentDependency) currentModule = currentModule.$module;
				}

				if(currentDependency) {
					const interfaceMethod = function() {
						if(!this.$enabled) return null;
						return this.Interface ? this.Interface : this;
					}.bind(currentDependency);

					Object.defineProperty(thisMiddlewareDependencies, thisMiddlewareDependency, {
						'__proto__': null,
						'configurable': true,
						'enumerable': true,
						'get': interfaceMethod
					});

					currentDependency.$dependants.push(thisMiddleware);
				}
			});

			return thisMiddleware.startAsync(thisMiddlewareDependencies);
		})
		.then((status) => {
			if(callback) callback(null, status);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_startComponents(callback) {
		this._dummyAsync()
		.then(() => {
			const promiseResolutions = [];

			// Start each component
			const componentNames = Object.keys(this.$module.$components || {});
			componentNames.forEach((componentName) => {
				promiseResolutions.push(this._startSingleComponentAsync(componentName));
			});

			return this._processPromisesAsync(componentNames, promiseResolutions);
		})
		// Wait for the components to start...
		.then((result) => {
			if(callback) callback(null, { 'type': 'components', 'status': result });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err, { 'type': 'components', 'status': err });
		});
	}

	_startSingleComponent(componentName, callback) {
		this._dummyAsync()
		.then(() => {
			const thisComponent = this.$module.$components[componentName];
			const thisComponentDependencies = {};

			thisComponent.dependencies.forEach((thisComponentDependency) => {
				let currentDependency = null,
					currentModule = this.$module;

				while(!!currentModule && !currentDependency) {
					if(!currentModule.$services) {
						currentModule = currentModule.$module;
						continue;
					}

					currentDependency = currentModule.$services[thisComponentDependency];
					if(!currentDependency) currentModule = currentModule.$module;
				}

				if(currentDependency) {
					const interfaceMethod = function() {
						if(!this.$enabled) return null;
						return this.Interface ? this.Interface : this;
					}.bind(currentDependency);

					Object.defineProperty(thisComponentDependencies, thisComponentDependency, {
						'__proto__': null,
						'configurable': true,
						'enumerable': true,
						'get': interfaceMethod
					});

					currentDependency.$dependants.push(thisComponent);
				}
			});

			return thisComponent.startAsync(thisComponentDependencies);
		})
		.then((status) => {
			if(callback) callback(null, status);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_startTemplates(callback) {
		this._dummyAsync()
		.then(() => {
			const promiseResolutions = [];

			// Start each template
			const templateNames = Object.keys(this.$module.$templates || {});
			templateNames.forEach((templateName) => {
				promiseResolutions.push(this._startSingleTemplateAsync(templateName));
			});

			return this._processPromisesAsync(templateNames, promiseResolutions);
		})
		// Wait for the templates to start...
		.then((result) => {
			if(callback) callback(null, { 'type': 'templates', 'status': result });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err, { 'type': 'templates', 'status': err });
		});
	}

	_startSingleTemplate(templateName, callback) {
		this._dummyAsync()
		.then(() => {
			const thisTemplate = this.$module.$templates[templateName];
			const thisTemplateDependencies = {};

			thisTemplate.dependencies.forEach((thisTemplateDependency) => {
				let currentDependency = null,
					currentModule = this.$module;

				while(!!currentModule && !currentDependency) {
					if(!currentModule.$services) {
						currentModule = currentModule.$module;
						continue;
					}

					currentDependency = currentModule.$services[thisTemplateDependency];
					if(!currentDependency) currentModule = currentModule.$module;
				}

				if(currentDependency) {
					const interfaceMethod = function() {
						if(!this.$enabled) return null;
						return this.Interface ? this.Interface : this;
					}.bind(currentDependency);

					Object.defineProperty(thisTemplateDependencies, thisTemplateDependency, {
						'__proto__': null,
						'configurable': true,
						'enumerable': true,
						'get': interfaceMethod
					});

					currentDependency.$dependants.push(thisTemplate);
				}
			});

			return thisTemplate.startAsync(thisTemplateDependencies);
		})
		.then((status) => {
			if(callback) callback(null, status);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_stopServices(callback) {
		this._dummyAsync()
		.then(() => {
			const DepGraph = require('dependency-graph').DepGraph;

			const promiseResolutions = [],
				uninitOrder = new DepGraph();

			const serviceNames = Object.keys(this.$module.$services || {});
			serviceNames.forEach((serviceName) => {
				uninitOrder.addNode(serviceName);
			});

			serviceNames.forEach((serviceName) => {
				const thisService = this.$module.$services[serviceName];
				if(!thisService.dependencies) return;

				thisService.dependencies.forEach((thisServiceDependency) => {
					if(serviceNames.indexOf(thisServiceDependency) < 0) return;
					uninitOrder.addDependency(thisService.name, thisServiceDependency);
				});
			});

			const uninitOrderList = uninitOrder.overallOrder().reverse();

			serviceNames.length = 0;
			uninitOrderList.forEach((serviceName) => {
				serviceNames.push(serviceName);
				promiseResolutions.push(this._stopSingleServiceAsync.bind(this, serviceName));
			});

			// Stop Services one after the other
			return promises.reduce(promiseResolutions, (result, serviceStop) => {
				return serviceStop()
				.then((status) => {
					result.push(status);
					return result;
				})
				.catch((err) => {
					result.push(err);
					return result;
				});
			}, [serviceNames]);
		})
		// Wait for the services to stop...
		.then((stopStatuses) => {
			const serviceNames = stopStatuses.shift();
			return this._processPromisesAsync(serviceNames, stopStatuses);
		})
		.then((result) => {
			if(callback) callback(null, { 'type': 'services', 'status': result });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err, { 'type': 'services', 'status': err });
		});
	}

	_stopSingleService(serviceName, callback) {
		this._dummyAsync()
		.then(() => {
			const thisService = this.$module.$services[serviceName];
			return thisService.stopAsync();
		})
		.then((status) => {
			if(callback) callback(null, status);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_stopMiddleWares(callback) {
		this._dummyAsync()
		.then(() => {
			const middlewareNames = Object.keys(this.$module.$middlewares || {}),
				promiseResolutions = [];

			middlewareNames.forEach((middlewareName) => {
				promiseResolutions.push(this._stopSingleMiddlewareAsync(middlewareName));
			});

			return this._processPromisesAsync(middlewareNames, promiseResolutions);
		})
		.then((result) => {
			if(callback) callback(null, { 'type': 'middlewares', 'status': result });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err, { 'type': 'middlewares', 'status': err });
		});
	}

	_stopSingleMiddleware(middlewareName, callback) {
		this._dummyAsync()
		.then(() => {
			const thisMiddleware = this.$module.$middlewares[middlewareName];
			return thisMiddleware.stopAsync();
		})
		.then((status) => {
			if(callback) callback(null, status);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_stopComponents(callback) {
		this._dummyAsync()
		.then(() => {
			const componentNames = Object.keys(this.$module.$components || {}),
				promiseResolutions = [];

			// Step 1: Stop each component
			componentNames.forEach((componentName) => {
				promiseResolutions.push(this._stopSingleComponentAsync(componentName));
			});

			return this._processPromisesAsync(componentNames, promiseResolutions);
		})
		// Wait for the components to stop...
		.then((result) => {
			if(callback) callback(null, { 'type': 'components', 'status': result });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err, { 'type': 'components', 'status': err });
		});
	}

	_stopSingleComponent(componentName, callback) {
		this._dummyAsync()
		.then(() => {
			const thisComponent = this.$module.$components[componentName];
			return thisComponent.stopAsync();
		})
		.then((status) => {
			if(callback) callback(null, status);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_stopTemplates(callback) {
		this._dummyAsync()
		.then(() => {
			const promiseResolutions = [],
				templateNames = Object.keys(this.$module.$templates || {});

			// Step 1: Stop each template
			templateNames.forEach((templateName) => {
				promiseResolutions.push(this._stopSingleTemplateAsync(templateName));
			});

			return this._processPromisesAsync(templateNames, promiseResolutions);
		})
		// Wait for the templates to stop...
		.then((result) => {
			if(callback) callback(null, { 'type': 'templates', 'status': result });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err, { 'type': 'templates', 'status': err });
		});
	}

	_stopSingleTemplate(templateName, callback) {
		this._dummyAsync()
		.then(() => {
			const thisTemplate = this.$module.$templates[templateName];
			return thisTemplate.stopAsync();
		})
		.then((status) => {
			if(callback) callback(null, status);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_uninitializeServices(callback) {
		this._dummyAsync()
		.then(() => {
			const promiseResolutions = [],
				serviceNames = Object.keys(this.$module.$services || {});

			serviceNames.forEach((serviceName) => {
				const thisService = this.$module.$services[serviceName];
				promiseResolutions.push(thisService.uninitializeAsync());
			});

			return this._processPromisesAsync(serviceNames, promiseResolutions);
		})
		.then((status) => {
			if(callback) callback(null, { 'type': 'services', 'status': status });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err, { 'type': 'services', 'status': err });
		});
	}

	_uninitializeMiddleWares(callback) {
		this._dummyAsync()
		.then(() => {
			const middlewareNames = Object.keys(this.$module.$middlewares || {}),
				promiseResolutions = [];

			middlewareNames.forEach((middlewareName) => {
				const thisMiddleware = this.$module.$middlewares[middlewareName];
				promiseResolutions.push(thisMiddleware.uninitializeAsync());
			});

			return this._processPromisesAsync(middlewareNames, promiseResolutions);
		})
		.then((status) => {
			if(callback) callback(null, { 'type': 'middlewares', 'status': status });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err, { 'type': 'middlewares', 'status': err });
		});
	}

	_uninitializeComponents(callback) {
		this._dummyAsync()
		.then(() => {
			const componentNames = Object.keys(this.$module.$components || {}),
				promiseResolutions = [];

			componentNames.forEach((componentName) => {
				const thisComponent = this.$module.$components[componentName];
				promiseResolutions.push(thisComponent.uninitializeAsync());
			});

			return this._processPromisesAsync(componentNames, promiseResolutions);
		})
		.then((status) => {
			if(callback) callback(null, { 'type': 'components', 'status': status });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err, { 'type': 'components', 'status': err });
		});
	}

	_uninitializeTemplates(callback) {
		this._dummyAsync()
		.then(() => {
			const promiseResolutions = [],
				templateNames = Object.keys(this.$module.$templates || {});

			templateNames.forEach((templateName) => {
				const thisTemplate = this.$module.$templates[templateName];
				promiseResolutions.push(thisTemplate.uninitializeAsync());
			});

			return this._processPromisesAsync(templateNames, promiseResolutions);
		})
		.then((status) => {
			if(callback) callback(null, { 'type': 'templates', 'status': status });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err, { 'type': 'templates', 'status': err });
		});
	}

	_unloadUtilities(callback) {
		const utilityNames = Object.keys(this.$module.$utilities || {});

		utilityNames.forEach((utilityName) => {
			delete this.$module.$utilities[utilityName];
		});

		delete this.$module.$utilities;
		if(callback) callback(null, { 'type': 'utilities', 'status': utilityNames.length ? utilityNames : null });
	}

	_unloadServices(callback) {
		this._dummyAsync()
		.then(() => {
			const promiseResolutions = [],
				serviceNames = Object.keys(this.$module.$services || {});

			serviceNames.forEach((serviceName) => {
				const thisService = this.$module.$services[serviceName];
				promiseResolutions.push(thisService.unloadAsync());
			});

			return this._processPromisesAsync(serviceNames, promiseResolutions);
		})
		.then((status) => {
			const serviceNames = Object.keys(this.$module.$services || {});
			serviceNames.forEach((serviceName) => {
				delete this.$module.$services[serviceName];
			});

			if(callback) callback(null, { 'type': 'services', 'status': status });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err, { 'type': 'services', 'status': err });
		})
		.finally(() => {
			delete this.$module.$services;
			return null;
		});
	}

	_unloadMiddleWares(callback) {
		this._dummyAsync()
		.then(() => {
			const middlewareNames = Object.keys(this.$module.$middlewares || {}),
				promiseResolutions = [];

			middlewareNames.forEach((middlewareName) => {
				const thisMiddleware = this.$module.$middlewares[middlewareName];
				promiseResolutions.push(thisMiddleware.unloadAsync());
			});

			return this._processPromisesAsync(middlewareNames, promiseResolutions);
		})
		.then((status) => {
			const middlewareNames = Object.keys(this.$module.$middlewares || {});
			middlewareNames.forEach((middlewareName) => {
				delete this.$module.$middlewares[middlewareName];
			});

			if(callback) callback(null, { 'type': 'middlewares', 'status': status });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err, { 'type': 'middlewares', 'status': err });
		})
		.finally(() => {
			delete this.$module.$middlewares;
			return null;
		});
	}

	_unloadComponents(callback) {
		this._dummyAsync()
		.then(() => {
			const componentNames = Object.keys(this.$module.$components || {}),
				promiseResolutions = [];

			componentNames.forEach((componentName) => {
				const thisComponent = this.$module.$components[componentName];
				promiseResolutions.push(thisComponent.unloadAsync());
			});

			return this._processPromisesAsync(componentNames, promiseResolutions);
		})
		.then((status) => {
			const componentNames = Object.keys(this.$module.$components || {});
			componentNames.forEach((componentName) => {
				delete this.$module.$components[componentName];
			});

			if(callback) callback(null, { 'type': 'components', 'status': status });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err, { 'type': 'components', 'status': err });
		})
		.finally(() => {
			delete this.$module.$components;
			return null;
		});
	}

	_unloadTemplates(callback) {
		this._dummyAsync()
		.then(() => {
			const promiseResolutions = [],
				templateNames = Object.keys(this.$module.$templates || {});

			templateNames.forEach((templateName) => {
				const thisTemplate = this.$module.$templates[templateName];
				promiseResolutions.push(thisTemplate.unloadAsync());
			});

			return this._processPromisesAsync(templateNames, promiseResolutions);
		})
		.then((status) => {
			const templateNames = Object.keys(this.$module.$templates || {});
			templateNames.forEach((templateName) => {
				delete this.$module.$templates[templateName];
			});

			if(callback) callback(null, { 'type': 'templates', 'status': status });
			return null;
		})
		.catch((err) => {
			if(callback) callback(err, { 'type': 'templates', 'status': err });
		})
		.finally(() => {
			delete this.$module.$templates;
			return null;
		});
	}

	_findFiles(rootDir, filename, callback) {
		const fs = require('fs'),
			path = require('path');

		const filesystem = promises.promisifyAll(fs);
		let fileList = [];

		this._dummyAsync()
		.then(() => {
			return this._existsAsync(rootDir);
		})
		.then((exists) => {
			if(!exists) throw new Error(`${rootDir} doesn't exist`);
			return this._existsAsync(path.join(rootDir, filename));
		})
		.then((exists) => {
			if(exists) {
				fileList.push(path.join(rootDir, filename));
				throw new Error(`File found in ${rootDir}`);
			}

			return filesystem.readdirAsync(rootDir);
		})
		.then((rootDirObjects) => {
			const promiseResolutions = [];

			for(const rootDirObject of rootDirObjects)
				promiseResolutions.push(filesystem.statAsync(path.join(rootDir, rootDirObject)));

			promiseResolutions.push(rootDirObjects);
			return promises.all(promiseResolutions);
		})
		.then((results) => {
			const rootDirObjects = results.pop(),
				rootDirStats = results;

			const rootDirFolders = [];
			rootDirObjects.forEach((rootDirObject, idx) => {
				if(!rootDirStats[idx].isDirectory())
					return;

				rootDirFolders.push(path.join(rootDir, rootDirObject));
			});

			const promiseResolutions = [];
			rootDirFolders.forEach((rootDirFolder) => {
				promiseResolutions.push(this._findFilesAsync(rootDirFolder, filename));
			});

			return promises.all(promiseResolutions);
		})
		.then((subFolderFiles) => {
			fileList = [].concat(...subFolderFiles);
			if(callback) callback(null, fileList);

			return null;
		})
		.catch(() => {
//			if((process.env.NODE_ENV || 'development') === 'development') console.error(err);
			if(callback) callback(null, fileList);
		});
	}

	_filterStatus(status) {
		const filteredStatus = [];

		status.forEach((thisStatus) => {
			if(thisStatus.status === null)
				return;

			if(typeof thisStatus.status === 'object') {
				Object.keys(thisStatus.status).forEach((key) => {
					if(thisStatus.status[key] instanceof Error)
						thisStatus.status[key] = thisStatus.status[key].stack;

					if(Array.isArray(thisStatus.status[key])) {
						thisStatus.status[key] = this._filterStatus(thisStatus.status[key]);
						if(!thisStatus.status[key].length) thisStatus.status[key] = true;
					}
				});
			}

			filteredStatus.push(thisStatus);
		});

		return filteredStatus;
	}

	_processPromises(names, promiseResolutions, callback) {
		if(!promiseResolutions.length) {
			if(callback) callback(null, null);
			return;
		}

		this._dummyAsync()
		.then(() => {
			return promises.all(promiseResolutions);
		})
		.then((status) => {
			const nameStatusPair = {};

			for(const idx in status) {
				if(!Object.prototype.hasOwnProperty.call(status, idx) && !{}.hasOwnProperty.call(status, idx))
					continue;

				const thisName = names[idx],
					thisStatus = status[idx];

				nameStatusPair[thisName] = thisStatus;
			}

			if(callback) callback(null, nameStatusPair);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_exists(path, mode, callback) {
		const filesystem = require('fs');

		let actualCallback = callback,
			actualMode = mode;

		if(!actualCallback) {
			actualCallback = actualMode;
			actualMode = undefined;
		}

		filesystem.access(path, actualMode || filesystem.constants.F_OK, (err) => {
			if(actualCallback) actualCallback(null, !err);
		});
	}

	_dummy(callback) {
		if(callback) callback(null, true);
	}
}

exports.TwyrModuleLoader = TwyrModuleLoader;

