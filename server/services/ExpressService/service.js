/**
 * @file      server/services/ExpressService/service.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Webserver Service - based on Express and node.js HTTP/HTTPS modules
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

class ExpressService extends TwyrBaseService {
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
			return promises.all([status, this._setupExpressAsync()]);
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
			return promises.all([status, this._teardownExpressAsync()]);
		})
		.then((status) => {
			if(callback) callback(null, status[0]);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
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
			return this._teardownExpressAsync();
		})
		.then(() => {
			this.$config = config;

			return this._setupExpressAsync();
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

	_setupExpress(callback) {
		if(this.$server) {
			if(callback) callback(null, true);
			return;
		}

		// Step 1: Require the Web Server
		const acceptOverride = require('connect-acceptoverride'),
			bodyParser = require('body-parser'),
			compress = require('compression'),
			cookieParser = require('cookie-parser'),
			cors = require('cors'),
			debounce = require('connect-debounce'),
			device = require('express-device'),
			engines = require('consolidate'),
			express = require('express'),
			favicon = require('serve-favicon'),
			flash = require('connect-flash'),
			fs = require('fs-extra'),
			i18n = require('i18n'),
			logger = require('morgan'),
			methodOverride = require('method-override'),
			moment = require('moment'),
			path = require('path'),
			poweredBy = require('connect-powered-by'),
			serveStatic = require('serve-static'),
			session = require('express-session'),
			timeout = require('connect-timeout'),
			uuid = require('uuid');

		const filesystem = promises.promisifyAll(fs);
		const SessionStore = require(`connect-${this.$config.session.store.media}`)(session);
		const loggerSrvc = this.$dependencies.LoggerService;

		// Step 2: Setup Winston for Express Logging
		const loggerStream = {
			'write': (message) => {
				loggerSrvc.silly(message);
			}
		};

		// Step 3: Setup CORS configuration
		const corsOptions = {
			'origin': (origin, corsCallback) => {
				if(!this.$config.corsAllowedDomains) {
					callback(null, true);
					return;
				}

				const isAllowedOrigin = this.$config.corsAllowedDomains.indexOf(origin) !== -1;
				if(corsCallback) corsCallback(null, isAllowedOrigin);
			},

			'credentials': true
		};

		// Step 4: Setup Session Store, etc.
		const _sessionStore = new SessionStore({
			'client': this.$dependencies.CacheService,
			'prefix': this.$config.session.store.prefix,
			'ttl': this.$config.session.ttl
		});

		this.$config.cookieParser.maxAge = moment().add(10, 'year').valueOf();
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

		const i18Config = JSON.parse(JSON.stringify(this.$config.i18n));
		i18Config.directory = path.isAbsolute(i18Config.directory) ? i18Config.directory : path.join(path.dirname(require.main.filename), i18Config.directory);
		i18Config.logDebugFn = (message) => { loggerSrvc.debug(message); };
		i18Config.logWarnFn = (message) => { loggerSrvc.warn(message); };
		i18Config.logErrorFn = (message) => { loggerSrvc.error(message); };

		i18n.configure(this.$config.i18n);

		// Step 5: Setup Express
		const webServer = express();
		this.$express = webServer;

		webServer.set('view engine', this.$config.templateEngine);
		webServer.engine(this.$config.templateEngine, engines[this.$config.templateEngine]);

		if(this.$config.cookieParser.secure)
			webServer.set('trust proxy', 1);

		webServer
		.use(logger('combined', {
			'stream': loggerStream
		}))
		.use((request, response, next) => {
			if(!this.$enabled) {
				response.status(500).redirect('/error');
				return;
			}

			next();
		})
		.use(debounce())
		.use(cors(corsOptions))
		.use(favicon(path.join(__dirname, this.$config.favicon)))
		.use(acceptOverride())
		.use(methodOverride())
		.use(compress())
		.use(poweredBy(this.$config.poweredBy))
		.use(timeout(this.$config.requestTimeout * 1000))
		.use(serveStatic(path.join(this.basePath, this.$config.static.path || 'static'), {
			'index': this.$config.static.index || 'index.html',
			'maxAge': this.$config.static.maxAge || 300
		}))
		.use(flash())
		.use(_cookieParser)
		.use(_session)
		.use(i18n.init)
		.use((request, response, next) => {
			response.cookie('twyr-webapp-locale', request.getLocale(), this.$config.cookieParser);
			next();
		})
		.use((request, response, next) => {
			const cacheSrvc = this.$dependencies.CacheService,
				dbSrvc = this.$dependencies.DatabaseService.knex;

			if(!request.session.passport)
				request.session.passport = {};

			if(!request.session.passport.user)
				request.session.passport.user = 'ffffffff-ffff-4fff-ffff-ffffffffffff';

			let tenantSubDomain = request.hostname.replace(this.$config.cookieParser.domain, '');
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
				const requestDomain = require('domain').create();
				requestDomain.add(request);
				requestDomain.add(response);

				requestDomain.on('error', (error) => {
					loggerSrvc.error(`Error Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${JSON.stringify(request.body, undefined, '\t')}\nError: ${error.stack}`);
					response.status(500).redirect('/error');
				});

				next();
			})
			.catch((err) => {
				next(err);
			});
		})
		.use(bodyParser.raw({
			'limit': this.$config.maxRequestSize
		}))
		.use(bodyParser.urlencoded({
			'extended': true,
			'limit': this.$config.maxRequestSize
		}))
		.use(bodyParser.json({
			'limit': this.$config.maxRequestSize
		}))
		.use(bodyParser.json({
			'type': 'application/vnd.api+json',
			'limit': this.$config.maxRequestSize
		}))
		.use(bodyParser.text({
			'limit': this.$config.maxRequestSize
		}))
		.use(device.capture())
		.use(this.$dependencies.AuthService.initialize())
		.use(this.$dependencies.AuthService.session());

		// Convenience....
		device.enableDeviceHelpers(webServer);

		// Step 6: Create the Server
		const protocol = require(this.$config.protocol || 'http');
		if((this.$config.protocol || 'http') === 'http')
			this.$server = promises.promisifyAll(protocol.createServer(webServer));
		else {
			this.$config.ssl.key = filesystem.readFileSync(path.join(__dirname, this.$config.ssl.key));
			this.$config.ssl.cert = filesystem.readFileSync(path.join(__dirname, this.$config.ssl.cert));

			this.$server = promises.promisifyAll(protocol.createServer(this.$config.ssl, webServer));
		}

		// Step 7: Setup start flow listening
		this.$server.once('error', (error) => {
			if(callback) callback(error);
		});

		this.$server.once('listening', () => {
			this.$server.on('connection', this._serverConnection.bind(this));
			this.$server.on('error', this._serverError.bind(this));

			if(callback) callback(null, true);
		});

		// Step 8: Start listening...
		this.$express.set('port', this.$config.port[this.$module.name]);
		this.$server.listen(this.$config.port[this.$module.name] || 9090);

		// Miscellaneous...
		this.$express.$server = this.$server;
	}

	_teardownExpress(callback) {
		if(!this.$server) {
			if(callback) callback(null, true);
			return;
		}

		this._dummyAsync()
		.then(() => {
			if(this.$server.listening)
				return this.$server.closeAsync();
			else
				return undefined;
		})
		.then(() => {
			this.$express._router.stack.length = 0;

			this.$server.removeAllListeners('connection');
			this.$server.removeAllListeners('error');

			delete this.$express.$server;

			delete this.$express;
			delete this.$server;

			if(callback) callback(null, true);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_serverConnection(socket) {
		socket.setTimeout(this.$config.connectionTimeout * 1000);
	}

	_serverError(error) {
		this.$dependencies.LoggerService.error(`Server Error: ${error.stack}`);
	}

	get Interface() { return this.$express; }
	get basePath() { return __dirname; }
	get dependencies() { return ['AuthService', 'CacheService', 'ConfigurationService', 'DatabaseService', 'LoggerService']; }
}

exports.service = ExpressService;
