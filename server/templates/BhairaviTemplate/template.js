/**
 * @file      server/templates/Bhairavi/template.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @summary   The Twy'r Web Application Bhairavi Template
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
const TwyrBaseTemplate = require('./../TwyrBaseTemplate').TwyrBaseTemplate;

class BhairaviTemplate extends TwyrBaseTemplate {
	constructor(module, loader) {
		super(module, loader);
	}

	get basePath() { return __dirname; }
}

exports.template = BhairaviTemplate;
