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
const EventEmitter = require('events'),
	TwyrBaseComponent = require('./components/TwyrBaseComponent').TwyrBaseComponent,
	TwyrBaseError = require('./TwyrBaseError').TwyrBaseError,
	TwyrBaseMiddleware = require('./middlewares/TwyrBaseMiddleware').TwyrBaseMiddleware,
	TwyrBaseService = require('./services/TwyrBaseService').TwyrBaseService,
	TwyrBaseTemplate = require('./templates/TwyrBaseTemplate').TwyrBaseTemplate;

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
		const finalStatus = [];

		this._dummyAsync()
		.then(() => {
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

			return this._loadUtilitiesAsync(configSrvc);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::load: Load Utilities Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._loadServicesAsync(configSrvc);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::load: Load Services Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._loadMiddleWaresAsync(configSrvc || this.$module.$services.ConfigurationService.Interface);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::load: Load Middlewares Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._loadComponentsAsync(configSrvc || this.$module.$services.ConfigurationService.Interface);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::load: Load Components Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._loadTemplatesAsync(configSrvc || this.$module.$services.ConfigurationService.Interface);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::load: Load Templates Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::load: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	initialize(callback) {
		const finalStatus = [];

		this._dummyAsync()
		.then(() => {
			return this._initializeServicesAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::initialize: Initialize Services Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._initializeMiddleWaresAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::initialize: Initialize Middlewares Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._initializeComponentsAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::initialize: Initialize Components Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._initializeTemplatesAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::initialize: Initialize Templates Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::initialize: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	start(callback) {
		const finalStatus = [];

		this._dummyAsync()
		.then(() => {
			return this._startServicesAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::start: Start Services Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._startMiddlewaresAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::start: Start Middlewares Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._startComponentsAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::start: Start Components Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._startTemplatesAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::start: Start Templates Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::start: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	stop(callback) {
		const finalStatus = [];

		this._dummyAsync()
		.then(() => {
			return this._stopTemplatesAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::stop: Stop Templates Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._stopComponentsAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::stop: Stop Components Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._stopMiddlewaresAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::stop: Stop Middlewares Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._stopServicesAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::stop: Stop Services Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::stop: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	uninitialize(callback) {
		const finalStatus = [];

		this._dummyAsync()
		.then(() => {
			return this._uninitializeTemplatesAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::uninitialize: Uninitialize Templates Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._uninitializeComponentsAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::uninitialize: Uninitialize Components Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._uninitializeMiddlewaresAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::uninitialize: Uninitialize Middlewares Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._uninitializeServicesAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::uninitialize: Uninitialize Services Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::uninitialize: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	unload(callback) {
		const finalStatus = [];

		this._dummyAsync()
		.then(() => {
			return this._unloadTemplatesAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::unload: Unload Templates Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._unloadComponentsAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::unload: Unload Components Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._unloadMiddlewaresAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::unload: Unload Middlewares Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._unloadServicesAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::unload: Unload Services Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);
			return this._unloadUtilitiesAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::unload: Unload Utilities Error`, err);
			throw error;
		})
		.then((status) => {
			finalStatus.push(status);

			if(callback) callback(null, this._filterStatus(finalStatus));
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::unload: Execute Callback Error`, err);

			if(callback) callback(error);
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_loadUtilities: Find Files Error`, err);
			throw error;
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
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_loadUtilities: Execute Callback Error`, err);

			if(callback) callback(error, { 'type': 'utilities', 'status': error });
		});
	}

	_loadServices(configSrvc, callback) {
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_loadServices: Find Files Error`, err);
			throw error;
		})
		.then((definedServices) => {
			const configSrvcResolution = [];
			if(!configSrvc) {
				for(const definedService of definedServices) {
					const Service = require(definedService).service;
					if(!Service) continue;

					// Construct the Service...
					configSrvc = new Service(this.$module);
					configSrvc.$dependants = [];

					// Check to see valid typeof
					if(!(configSrvc instanceof TwyrBaseService))
						throw new TwyrBaseError(`${definedService} does not contain a valid TwyrBaseService definition`);

					if(configSrvc.name !== 'ConfigurationService') {
						configSrvc = undefined;
						continue;
					}

					// Store the promisified object...
					this.$module.$services.ConfigurationService = promises.promisifyAll(configSrvc, {
						'filter': () => {
							return true;
						}
					});

					break;
				}

				if(configSrvc) configSrvcResolution.push(this.$module.$services.ConfigurationService.loadAsync(null));
			}

			configSrvcResolution.push(definedServices);
			return promises.all(configSrvcResolution);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_loadServices: Load Configuration Service Error`, err);
			throw error;
		})
		.then((results) => {
			const definedServices = results.pop(),
				promiseResolutions = [],
				serviceNames = [];

			for(const definedService of definedServices) {
				// Check validity of the definition...
				const Service = require(definedService).service;
				if(!Service) continue;

				// Construct the service
				const serviceInstance = new Service(this.$module);
				serviceInstance.$dependants = [];

				// Check to see valid typeof
				if(!(serviceInstance instanceof TwyrBaseService))
					throw new TwyrBaseError(`${definedService} does not contain a valid TwyrBaseService definition`);

				if(serviceInstance.name === 'ConfigurationService')
					continue;

				// Store the promisified object...
				this.$module.$services[serviceInstance.name] = promises.promisifyAll(serviceInstance, {
					'filter': () => {
						return true;
					}
				});

				serviceNames.push(serviceInstance.name);
				promiseResolutions.push(this.$module.$services[serviceInstance.name].loadAsync(this.$module.$services.ConfigurationService));
			}

			if(results.length) {
				serviceNames.unshift('ConfigurationService');
				promiseResolutions.unshift(results.pop());
			}

			return this._processPromisesAsync(serviceNames, promiseResolutions);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_loadServices: Load non-Configuration Services Error`, err);
			throw error;
		})
		.then((result) => {
			if(callback) callback(null, { 'type': 'services', 'status': result });
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_loadServices: Execute Callback Error`, err);

			if(callback) callback(error, { 'type': 'services', 'status': error });
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_loadMiddlewares: Find Files Error`, err);
			throw error;
		})
		.then((definedMiddlewares) => {
			const middlewareNames = [],
				promiseResolutions = [];

			for(const definedMiddleware of definedMiddlewares) {
				const Middleware = require(definedMiddleware).middleware;
				if(!Middleware) continue;

				// Construct the middleware
				const middlewareInstance = new Middleware(this.$module);

				// Check to see valid typeof
				if(!(middlewareInstance instanceof TwyrBaseMiddleware))
					throw new TwyrBaseError(`${definedMiddleware} does not contain a valid TwyrBaseMiddleware definition`);

				// Store the promisified object...
				this.$module.$middlewares[middlewareInstance.name] = promises.promisifyAll(middlewareInstance, {
					'filter': () => {
						return true;
					}
				});

				middlewareNames.push(middlewareInstance.name);
				promiseResolutions.push(this.$module.$middlewares[middlewareInstance.name].loadAsync(configSrvc));
			}

			return this._processPromisesAsync(middlewareNames, promiseResolutions);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_loadMiddlewares: Load Middlewares Error`, err);
			throw error;
		})
		.then((result) => {
			if(callback) callback(null, { 'type': 'middlewares', 'status': result });
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_loadMiddlewares: Execute Callback Error`, err);

			if(callback) callback(error, { 'type': 'middlewares', 'status': error });
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_loadComponents: Find Files Error`, err);
			throw error;
		})
		.then((definedComponents) => {
			const componentNames = [],
				promiseResolutions = [];

			for(const definedComponent of definedComponents) {
				const Component = require(definedComponent).component;
				if(!Component) continue;

				// Construct the Component
				const componentInstance = new Component(this.$module);

				// Check to see valid typeof
				if(!(componentInstance instanceof TwyrBaseComponent))
					throw new TwyrBaseError(`${definedComponent} does not contain a valid TwyrBaseComponent definition`);

				// Store the promisified object...
				this.$module.$components[componentInstance.name] = promises.promisifyAll(componentInstance, {
					'filter': () => {
						return true;
					}
				});

				componentNames.push(componentInstance.name);
				promiseResolutions.push(this.$module.$components[componentInstance.name].loadAsync(configSrvc));
			}

			return this._processPromisesAsync(componentNames, promiseResolutions);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_loadComponents: Load Component Error`, err);
			throw error;
		})
		.then((result) => {
			if(callback) callback(null, { 'type': 'components', 'status': result });
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_loadComponents: Execute Callback Error`, err);

			if(callback) callback(error, { 'type': 'components', 'status': error });
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_loadTemplates: Find Files Error`, err);
			throw error;
		})
		.then((definedTemplates) => {
			const promiseResolutions = [],
				templateNames = [];

			for(const definedTemplate of definedTemplates) {
				const Template = require(definedTemplate).template;
				if(!Template) continue;

				// Construct the Template
				const templateInstance = new Template(this.$module);

				// Check to see valid typeof
				if(!(templateInstance instanceof TwyrBaseTemplate))
					throw new TwyrBaseError(`${definedTemplate} does not contain a valid TwyrBaseTemplate definition`);

				// Store the promisified object...
				this.$module.$templates[templateInstance.name] = promises.promisifyAll(templateInstance, {
					'filter': () => {
						return true;
					}
				});

				templateNames.push(templateInstance.name);
				promiseResolutions.push(this.$module.$templates[templateInstance.name].loadAsync(configSrvc));
			}

			return this._processPromisesAsync(templateNames, promiseResolutions);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_loadTemplates: Load Template Error`, err);
			throw error;
		})
		.then((result) => {
			if(callback) callback(null, { 'type': 'templates', 'status': result });
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_loadTemplates: Execute Callback Error`, err);

			if(callback) callback(error, { 'type': 'templates', 'status': error });
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_initializeServices: Initialize Services Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, { 'type': 'services', 'status': status });
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_initializeServices: Execute Callback Error`, err);

			if(callback) callback(error, { 'type': 'services', 'status': error });
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_initializeMiddlewares: Initialize Middlewares Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, { 'type': 'middlewares', 'status': status });
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_initializeMiddlewares: Execute Callback Error`, err);

			if(callback) callback(error, { 'type': 'middlewares', 'status': error });
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_initializeComponents: Initialize Components Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, { 'type': 'components', 'status': status });
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_initializeComponents: Execute Callback Error`, err);

			if(callback) callback(error, { 'type': 'components', 'status': error });
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_initializeTemplates: Initialize Templates Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, { 'type': 'templates', 'status': status });
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_initializeTemplates: Execute Callback Error`, err);

			if(callback) callback(error, { 'type': 'templates', 'status': error });
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_startServices: Start Services Error`, err);
			throw error;
		})
		// Wait for the services to start...
		.then((startStatuses) => {
			const serviceNames = startStatuses.shift();
			return this._processPromisesAsync(serviceNames, startStatuses);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_startServices: Process Start Error`, err);
			throw error;
		})
		.then((result) => {
			if(callback) callback(null, { 'type': 'services', 'status': result });
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_startServices: Execute Callback Error`, err);

			if(callback) callback(error, { 'type': 'services', 'status': error });
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_startSingleService: Service Start Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, status);
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_startSingleService: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	_startMiddlewares(callback) {
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_startMiddlewares: Start Middlewares Error`, err);
			throw error;
		})
		// Wait for the middlewares to start...
		.then((result) => {
			if(callback) callback(null, { 'type': 'middlewares', 'status': result });
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_startMiddlewares: Execute Callback Error`, err);

			if(callback) callback(error, { 'type': 'middlewares', 'status': error });
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_startSingleMiddleware: Start Middleware Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, status);
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_startSingleMiddleware: Execute Callback Error`, err);

			if(callback) callback(error);
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_startComponents: Start Components Error`, err);
			throw error;
		})
		// Wait for the components to start...
		.then((result) => {
			if(callback) callback(null, { 'type': 'components', 'status': result });
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_startComponents: Execute Callback Error`, err);

			if(callback) callback(error, { 'type': 'components', 'status': error });
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_startSingleComponent: Start Component Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, status);
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_startSingleComponent: Execute Callback Error`, err);

			if(callback) callback(error);
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_startTemplates: Start Templates Error`, err);
			throw error;
		})
		// Wait for the templates to start...
		.then((result) => {
			if(callback) callback(null, { 'type': 'templates', 'status': result });
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_startTemplates: Execute Callback Error`, err);

			if(callback) callback(error, { 'type': 'templates', 'status': error });
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_startSingleTemplate: Start Template Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, status);
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_startSingleTemplate: Execute Callback Error`, err);

			if(callback) callback(error);
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_stopServices: Stop Services Error`, err);
			throw error;
		})
		// Wait for the services to stop...
		.then((stopStatuses) => {
			const serviceNames = stopStatuses.shift();
			return this._processPromisesAsync(serviceNames, stopStatuses);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_stopServices: Process Stop Error`, err);
			throw error;
		})
		.then((result) => {
			if(callback) callback(null, { 'type': 'services', 'status': result });
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_stopServices: Execute Callback Error`, err);

			if(callback) callback(error, { 'type': 'services', 'status': error });
		});
	}

	_stopSingleService(serviceName, callback) {
		this._dummyAsync()
		.then(() => {
			const thisService = this.$module.$services[serviceName];
			return thisService.stopAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_stopSingleService: Service Stop Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, status);
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_stopSingleService: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	_stopMiddlewares(callback) {
		this._dummyAsync()
		.then(() => {
			const middlewareNames = Object.keys(this.$module.$middlewares || {}),
				promiseResolutions = [];

			middlewareNames.forEach((middlewareName) => {
				promiseResolutions.push(this._stopSingleMiddlewareAsync(middlewareName));
			});

			return this._processPromisesAsync(middlewareNames, promiseResolutions);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_stopMiddlewares: Stop Middlewares Error`, err);
			throw error;
		})
		.then((result) => {
			if(callback) callback(null, { 'type': 'middlewares', 'status': result });
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_stopMiddlewares: Execute Callback Error`, err);

			if(callback) callback(error, { 'type': 'middlewares', 'status': error });
		});
	}

	_stopSingleMiddleware(middlewareName, callback) {
		this._dummyAsync()
		.then(() => {
			const thisMiddleware = this.$module.$middlewares[middlewareName];
			return thisMiddleware.stopAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_stopSingleMiddleware: Stop Middleware Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, status);
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_stopSingleMiddleware: Execute Callback Error`, err);

			if(callback) callback(error);
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_stopComponents: Stop Components Error`, err);
			throw error;
		})
		// Wait for the components to stop...
		.then((result) => {
			if(callback) callback(null, { 'type': 'components', 'status': result });
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_stopComponents: Execute Callback Error`, err);

			if(callback) callback(error, { 'type': 'components', 'status': error });
		});
	}

	_stopSingleComponent(componentName, callback) {
		this._dummyAsync()
		.then(() => {
			const thisComponent = this.$module.$components[componentName];
			return thisComponent.stopAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_stopSingleComponent: Stop Component Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, status);
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_stopSingleComponent: Execute Callback Error`, err);

			if(callback) callback(error);
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_stopTemplates: Stop Templates Error`, err);
			throw error;
		})
		// Wait for the templates to stop...
		.then((result) => {
			if(callback) callback(null, { 'type': 'templates', 'status': result });
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_stopTemplates: Execute Callback Error`, err);

			if(callback) callback(error, { 'type': 'templates', 'status': error });
		});
	}

	_stopSingleTemplate(templateName, callback) {
		this._dummyAsync()
		.then(() => {
			const thisTemplate = this.$module.$templates[templateName];
			return thisTemplate.stopAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_stopSingleTemplate: Stop Template Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, status);
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_stopSingleTemplate: Execute Callback Error`, err);

			if(callback) callback(error);
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_uninitializeServices: Uninitialize Services Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, { 'type': 'services', 'status': status });
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_uninitializeServices: Execute Callback Error`, err);

			if(callback) callback(error, { 'type': 'services', 'status': error });
		});
	}

	_uninitializeMiddlewares(callback) {
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_uninitializeMiddlewares: Uninitialize Middlewares Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, { 'type': 'middlewares', 'status': status });
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_uninitializeMiddlewares: Execute Callback Error`, err);

			if(callback) callback(error, { 'type': 'middlewares', 'status': error });
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_uninitializeComponents: Uninitialize Components Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, { 'type': 'components', 'status': status });
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_uninitializeComponents: Execute Callback Error`, err);

			if(callback) callback(error, { 'type': 'components', 'status': error });
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_uninitializeTemplates: Uninitialize Templates Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, { 'type': 'templates', 'status': status });
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_uninitializeTemplates: Execute Callback Error`, err);

			if(callback) callback(error, { 'type': 'templates', 'status': error });
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_unloadServices: Unload Services Error`, err);
			throw error;
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
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_unloadServices: Execute Callback Error`, err);

			if(callback) callback(error, { 'type': 'services', 'status': error });
		})
		.finally(() => {
			delete this.$module.$services;
			return null;
		});
	}

	_unloadMiddlewares(callback) {
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_unloadMiddlewares: Unload Middlewares Error`, err);
			throw error;
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
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_unloadMiddlewares: Execute Callback Error`, err);

			if(callback) callback(error, { 'type': 'middlewares', 'status': error });
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_unloadComponents: Unload Components Error`, err);
			throw error;
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
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_unloadComponents: Execute Callback Error`, err);

			if(callback) callback(error, { 'type': 'components', 'status': error });
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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_unloadTemplates: Unload Templates Error`, err);
			throw error;
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
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_unloadTemplates: Execute Callback Error`, err);

			if(callback) callback(error, { 'type': 'templates', 'status': error });
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
			return this._existsAsync(path.join(rootDir, filename));
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_findFiles: Check File Exists Error`, err);
			throw error;
		})
		.then((exists) => {
			if(exists) {
				fileList.push(path.join(rootDir, filename));
				return null;
			}

			return filesystem.readdirAsync(rootDir);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_findFiles: Read Folder Error`, err);
			throw error;
		})
		.then((rootDirObjects) => {
			if(!rootDirObjects) return null;

			const promiseResolutions = [];

			for(const rootDirObject of rootDirObjects)
				promiseResolutions.push(filesystem.statAsync(path.join(rootDir, rootDirObject)));

			promiseResolutions.push(rootDirObjects);
			return promises.all(promiseResolutions);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_findFiles: Folder Stat Error`, err);
			throw error;
		})
		.then((results) => {
			if(!results) return null;

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
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_findFiles: Find in Sub-folders Error`, err);
			throw error;
		})
		.then((subFolderFiles) => {
			if(subFolderFiles) fileList = [].concat(...subFolderFiles);

			if(callback) callback(null, fileList);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_findFiles: Execute Callback Error`, err);

			if(callback) callback(error);
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

	get name() { return this.constructor.name; }
	get basePath() { return __dirname; }
}

exports.TwyrModuleLoader = TwyrModuleLoader;

