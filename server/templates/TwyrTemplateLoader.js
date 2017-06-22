/**
 * @file      app/templates/TwyrTemplateLoader.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Templates dependency manager and template loader
 *
 */

'use strict';

/**
 * Module dependencies, required for ALL Twy'r modules
 * @ignore
 */
// const promises = require('bluebird');

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrModuleLoader = require('./../TwyrModuleLoader').TwyrModuleLoader;

class TwyrTemplateLoader extends TwyrModuleLoader {
	constructor(module) {
		super(module);
	}

	load(configSrvc, basePath, callback) {
		if(callback) callback(null, true);
	}

	initialize(callback) {
		if(callback) callback(null, true);
	}

	start(callback) {
		if(callback) callback(null, true);
	}

	stop(callback) {
		if(callback) callback(null, true);
	}

	uninitialize(callback) {
		if(callback) callback(null, true);
	}

	unload(callback) {
		if(callback) callback(null, true);
	}
}

exports.TwyrTemplateLoader = TwyrTemplateLoader;
