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
const TwyrServiceError = require('./../TwyrServiceError').TwyrServiceError,
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
			if(err instanceof TwyrServiceError) throw err;

			const error = new TwyrServiceError(`${this.name}::load: Super Load Error`, err);
			throw error;
		})
		.then((status) => {
			loadStatus = status;
			return this.$module.initializeAsync();
		})
		.then((initStatus) => {
			this.initStatus = initStatus;
			this.initErr = null;

			return null;
		})
		.catch((initErr) => {
			this.initStatus = false;
			this.initErr = new TwyrServiceError(`${this.name}::load: Initialize Error`, initErr);
		})
		.then(() => {
			if(this.initErr) return null;
			return this.$module.startAsync(null);
		})
		.then((startStatus) => {
			this.startStatus = startStatus;
			this.startErr = null;

			return startStatus;
		})
		.catch((startErr) => {
			this.startStatus = false;
			this.startErr = new TwyrServiceError(`${this.name}::load: Start Error`, startErr);
		})
		.finally(() => {
			if(callback) callback(null, loadStatus);
			return null;
		});
	}

	initialize(callback) {
		if(!!this.initStatus) {
			if(callback) callback(this.initErr, this.initStatus);
			return;
		}

		super.initialize(callback);
	}

	start(callback) {
		if(!!this.startStatus) {
			if(callback) callback(this.startErr, this.startStatus);
			return;
		}

		super.start(callback);
	}
}

exports.ConfigurationServiceLoader = ConfigurationServiceLoader;
