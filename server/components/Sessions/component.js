/**
 * @file      server/components/Session/component.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Session Component - provides functionality to allow login / logout
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
const TwyrBaseComponent = require('./../TwyrBaseComponent').TwyrBaseComponent,
	TwyrComponentError = require('./../TwyrComponentError').TwyrComponentError,
	TwyrJSONAPIError = require('./../TwyrComponentError').TwyrJSONAPIError;

class Sessions extends TwyrBaseComponent {
	constructor(module) {
		super(module);
		this._addDependencies('ApiService', 'AuthService', 'ConfigurationService', 'ExpressService', 'LoggerService');
	}

	_addRoutes(callback) {
		this._dummyAsync()
		.then(() => {
			const authService = this.$dependencies.AuthService;

			this.$router.post('/login', authService.authenticate('twyr-local'), this._login.bind(this));
			this.$router.get('/logout', this._logout.bind(this));

			this.$router.post('/resetPassword', this._resetPassword.bind(this));
			this.$router.post('/registerAccount', this._registerAccount.bind(this));

			super._addRoutes(callback);
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrComponentError))
				error = new TwyrComponentError(`Error adding routes`, err);

			if(callback) callback(error);
		});
	}

	_getEmberComponents(tenant, user, mediaType, renderer, callback) {
		const fs = require('fs-extra'),
			path = require('path');

		const filesystem = promises.promisifyAll(fs);

		this._dummyAsync()
		.then(() => {
			const components = user.id === 'ffffffff-ffff-4fff-ffff-ffffffffffff' ? ['login-widget'] : ['logout-widget'],
				promiseResolutions = [];

			components.forEach((component) => {
				promiseResolutions.push(filesystem.readFileAsync(path.join(this.basePath, `ember/components/${component}.js`), 'utf8'));
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
		const path = require('path');

		this._dummyAsync()
		.then(() => {
			const components = user.id === 'ffffffff-ffff-4fff-ffff-ffffffffffff' ? ['login-widget'] : ['logout-widget'],
				promiseResolutions = [];

			components.forEach((component) => {
				promiseResolutions.push(renderer(path.join(this.basePath, `ember/componentHTMLs/${component}.ejs`)));
			});

			return promises.all(promiseResolutions);
		})
		.catch((err) => {
			if(err instanceof TwyrComponentError) throw err;

			const error = new TwyrComponentError(`Error reading Ember Component HTMLs`, err);
			throw error;
		})
		.then((componentHTML) => {
			if(callback) callback(null, componentHTML);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrComponentError))
				error = new TwyrComponentError(`Error returning Ember Component HTMLs`, err);

			if(callback) callback(error);
		});
	}

	_login(request, response, next) {
		this._dummyAsync()
		.then(() => {
			const apiService = this.$dependencies.ApiService;
			return apiService.executeAsync('User::login', [request.user, request.device.type]);
		})
		.catch((err) => {
			if(err instanceof TwyrJSONAPIError) throw err;

			const error = new TwyrJSONAPIError(`Error executing user login`);
			error.addErrorObject(err);

			throw error;
		})
		.then(() => {
			response.status(200).json({
				'status': request.isAuthenticated(),
				'responseText': 'Login Successful! Redirecting...'
			});
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrJSONAPIError)) {
				error = new TwyrJSONAPIError(`Error sending login response`);
				error.addErrorObject(err);
			}

			next(error);
		});
	}

	_logout(request, response, next) {
		this._dummyAsync()
		.then(() => {
			const apiService = this.$dependencies.ApiService;
			return apiService.executeAsync('User::logout', [request.user, request.device.type]);
		})
		.catch((err) => {
			if(err instanceof TwyrJSONAPIError) throw err;

			const error = new TwyrJSONAPIError(`Error executing user logout`);
			error.addErrorObject(err);

			throw error;
		})
		.then(() => {
			request.logout();
			response.status(200).json({ 'status': !request.isAuthenticated() });

			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrJSONAPIError)) {
				error = new TwyrJSONAPIError(`Error sending logout response`);
				error.addErrorObject(err);
			}

			next(error);
		});
	}

	_resetPassword(request, response, next) {
		this._dummyAsync()
		.then(() => {
			const apiService = this.$dependencies.ApiService;
			return apiService.executeAsync('User::resetPassword', [request.body.username, promises.promisify(response.render.bind(response))]);
		})
		.catch((err) => {
			if(err instanceof TwyrJSONAPIError) throw err;

			const error = new TwyrJSONAPIError(`Error executing reset password`);
			error.addErrorObject(err);

			throw error;
		})
		.then((status) => {
			response.status(200).json({
				'status': status,
				'responseText': 'Reset Password Successful! Please check your email for details'
			});

			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrJSONAPIError)) {
				error = new TwyrJSONAPIError(`Error sending reset password response`);
				error.addErrorObject(err);
			}

			next(error);
		});
	}

	_registerAccount(request, response, next) {
		this._dummyAsync()
		.then(() => {
			const apiService = this.$dependencies.ApiService;
			return apiService.executeAsync('User::registerAccount', [request.body.username, request.body.firstname, request.body.lastname, promises.promisify(response.render.bind(response))]);
		})
		.catch((err) => {
			if(err instanceof TwyrJSONAPIError) throw err;

			const error = new TwyrJSONAPIError(`Error executing register account`);
			error.addErrorObject(err);

			throw error;
		})
		.then((status) => {
			response.status(200).json({
				'status': status,
				'responseText': 'Account Registration Successful! Please check your email for details'
			});

			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrJSONAPIError)) {
				error = new TwyrJSONAPIError(`Error sending register account response`);
				error.addErrorObject(err);
			}

			next(error);
		});
	}

	get basePath() { return __dirname; }
}

exports.component = Sessions;
