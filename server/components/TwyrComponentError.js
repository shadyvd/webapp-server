/**
 * @file      server/components/TwyrComponentError.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Components Base Error
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
const TwyrBaseError = require('./../TwyrBaseError').TwyrBaseError;

class TwyrComponentError extends TwyrBaseError {
	constructor(message, inner) {
		super(message, inner);
	}
}

exports.TwyrComponentError = TwyrComponentError;
