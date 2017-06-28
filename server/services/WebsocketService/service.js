/**
 * @file      server/services/WebsocketService/service.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Websocket Service - based on Primus using WS Transformer
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
const TwyrBaseService = require('./../TwyrBaseService').TwyrBaseService;

class WebsocketService extends TwyrBaseService {
	constructor(module) {
		super(module);
	}

	start(dependencies, callback) {
		this._dummyAsync()
		.then(() => {
			const superStartAsync = promises.promisify(super.start.bind(this));
			return superStartAsync(dependencies);
		})
		.then((status) => {
			return promises.all([status, this._setupPrimusAsync()]);
		})
		.then((status) => {
			if(callback) callback(null, status[0]);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	stop(callback) {
		this._dummyAsync()
		.then(() => {
			const superStopAsync = promises.promisify(super.stop.bind(this));
			return superStopAsync();
		})
		.then((status) => {
			return promises.all([status, this._teardownPrimusAsync()]);
		})
		.then((status) => {
			if(callback) callback(null, status[0]);
			return null;
		})
		.catch((teardownErr) => {
			if(callback) callback(teardownErr);
		});
	}

	_reconfigure(config, callback) {
		if(!this.$enabled) {
			this.$config = JSON.parse(JSON.stringify(config));
			if(callback) callback();
			return;
		}

		this._dummyAsync()
		.then(() => {
			return this._teardownPrimusAsync();
		})
		.then(() => {
			this.$config = config;
			return this._setupPrimusAsync();
		})
		.then(() => {
			const superReconfigureAsync = promises.promisify(super._reconfigure.bind(this));
			return superReconfigureAsync(config);
		})
		.then((status) => {
			if(callback) callback(null, status);
			return null;
		})
		.catch((err) => {
			this.$dependencies.LoggerService.error(`${this.name}::_reconfigure:\n${err.stack}`);
			if(callback) callback(err);
		});
	}

	_dependencyReconfigure(dependency, callback) {
		if(dependency.name !== 'ExpressService') {
			if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name}::_dependencyReconfigure: ${dependency.name}`);

			if(callback) callback(null, true);
			return;
		}

		this._dummyAsync()
		.then(() => {
			return this._teardownPrimusAsync();
		})
		.then(() => {
			return this._setupPrimusAsync();
		})
		.then(() => {
			if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name}::_dependencyReconfigure: ${dependency.name}`);
			if(callback) callback(null, true);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_setupPrimus(callback) {
		const PrimusRooms = require('primus-rooms'),
			PrimusServer = require('primus');

		const cookieParser = require('cookie-parser'),
			device = require('express-device'),
			session = require('express-session'),
			url = require('url'),
			uuid = require('uuid');

		const SessionStore = require(`connect-${this.$config.session.store.media}`)(session);
		const _sessionStore = new SessionStore({
			'client': this.$dependencies.CacheService,
			'prefix': this.$config.session.store.prefix,
			'ttl': this.$config.session.ttl
		});

		const _cookieParser = cookieParser(this.$config.session.secret, this.$config.cookieParser);
		const _session = session({
			'cookie': this.$config.cookieParser,
			'key': this.$config.session.key,
			'secret': this.$config.session.secret,
			'store': _sessionStore,
			'saveUninitialized': false,
			'resave': false,

			'genid': () => {
				return uuid.v4().toString().replace(/-/g, '');
			}
		});

		const setupRequestResponseForAudit = (request, response, next) => {
			request.twyrId = uuid.v4().toString();
			next();
		};

		const tenantSetter = (request, response, next) => {
			const cacheSrvc = this.$dependencies.CacheService,
				dbSrvc = this.$dependencies.DatabaseService.knex,
				urlParts = url.parse(request.url);

			if(!request.session.passport)
				request.session.passport = {};

			if(!request.session.passport.user)
				request.session.passport.user = 'ffffffff-ffff-4fff-ffff-ffffffffffff';

			let tenantSubDomain = (urlParts.hostname || `www${this.$config.cookieParser.domain}`).replace(this.$config.cookieParser.domain, '');
			if(this.$config.subdomainMappings && this.$config.subdomainMappings[tenantSubDomain])
				tenantSubDomain = this.$config.subdomainMappings[tenantSubDomain];

			request.tenant = tenantSubDomain;

			cacheSrvc.getAsync(`tenant!subdomain!${tenantSubDomain}!id`)
			.then((tenantId) => {
				if(tenantId) return [{ 'rows': [{ 'id': tenantId }] }, false];
				return promises.all([dbSrvc.raw('SELECT id FROM tenants WHERE sub_domain = ?', [tenantSubDomain]), true]);
			})
			.then((results) => {
				const shouldCache = results[1],
					tenantId = results[0].rows[0].id;

				if(!tenantId) throw new Error(`Invalid sub-domain: ${tenantSubDomain}`);
				request.tenantId = tenantId;

				if(!shouldCache)
					return;

				const cacheMulti = promises.promisifyAll(cacheSrvc.multi());
				cacheMulti.setAsync(`twyr!webapp!tenant!subdomain!${tenantSubDomain}!id`, tenantId);
				cacheMulti.expireAsync(`twyr!webapp!tenant!subdomain!${tenantSubDomain}!id`, 43200);

				return cacheMulti.execAsync();
			})
			.then(() => {
				next();
			})
			.catch((err) => {
				next(err);
			});
		};

		// Step 1: Setup the realtime streaming server
		const thisConfig = JSON.parse(JSON.stringify(this.$config.primus));
		this.$websocketServer = new PrimusServer(this.$dependencies.ExpressService.$server, thisConfig);

		// Step 2: Put in the middlewares we need
		this.$websocketServer.use('cookieParser', _cookieParser, undefined, 0);
		this.$websocketServer.use('session', _session, undefined, 1);
		this.$websocketServer.use('device', device.capture(), undefined, 2);
		this.$websocketServer.use('auditStuff', setupRequestResponseForAudit, 3);
		this.$websocketServer.use('tenantSetter', tenantSetter, undefined, 4);
		this.$websocketServer.use('passportInit', this.$dependencies.AuthService.initialize(), undefined, 5);
		this.$websocketServer.use('passportSession', this.$dependencies.AuthService.session(), undefined, 6);

		// Step 3: Authorization hook
		this.$websocketServer.authorize(this._authorizeWebsocketConnection.bind(this));

		// Step 4: Primus extensions...
		this.$websocketServer.plugin('rooms', PrimusRooms);

		// Step 5: Attach the event handlers...
		this.$websocketServer.on('initialised', this._websocketServerInitialised.bind(this));
		this.$websocketServer.on('log', this._websocketServerLog.bind(this));
		this.$websocketServer.on('error', this._websocketServerError.bind(this));

		// Step 6: Log connection / disconnection events
		this.$websocketServer.on('connection', this._websocketServerConnection.bind(this));
		this.$websocketServer.on('disconnection', this._websocketServerDisconnection.bind(this));

		// And we're done...
		if(callback) callback(null, true);
		return null;
	}

	_teardownPrimus(callback) {
		if(this.$websocketServer) {
			this.$websocketServer.end({
				'close': false,
				'reconnect': true,
				'timeout': 10
			});

			delete this.$websocketServer;
		}

		if(callback) callback(null, true);
		return null;
	}

	_authorizeWebsocketConnection(request, callback) {
		if(callback) callback(!request.user);
	}

	_websocketServerInitialised(transformer, parser, options) {
		const loggerSrvc = this.$dependencies.LoggerService;
		if((process.env.NODE_ENV || 'development') === 'development') loggerSrvc.debug(`Websocket Server has been initialised with options`, JSON.stringify(options, undefined, '\t'));
	}

	_websocketServerLog() {
		const loggerSrvc = this.$dependencies.LoggerService;
		if((process.env.NODE_ENV || 'development') === 'development') loggerSrvc.debug(`Websocket Server Log`, JSON.stringify(arguments, undefined, '\t'));
	}

	_websocketServerError() {
		const loggerSrvc = this.$dependencies.LoggerService;
		loggerSrvc.error(`Websocket Server Error`, JSON.stringify(arguments, undefined, '\t'));

		this.emit('websocket-error', arguments);
	}

	_websocketServerConnection(spark) {
		const username = spark.request.user ? `${spark.request.user.first_name} ${spark.request.user.last_name}` : 'Anonymous';

		if((process.env.NODE_ENV || 'development') === 'development') {
			const loggerSrvc = this.$dependencies.LoggerService;
			loggerSrvc.debug(`Websocket Connection for user`, username);
		}

		this.emit('websocket-connect', spark);
		spark.write({ 'channel': 'display-status-message', 'data': `Realtime Data connection established for User: ${username}` });
	}

	_websocketServerDisconnection(spark) {
		if((process.env.NODE_ENV || 'development') === 'development') {
			const loggerSrvc = this.$dependencies.LoggerService;
			const username = spark.request.user ? `${spark.request.user.first_name} ${spark.request.user.last_name}` : 'Anonymous';

			loggerSrvc.debug(`Websocket Disconnected for user`, username);
		}

		this.emit('websocket-disconnect', spark);
		spark.leaveAll();
		spark.removeAllListeners();
	}

	get Interface() { return this.$websocketServer; }
	get basePath() { return __dirname; }
	get dependencies() { return ['AuditService', 'AuthService', 'ConfigurationService', 'CacheService', 'DatabaseService', 'ExpressService', 'LocalizationService', 'LoggerService']; }
}

exports.service = WebsocketService;
