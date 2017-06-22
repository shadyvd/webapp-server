/**
 * @file      server/TwyrBaseError.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application' Base Error - extends the JS native "Error" and makes it easier for typing
 * 				Based on {@link https://stackoverflow.com/a/32749533|Lee Benson's answer to Extending Error in Javascript with ES6 syntax}
 *
 */

'use strict';

/**
 * Module dependencies, required for ALL Twy'r' modules
 * @ignore
 */
// const promises = require('bluebird');

/**
 * Module dependencies, required for this module
 * @ignore
 */

class TwyrBaseError extends Error {
	constructor(message) {
		super(message);
		Error.captureStackTrace(this, this.constructor);
	}

	get name() { return this.constructor.name; }
}

exports.TwyrBaseError = TwyrBaseError;
