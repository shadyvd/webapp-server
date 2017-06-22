/**
 * @file      tests/server/services/ConfigurationService.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      Test cases for the Configuration Service
 *
 */

'use strict';

const chai = require('chai'),
	path = require('path'),
	promises = require('bluebird'),
	uuid = require('uuid');

const applicationName = 'TwyrWebApp',
	assert = chai.assert;

describe('Configuration Service Test Cases', () => {
	// Step 1: Instantiate the Application class for the Server
	const TwyrWebApp = require(path.join(path.dirname(require.main.filename), 'server/TwyrWebApp')).TwyrWebApp;

	const application = promises.promisifyAll(new TwyrWebApp(applicationName, uuid.v4().toString().replace(/-/g, ''), 1), {
		'filter': function() {
			return true;
		}
	});

	// Test Set #1: Basic Instantiation tests
	describe('Instantiate', () => {
		// Step 1.1: Instantiate the Configuration Service
		const ConfigurationService = require(path.join(path.dirname(require.main.filename), 'server/services/ConfigurationService/service')).service,
			TwyrBaseService = require(path.join(path.dirname(require.main.filename), 'server/services/TwyrBaseService')).TwyrBaseService;

		const srvcInstance = promises.promisifyAll(new ConfigurationService(application), {
			'filter': function() {
				return true;
			}
		});

		// Test #1.1: Assert that the service has a valid signature
		it('Should be an instanceOf TwyrBaseService', () => {
			assert.instanceOf(srvcInstance, TwyrBaseService);
		});

		// Test #1.2: Assert that the loader is an instanceOf the Base Loader
		const TwyrModuleLoader = require(path.join(path.dirname(require.main.filename), 'server/TwyrModuleLoader')).TwyrModuleLoader;
		it('Loader should be an instanceOf TwyrModuleLoader', () => {
			assert.instanceOf(srvcInstance.$loader, TwyrModuleLoader);
		});
	});

	// Test Set #2: Module lifecycle tests
	describe('Lifecycle Hooks Test Cases', () => {
		const ConfigurationService = require(path.join(path.dirname(require.main.filename), 'server/services/ConfigurationService/service')).service;

		const srvcInstance = promises.promisifyAll(new ConfigurationService(application), {
			'filter': function() {
				return true;
			}
		});

		const expectedStatus = [{
			'type': 'services',
			'status': {
				'DatabaseConfigurationService': true,
				'DotEnvConfigurationService': true,
				'FileConfigurationService': true,
				'RedisConfigurationService': true
			}
		}];

		// Test #2.1: Assert that the service loads without error
		it('Load test', (done) => {
			srvcInstance.loadAsync(null)
				.then((status) => {
					assert.deepEqual(status, expectedStatus);
					if(done) done(null, status);
				})
				.catch((err) => {
					if(done) done(err);
				});
		});

		// Test #2.6: Assert that the service unloads without error
		it('Unload test', (done) => {
			srvcInstance.unloadAsync()
				.then((status) => {
					assert.deepEqual(status, expectedStatus);
					if(done) done(null, status);
				})
				.catch((err) => {
					if(done) done(err);
				});
		});
	});
});
