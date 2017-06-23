/**
 * @file      server/services/LoggerService/service.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Logger Service
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

class LoggerService extends TwyrBaseService {
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
			return promises.all([status, this._setupWinstonAsync()]);
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
			return promises.all([status, this._teardownWinstonAsync()]);
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
			return this._teardownWinstonAsync();
		})
		.then(() => {
			this.$config = config;
			return this._setupWinstonAsync();
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

	_setupWinston(callback) {
		const path = require('path'),
			winston = require('winston');

		const config = this.$config,
			rootPath = path.dirname(require.main.filename),
			transports = [];

		this.$winston = new winston.Logger({
			'transports': [new winston.transports.Console()]
		});

		for(const transportIdx in config) {
			if(!Object.prototype.hasOwnProperty.call(config, transportIdx) && !{}.hasOwnProperty.call(config, transportIdx))
				continue;

			const thisTransport = JSON.parse(JSON.stringify(config[transportIdx]));
			if(thisTransport.filename) {
				const baseName = path.basename(thisTransport.filename, path.extname(thisTransport.filename)),
					dirName = path.isAbsolute(thisTransport.filename) ? path.dirname(thisTransport.filename) : path.join(rootPath, path.dirname(thisTransport.filename));

				thisTransport.filename = path.resolve(path.join(dirName, `${baseName}-${this.$module.$uuid}${path.extname(thisTransport.filename)}`));
			}

			transports.push(new winston.transports[transportIdx](thisTransport));
		}

		// Re-configure with new transports
		this.$winston.configure({
			'transports': transports
		});

		// Ensure the logger isn't crashing the Server :-)
		this.$winston.exitOnError = false;
		this.$winston.emitErrs = false;

		// The first log of this logger instance...
		if((process.env.NODE_ENV || 'development') === 'development')
			this.$winston.debug('\n\nTicking away the packets that make up a dull day...\n\n');

		if(callback) callback();
	}

	_teardownWinston(callback) {
		// The last log of this logger instance...
		if((process.env.NODE_ENV || 'development') === 'development')
			this.$winston.debug('\n\nGoodbye, wi-fi, goodbye...\n\n');

		const config = this.$config,
			winstonInstance = this.$winston;

		for(const transportIdx in config) {
			if(!Object.prototype.hasOwnProperty.call(config, transportIdx) && !{}.hasOwnProperty.call(config, transportIdx))
				continue;

			try {
				winstonInstance.remove(transportIdx);
			}
			catch(err) {
				if((process.env.NODE_ENV || 'development') === 'development') console.error(`Error Removing ${transportIdx} from the Winston instance: ${err.stack}`);
			}
		}

		delete this.$winston;
		if(callback) callback();
	}

	get Interface() { return this.$winston; }
	get basePath() { return __dirname; }
	get dependencies() { return ['ConfigurationService']; }
}

exports.service = LoggerService;
