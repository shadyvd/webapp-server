/**
 * @file      server/services/TwyrBaseService.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Base Class for Services - providing common functionality required for all services
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
const TwyrBaseModule = require('./../TwyrBaseModule').TwyrBaseModule;

class TwyrBaseService extends TwyrBaseModule {
	constructor(module, loader) {
		super(module, loader);

		const TwyrSrvcLoader = require('./TwyrServiceLoader').TwyrServiceLoader;

		const actualLoader = loader || promises.promisifyAll(new TwyrSrvcLoader(this), {
			'filter': () => {
				return true;
			}
		});

		this.$loader = actualLoader;
	}

	get Interface() { return this; }
	get basePath() { return __dirname; }
}

exports.TwyrBaseService = TwyrBaseService;
