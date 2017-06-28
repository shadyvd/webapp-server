/**
 * @file      server/TwyrBaseModule.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application' Base Module - serving as a template for all other modules, including the main server
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

class TwyrBaseModule extends EventEmitter {
	constructor(module, loader) {
		super();

		this.$module = module;
		this.$loader = loader;

		if(!loader) {
			const TwyrModuleLoader = require('./TwyrModuleLoader').TwyrModuleLoader;
			this.$loader = promises.promisifyAll(new TwyrModuleLoader(this), {
				'filter': function(name) {
					return name !== '_filterStatus';
				}
			});
		}

		this.on('error', this._handleUncaughtException.bind(this));
	}

	load(configSrvc, callback) {
		if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name} Load`);

		const promiseResolutions = [];

		if(configSrvc)
			promiseResolutions.push(configSrvc.loadConfigAsync(this));
		else
			promiseResolutions.push(null);

		promises.all(promiseResolutions)
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
		.then((status) => {
			if(!status) throw status;
			if(callback) callback(null, status);

			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${this.name} Load Error: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	initialize(callback) {
		if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name} Initialize`);

		this.$loader.initializeAsync()
		.then((status) => {
			if(!status) throw status;
			if(callback) callback(null, status);

			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${this.name} Initialize Error: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	start(dependencies, callback) {
		if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name} Start`);

		const actualState = this.$enabled;

		this.$enabled = true;
		this.$dependencies = dependencies;

		this.$loader.startAsync()
		.then((status) => {
			if(!status) throw status;
			return promises.all([status, this._changeStateAsync(actualState)]);
		})
		.then((status) => {
			if(callback) callback(null, status[0]);
			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${this.name} Start Error: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	stop(callback) {
		if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name} Stop`);

		this.$loader.stopAsync()
		.then((status) => {
			if(!status) throw status;
			if(callback) callback(null, status);

			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${this.name} Stop Error: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	uninitialize(callback) {
		if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name} Uninitialize`);

		this.$loader.uninitializeAsync()
		.then((status) => {
			if(!status) throw status;
			if(callback) callback(null, status);

			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${this.name} Uninitialize Error: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	unload(callback) {
		if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name} Unload`);

		this.$loader.unloadAsync()
		.then((status) => {
			if(!status) throw status;
			if(callback) callback(null, status);

			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${this.name} Unload Error: ${err.stack}`);
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
		.then(() => {
			const promiseResolutions = [];

			if(this.$dependants) {
				this.$dependants.forEach((dependant) => {
					promiseResolutions.push(dependant._dependencyReconfigureAsync(this));
				});
			}

			return promises.all(promiseResolutions);
		})
		.then(() => {
			if(callback) callback(null, true);
		})
		.catch((err) => {
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
		.then(() => {
			const promiseResolutions = [];

			if(this.$dependants) {
				this.$dependants.forEach((dependant) => {
					promiseResolutions.push(dependant._dependencyStateChangeAsync(this, newState));
				});
			}

			return promises.all(promiseResolutions);
		})
		.then(() => {
			if(callback) callback(null, true);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_parentReconfigure(callback) {
		if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name}::_parentReconfigure`);
		if(callback) callback(null, true);
	}

	_dependencyReconfigure(dependency, callback) {
		if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name}::_dependencyReconfigure: ${dependency.name}`);
		if(callback) callback(null, true);
	}

	_subModuleReconfigure(subModule, callback) {
		if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name}::_subModuleReconfigure: ${subModule.name}`);
		if(callback) callback(null, true);
	}

	_parentStateChange(state, callback) {
		if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name}::_parentStateChange: ${this.$module.name} is now ${(state ? 'enabled' : 'disabled')}`);
		if(callback) callback(null, true);
	}

	_dependencyStateChange(dependency, state, callback) {
		let allDependenciesEnabled = true;
		if(state) {
			this.dependencies.forEach((dependencyName) => {
				allDependenciesEnabled = allDependenciesEnabled && !!this.$dependencies[dependencyName];
			});
		}

		if(!allDependenciesEnabled) {
			if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name}::_dependencyStateChange: ${dependency.name} is now ${(state ? 'enabled' : 'disabled')}`);
			if(callback) callback(null, true);
			return;
		}

		this._dummyAsync()
		.then(() => {
			return this._changeStateAsync(state);
		})
		.then(() => {
			if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name}::_dependencyStateChange: ${dependency.name} is now ${(state ? 'enabled' : 'disabled')}`);

			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_subModuleStateChange(subModule, state, callback) {
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
		.then(() => {
			if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name}::_subModuleStateChange: ${subModule.name} is now ${(state ? 'enabled' : 'disabled')}`);
			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${this.name}::_subModuleStateChange:\nsubModule: ${subModule.name}\nstate: ${state}\nerror: ${err.stack}`);
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

	_handleUncaughtException(err) {
		const uncaughtException = new TwyrBaseError(`${this.name} uncaught exception`, err);
		console.error(uncaughtException);
	}

	get name() { return this.constructor.name; }
	get basePath() { return __dirname; }
	get dependencies() { return []; }
}

exports.TwyrBaseModule = TwyrBaseModule;

