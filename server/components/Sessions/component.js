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
const TwyrBaseComponent = require('./../TwyrBaseComponent').TwyrBaseComponent;

class Sessions extends TwyrBaseComponent {
	constructor(module) {
		super(module);
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
			if(callback) callback(err);
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
		.then((componentJS) => {
			if(callback) callback(null, componentJS);
			return null;
		})
		.catch((err) => {
			const loggerSrvc = this.$dependencies.LoggerService;
			loggerSrvc.error(`${this.name}::_getEmberComponents:\nUser: ${user}\nMediaType: ${mediaType}\nError: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	_getEmberComponentHTMLs(tenant, user, mediaType, renderer, callback) {
		const path = require('path');
		const loggerSrvc = this.$dependencies.LoggerService;

		this._dummyAsync()
		.then(() => {
			const components = user.id === 'ffffffff-ffff-4fff-ffff-ffffffffffff' ? ['login-widget'] : ['logout-widget'],
				promiseResolutions = [];

			components.forEach((component) => {
				promiseResolutions.push(renderer(path.join(this.basePath, `ember/componentHTMLs/${component}.ejs`)));
			});

			return promises.all(promiseResolutions);
		})
		.then((componentHTML) => {
			if(callback) callback(null, componentHTML);
			return null;
		})
		.catch((err) => {
			loggerSrvc.error(`${this.name}::_getEmberComponentHTMLs:\nUser: ${user}\nMediaType: ${mediaType}\nError: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	_login(request, response) {
		const apiService = this.$dependencies.ApiService,
			loggerSrvc = this.$dependencies.LoggerService;

		loggerSrvc.debug(`Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${request.body.username}\n`);
		response.type('application/javascript');

		this._dummyAsync()
		.then(() => {
			return apiService.executeAsync('User::login', [request.user, request.device.type]);
		})
		.then(() => {
			response.status(200).json({
				'status': request.isAuthenticated(),
				'responseText': 'Login Successful! Redirecting...'
			});
		})
		.catch((err) => {
			loggerSrvc.error(`Error Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${JSON.stringify(request.body, undefined, '\t')}\nError: ${err.stack}\n`);
			response.status(200).json({
				'status': false,
				'responseText': err.stack.split('\n', 1)[0].replace('error: ', '').trim()
			});
		});
	}

	_logout(request, response) {
		const apiService = this.$dependencies.ApiService,
			loggerSrvc = this.$dependencies.LoggerService;

		loggerSrvc.debug(`Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${request.body.username}\n`);
		response.type('application/javascript');

		this._dummyAsync()
		.then(() => {
			return apiService.executeAsync('User::logout', [request.user, request.device.type]);
		})
		.then(() => {
			request.logout();
			response.status(200).json({ 'status': !request.isAuthenticated() });

			return null;
		})
		.catch((err) => {
			loggerSrvc.error(`Error Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${JSON.stringify(request.body, undefined, '\t')}\nError: ${err.stack}\n`);
			response.status(200).json({
				'status': false,
				'responseText': err.stack.split('\n', 1)[0].replace('error: ', '').trim()
			});
		});
	}

	_resetPassword(request, response) {
		const apiService = this.$dependencies.ApiService,
			loggerSrvc = this.$dependencies.LoggerService;

		loggerSrvc.debug(`Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${request.body.username}\n`);
		response.type('application/javascript');

		this._dummyAsync()
		.then(() => {
			return apiService.executeAsync('User::resetPassword', [request.body.username, promises.promisify(response.render.bind(response))]);
		})
		.then((status) => {
			response.status(200).json({
				'status': status,
				'responseText': 'Reset Password Successful! Please check your email for details'
			});

			return null;
		})
		.catch((err) => {
			loggerSrvc.error(`Error Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${JSON.stringify(request.body, undefined, '\t')}\nError: ${err.stack}\n`);
			response.status(200).json({
				'status': false,
				'responseText': err.stack.split('\n', 1)[0].replace('error: ', '').trim()
			});
		});
	}

	_registerAccount(request, response) {
		const apiService = this.$dependencies.ApiService,
			loggerSrvc = this.$dependencies.LoggerService;

		loggerSrvc.debug(`Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${request.body.username}\n`);
		response.type('application/javascript');

		this._dummyAsync()
		.then(() => {
			return apiService.executeAsync('User::registerAccount', [request.body.username, request.body.firstname, request.body.lastname, promises.promisify(response.render.bind(response))]);
		})
		.then((status) => {
			response.status(200).json({
				'status': status,
				'responseText': 'Account Registration Successful! Please check your email for details'
			});

			return null;
		})
		.catch((err) => {
			loggerSrvc.error(`Error Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${JSON.stringify(request.body, undefined, '\t')}\nError: ${err.stack}\n`);
			response.status(200).json({
				'status': false,
				'responseText': err.stack.split('\n', 1)[0].replace('error: ', '').trim()
			});
		});
	}

	get basePath() { return __dirname; }
	get dependencies() { return ['ApiService', 'AuthService', 'ConfigurationService', 'ExpressService', 'LoggerService']; }
}

exports.component = Sessions;
