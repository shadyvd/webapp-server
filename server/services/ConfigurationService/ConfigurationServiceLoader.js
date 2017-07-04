/**
 * @file      server/services/ConfigurationService/ConfigurationServiceLoader.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Configuration Service dependency manager and service loader
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
const TwyrBaseError = require('./../../TwyrBaseError').TwyrBaseError,
	TwyrServiceLoader = require('./../TwyrServiceLoader').TwyrServiceLoader;

class ConfigurationServiceLoader extends TwyrServiceLoader {
	constructor(module) {
		super(module);
	}

	load(configSrvc, basePath, callback) {
		let loadStatus = null;

		this._dummyAsync()
		.then(() => {
			const superLoadAsync = promises.promisify(super.load.bind(this));
			return superLoadAsync(configSrvc, basePath);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			const error = new TwyrBaseError(`${this.name}::load: Error`, err);
			throw error;
		})
		.then((status) => {
			loadStatus = status;
			return this.$module.initializeAsync();
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			this.initStatus = false;
			this.initErr = new TwyrBaseError(`${this.name}::initialize: Error`, err);
		})
		.then((initStatus) => {
			if(!!this.initErr) {
				this.initStatus = initStatus;
				this.initErr = null;
			}

			return this.$module.startAsync(null);
		})
		.catch((err) => {
			if(err instanceof TwyrBaseError) throw err;

			this.startStatus = false;
			this.startErr = new TwyrBaseError(`${this.name}::start: Error`, err);
		})
		.then((startStatus) => {
			if(!!this.startErr) {
				this.startStatus = startStatus;
				this.startErr = null;
			}

			return null;
		})
		.then(() => {
			if(callback) callback(null, loadStatus);
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
		if(this.initStatus !== undefined) {
			if(callback) callback(this.initErr, this.initStatus);
			return;
		}

		super.initialize(callback);
	}

	start(callback) {
		if(this.startStatus !== undefined) {
			if(callback) callback(this.startErr, this.startStatus);
			return;
		}

		super.start(callback);
	}
}

exports.ConfigurationServiceLoader = ConfigurationServiceLoader;
