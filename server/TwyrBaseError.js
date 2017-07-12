/**
 * @file      server/TwyrBaseError.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @summary   The Twy'r Web Application' Base Error - extends the JS native "Error" and makes it easier for typing
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

/**
 * Private variables exposed only using getter / setter
 * @ignore
 */
const _innerError = Symbol();

class TwyrBaseError extends Error {
	constructor(message, inner) {
		if(inner && !(inner instanceof Error)) throw new Error('Inner Errors must be instances of Error');

		super(message);
		this[_innerError] = inner;

		Error.captureStackTrace(this, this.constructor);
	}

	toString() {
		const errstr = `\n${this.stack}\n`;
		if(!this.inner) return errstr;

		if(!(this.inner instanceof TwyrBaseError))
			return `\n${errstr}\n\n========>>\n\n${this.inner.stack}\n`;

		return `\n${errstr}\n\n========>>\n${this.inner.toString()}\n`;
	}

	get name() { return this.constructor.name; }
	get inner() { return this[_innerError]; }
}

exports.TwyrBaseError = TwyrBaseError;
