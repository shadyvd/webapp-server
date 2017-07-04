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

const _errors = Symbol();
class TwyrJSONAPIError extends TwyrComponentError {
	constructor(message, inner) {
		super(message, inner);
		this[_errors] = [];
	}

	addErrorObject(errorObject) {
		if(!(errorObject instanceof Error))
			return;

		const jsonErrorObject = {
			'status': errorObject.status || errorObject.code || 400,
			'source': errorObject.source || { 'pointer': '/data' },
			'title': errorObject.title || errorObject.message || this.message,
			'detail': errorObject.detail || errorObject.stack || errorObject.message || this.message
		};


		this[_errors].push(jsonErrorObject);
	}

	toString() {
		let errstr = `\n${this.stack}\n`;
		errstr += `\n${JSON.stringify(this[_errors], undefined, '\t')}\n`;

		if(!this.inner) return errstr;

		if(!(this.inner instanceof TwyrBaseError))
			return `\n${errstr}\n\n========>>\n\n${this.inner.stack}\n`;

		return `\n${errstr}\n\n========>>\n${this.inner.toString()}\n`;
	}

	toJSON() {
		const jsonAPIErrorObject = {
			'errors': this.errors
		};

		return jsonAPIErrorObject;
	}

	get errors() { return this[_errors]; }
}

exports.TwyrComponentError = TwyrComponentError;
exports.TwyrJSONAPIError = TwyrJSONAPIError;
