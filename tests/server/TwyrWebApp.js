/**
 * @file      tests/server/TwyrWebApp.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      Test cases for the Twy'r Web Application class
 *
 */

'use strict';

const assert = require('chai').assert,
	path = require('path'),
	promises = require('bluebird'),
	uuid = require('uuid');

const applicationName = 'TwyrWebApp';

// INFO: THIS IS ABSOLUTELY CRITICAL - Needs to be done for every test case
require.main.filename = path.join(path.dirname(require.main.filename), './../../../index.js');

describe('Application Class Test Cases', function() {
	describe('Instantiate', function() {
		const TwyrBaseModule = require(path.join(path.dirname(require.main.filename), 'server/TwyrBaseModule')).TwyrBaseModule,
			TwyrWebApp = require(path.join(path.dirname(require.main.filename), 'server/TwyrWebApp')).TwyrWebApp;

		const application = promises.promisifyAll(new TwyrWebApp(applicationName, uuid.v4().toString().replace(/-/g, ''), 1), {
			'filter': function() {
				return true;
			}
		});

		it('TwyrWebApp should be an instanceOf TwyrBaseModule', function() {
			assert.instanceOf(application, TwyrBaseModule);
		});
	});
});
