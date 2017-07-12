/**
 * @file      server/TwyrBaseModule.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @summary   The Twy'r Web Application' Base Module - serving as a template for all other modules, including the main server
 *
 */

'use strict';

/**
 * Module dependencies, required for ALL Twy'r' modules
 * @ignore
 */
const promises = require('bluebird');

/**
 * Module dependencies, required for this module
 * @ignore
 */

const EventEmitter = require('events'),
	TwyrBaseError = require('./TwyrBaseError').TwyrBaseError;

/**
 * Private variables exposed only using getter / setter
 * @ignore
 */
const _dependencies = Symbol();

class TwyrBaseModule extends EventEmitter {
	constructor(module, loader) {
		super();

		this.$module = module;
		this.$loader = loader;
		this[_dependencies] = [];

		if(!loader) {
			const TwyrModuleLoader = require('./TwyrModuleLoader').TwyrModuleLoader;
			this.$loader = promises.promisifyAll(new TwyrModuleLoader(this), {
				'filter': function(name/*, func*/) {
					return (name !== '_filterStatus');
				}
			});
		}

		this.on('error', this._handleUncaughtException.bind(this));
	}

	load(configSrvc, callback) {
		if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name} Load`);

		this._dummyAsync()
		.then(() => {
			const promiseResolutions = [];

			if(configSrvc)
				promiseResolutions.push(configSrvc.loadConfigAsync(this));
			else
				promiseResolutions.push(null);

			return promises.all(promiseResolutions);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::load: Load Configuration Error`, err);
			throw error;
		})
		.then((moduleConfig) => {
			this.$config = configSrvc ? moduleConfig[0].configuration : this.$config;
			this.$enabled = configSrvc ? moduleConfig[0].state : true;

			if(!this.$locale) {
				Object.defineProperty(this, '$locale', {
					'__proto__': null,
					'value': this.$module ? this.$module.locale : 'en'
				});
			}

			return this.$loader.loadAsync(configSrvc, this.basePath);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::load: Loader Load Error`, err);
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

	initialize(callback) {
		if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name} Initialize`);

		this._dummyAsync()
		.then(() => {
			return this.$loader.initializeAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::initialize: Loader Initialize Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, status);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::initialize: Execute Callback Error`, err);

			if(callback) callback(error);
		});
	}

	start(dependencies, callback) {
		if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name} Start`);
		const actualState = this.$enabled;

		this._dummyAsync()
		.then(() => {
			this.$enabled = true;
			this.$dependencies = dependencies;

			return this.$loader.startAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::start: Loader Start Error`, err);
			throw error;
		})
		.then((status) => {
			return promises.all([status, this._changeStateAsync(actualState)]);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::start: Change State Error`, err);
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

	stop(callback) {
		if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name} Stop`);

		this._dummyAsync()
		.then(() => {
			return this.$loader.stopAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::stop: Loader Stop Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, status);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::stop: Execute Callback Error`, err);

			if(callback) callback(err);
		});
	}

	uninitialize(callback) {
		if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name} Uninitialize`);

		this._dummyAsync()
		.then(() => {
			return this.$loader.uninitializeAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::uninitialize: Loader Uninitialize Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, status);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::uninitialize: Execute Callback Error`, err);

			if(callback) callback(err);
		});
	}

	unload(callback) {
		if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name} Unload`);

		this._dummyAsync()
		.then(() => {
			return this.$loader.unloadAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::unload: Loader Unload Error`, err);
			throw error;
		})
		.then((status) => {
			if(callback) callback(null, status);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::unload: Execute Callback Error`, err);

			if(callback) callback(err);
		})
		.finally(() => {
			delete this.$config;
			delete this.$loader;
			delete this.$module;

			return null;
		});
	}

	_reconfigure(newConfig, callback) {
		this._dummyAsync()
		.then(() => {
			const deepEqual = require('deep-equal'),
				deepmerge = require('deepmerge');

			if(!deepEqual(this.$config, newConfig))
				this.$config = deepmerge(this.$config, newConfig || {});

			return this.$module._subModuleReconfigureAsync(this);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_reconfigure: Parent Submodule Reconfigure Error`, err);
			throw error;
		})
		.then(() => {
			const promiseResolutions = [];

			if(this.$services) {
				Object.keys(this.$services).forEach((serviceName) => {
					promiseResolutions.push(this.$services[serviceName]._parentReconfigureAsync());
				});
			}

			if(this.$middlewares) {
				Object.keys(this.$middlewares).forEach((middlewareName) => {
					promiseResolutions.push(this.$middlewares[middlewareName]._parentReconfigureAsync());
				});
			}

			if(this.$components) {
				Object.keys(this.$components).forEach((componentName) => {
					promiseResolutions.push(this.$components[componentName]._parentReconfigureAsync());
				});
			}

			if(this.$templates) {
				Object.keys(this.$templates).forEach((templateName) => {
					promiseResolutions.push(this.$templates[templateName]._parentReconfigureAsync());
				});
			}

			return promises.all(promiseResolutions);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_reconfigure: Submodule Reconfigure Error`, err);
			throw error;
		})
		.then(() => {
			const promiseResolutions = [];

			if(this.$dependants) {
				this.$dependants.forEach((dependant) => {
					promiseResolutions.push(dependant._dependencyReconfigureAsync(this));
				});
			}

			return promises.all(promiseResolutions);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_reconfigure: Dependant Reconfigure Error`, err);
			throw error;
		})
		.then(() => {
			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_reconfigure: Execute Callback Error`, err);

			if(callback) callback(err);
		});
	}

	_changeState(newState, callback) {
		if(this.$enabled === newState) {
			if(callback) callback(null, true);
			return;
		}

		this._dummyAsync()
		.then(() => {
			this.$enabled = newState;
			return this.$module._subModuleStateChangeAsync(this, newState);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_changeState: Parent Submodule Change State Error`, err);
			throw error;
		})
		.then(() => {
			const promiseResolutions = [];

			if(this.$services) {
				Object.keys(this.$services).forEach((serviceName) => {
					promiseResolutions.push(this.$services[serviceName]._parentStateChangeAsync(newState));
				});
			}

			if(this.$middlewares) {
				Object.keys(this.$middlewares).forEach((middlewareName) => {
					promiseResolutions.push(this.$middlewares[middlewareName]._parentStateChangeAsync(newState));
				});
			}

			if(this.$components) {
				Object.keys(this.$components).forEach((componentName) => {
					promiseResolutions.push(this.$components[componentName]._parentStateChangeAsync(newState));
				});
			}

			if(this.$templates) {
				Object.keys(this.$templates).forEach((templateName) => {
					promiseResolutions.push(this.$templates[templateName]._parentStateChangeAsync(newState));
				});
			}

			return promises.all(promiseResolutions);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_changeState: Submodule Change State Error`, err);
			throw error;
		})
		.then(() => {
			const promiseResolutions = [];

			if(this.$dependants) {
				this.$dependants.forEach((dependant) => {
					promiseResolutions.push(dependant._dependencyStateChangeAsync(this, newState));
				});
			}

			return promises.all(promiseResolutions);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_changeState: Dependant Change State Error`, err);
			throw error;
		})
		.then(() => {
			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_changeState: Execute Callback Error`, err);

			if(callback) callback(err);
		});
	}

	_parentReconfigure(callback) {
		if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name}::_parentReconfigure`);

		this._dummyAsync()
		.then(() => {
			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_parentReconfigure: Execute Callback Error`, err);

			if(callback) callback(err);
		});
	}

	_dependencyReconfigure(dependency, callback) {
		if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name}::_dependencyReconfigure: ${dependency.name}`);

		this._dummyAsync()
		.then(() => {
			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_dependencyReconfigure: Execute Callback Error`, err);

			if(callback) callback(err);
		});
	}

	_subModuleReconfigure(subModule, callback) {
		if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name}::_subModuleReconfigure: ${subModule.name}`);

		this._dummyAsync()
		.then(() => {
			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_subModuleReconfigure: Execute Callback Error`, err);

			if(callback) callback(err);
		});
	}

	_parentStateChange(state, callback) {
		if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name}::_parentStateChange: ${this.$module.name} is now ${(state ? 'enabled' : 'disabled')}`);

		this._dummyAsync()
		.then(() => {
			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_parentStateChange: Execute Callback Error`, err);

			if(callback) callback(err);
		});
	}

	_dependencyStateChange(dependency, state, callback) {
		if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name}::_dependencyStateChange: ${dependency.name} is now ${(state ? 'enabled' : 'disabled')}`);

		this._dummyAsync()
		.then(() => {
			let allDependenciesEnabled = true;
			if(state) {
				this.dependencies.forEach((dependencyName) => {
					allDependenciesEnabled = allDependenciesEnabled && !!this.$dependencies[dependencyName];
				});
			}

			if(!allDependenciesEnabled) {
				if(callback) callback(null, true);
				return null;
			}

			return this._changeStateAsync(state);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_dependencyStateChange: Change State Error`, err);
			throw error;
		})
		.then(() => {
			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_dependencyStateChange: Execute Callback Error`, err);

			if(callback) callback(err);
		});
	}

	_subModuleStateChange(subModule, state, callback) {
		if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name}::_subModuleStateChange: ${subModule.name} is now ${(state ? 'enabled' : 'disabled')}`);

		this._dummyAsync()
		.then(() => {
			let methodToCall = undefined;
			if(state) {
				if(this.$services && Object.keys(this.$services).indexOf(subModule.name) >= 0)
					methodToCall = this.$loader._startSingleServiceAsync.bind(this.$loader);

				if(this.$middlewares && Object.keys(this.$middlewares).indexOf(subModule.name) >= 0)
					methodToCall = this.$loader._startSingleMiddlewareAsync.bind(this.$loader);

				if(this.$components && Object.keys(this.$components).indexOf(subModule.name) >= 0)
					methodToCall = this.$loader._startSingleComponentAsync.bind(this.$loader);
			}
			else {
				if(this.$services && Object.keys(this.$services).indexOf(subModule.name) >= 0)
					methodToCall = this.$loader._stopSingleServiceAsync.bind(this.$loader);

				if(this.$middlewares && Object.keys(this.$middlewares).indexOf(subModule.name) >= 0)
					methodToCall = this.$loader._stopSingleMiddlewareAsync.bind(this.$loader);

				if(this.$components && Object.keys(this.$components).indexOf(subModule.name) >= 0)
					methodToCall = this.$loader._stopSingleComponentAsync.bind(this.$loader);
			}

			if(methodToCall)
				return methodToCall(subModule.name);

			return null;
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::_subModuleStateChange: stop/start Error`, err);
			throw error;
		})
		.then(() => {
			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrBaseError))
				error = new TwyrBaseError(`${this.name}::_subModuleStateChange: Execute Callback Error`, err);

			if(callback) callback(err);
		});
	}

	_addDependencies() {
		for(let dependencyList of arguments) {
			if(typeof dependencyList === 'string')
				dependencyList = dependencyList.split(',');

			if(!Array.isArray(dependencyList))
				throw new TwyrBaseError(`${this.name}::_addDependencies: dependencyList should be a string with comma-separated values, or an Array`);

			dependencyList.forEach((dependency) => {
				if(this[_dependencies].indexOf(dependency.trim()) >= 0)
					return;

				this[_dependencies].push(dependency.trim());
			});
		}
	}

	_exists(path, mode, callback) {
		const filesystem = require('fs');

		if(!callback && typeof mode === 'function') {
			callback = mode;
			mode = undefined;
		}

		filesystem.access(path, mode || filesystem.constants.F_OK, (err) => {
			if(callback) callback(null, !err);
		});
	}

	_dummy(callback) {
		if(callback) callback(null, true);
	}

	_handleUncaughtException(err) {
		const uncaughtException = new TwyrBaseError(`${this.name} uncaught exception`, err);
		console.error(uncaughtException.toString());
	}

	get name() { return this.constructor.name; }
	get basePath() { return __dirname; }
	get dependencies() { return this[_dependencies]; }
}

exports.TwyrBaseModule = TwyrBaseModule;

