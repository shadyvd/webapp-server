/**
 * @file      server/services/AuthService/strategies/local.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Local Authentication Integration
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

exports.strategy = function() {
	const bcrypt = promises.promisifyAll(require('bcrypt-nodejs'));
	const LocalStrategy = require('passport-local').Strategy;

	const auth = this.Interface,
		databaseSrvc = this.$dependencies.DatabaseService,
		loggerSrvc = this.$dependencies.LoggerService;

	const User = databaseSrvc.Model.extend({
		'tableName': 'users',
		'idAttribute': 'id'
	});

	auth.use('twyr-local', new LocalStrategy({ 'passReqToCallback': true }, (request, username, password, callback) => {
		if(!this.$config.strategies.local.enabled) {
			if(callback) callback(new Error('Username / Password Authentication has been disabled'));
			return;
		}

		new User({ 'email': username })
		.fetch()
		.then((userRecord) => {
			if(!userRecord) throw new Error('Invalid Credentials - please try again');
			return promises.all([userRecord, bcrypt.compareAsync(password, userRecord.get('password'))]);
		})
		.then((results) => {
			const credentialMatch = results.pop(),
				userRecord = results.pop();

			if(!credentialMatch) throw new Error('Invalid Credentials - please try again');
			if(callback) callback(null, userRecord.toJSON());

			return null;
		})
		.catch((err) => {
			loggerSrvc.error(`Error logging in user: ${err.stack}`);
			if(callback) callback(err);
		});
	}));
};

