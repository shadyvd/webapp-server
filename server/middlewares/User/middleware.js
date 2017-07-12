/**
 * @file      server/middlewares/User/middleware.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @summary   The Twy'r Web Application User Middleware - provides functionality for all single-user related operations
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
const TwyrBaseMiddleware = require('./../TwyrBaseMiddleware').TwyrBaseMiddleware;

class User extends TwyrBaseMiddleware {
	constructor(module) {
		super(module);
	}


	start(dependencies, callback) {
		this._dummyAsync()
		.then(() => {
			const superStartAsync = promises.promisify(super.start.bind(this));
			return superStartAsync(dependencies);
		})
		.then((status) => {
			const databaseSrvc = this.$dependencies.DatabaseService,
				self = this;

			// Define the models....
			Object.defineProperty(this, '$UserModel', {
				'__proto__': null,
				'configurable': true,

				'value': databaseSrvc.Model.extend({
					'tableName': 'users',
					'idAttribute': 'id',
					'hasTimestamps': true,

					'profileContacts': function() {
						return this.hasMany(self.$ContactModel, 'login');
					}
				})
			});

			Object.defineProperty(this, '$ContactModel', {
				'__proto__': null,
				'configurable': true,

				'value': databaseSrvc.Model.extend({
					'tableName': 'user_contacts',
					'idAttribute': 'id',
					'hasTimestamps': true,

					'login': function() {
						return this.belongsTo(self.$UserModel, 'login');
					}
				})
			});

			if(callback) callback(null, status);
			return null;
		})
		.catch((startErr) => {
			if(callback) callback(startErr);
		});
	}

	stop(callback) {
		this._dummyAsync()
		.then(() => {
			const superStopAsync = promises.promisify(super.stop.bind(this));
			return superStopAsync();
		})
		.then((status) => {
			delete this.$UserModel;
			delete this.$ContactModel;

			if(callback) callback(null, status);
		})
		.catch((stopErr) => {
			if(callback) callback(stopErr);
		});
	}

	_registerApis(callback) {
		this._dummyAsync()
		.then(() => {
			const apiService = this.$dependencies.ApiService,
				promiseResolutions = [];

			promiseResolutions.push(apiService.addAsync(`${this.name}::login`, this._loginAsync.bind(this)));
			promiseResolutions.push(apiService.addAsync(`${this.name}::logout`, this._logoutAsync.bind(this)));
			promiseResolutions.push(apiService.addAsync(`${this.name}::resetPassword`, this._resetPasswordAsync.bind(this)));
			promiseResolutions.push(apiService.addAsync(`${this.name}::registerAccount`, this._registerAccountAsync.bind(this)));

			promiseResolutions.push(apiService.addAsync(`${this.name}::changePassword`, this._changePasswordAsync.bind(this)));

			promiseResolutions.push(apiService.addAsync(`${this.name}::profile`, this._getProfileAsync.bind(this)));
			promiseResolutions.push(apiService.addAsync(`${this.name}::updateProfile`, this._updateProfileAsync.bind(this)));
			promiseResolutions.push(apiService.addAsync(`${this.name}::deleteProfile`, this._deleteProfileAsync.bind(this)));

			promiseResolutions.push(apiService.addAsync(`${this.name}::contact`, this._getProfileContactAsync.bind(this)));
			promiseResolutions.push(apiService.addAsync(`${this.name}::addContact`, this._addProfileContactAsync.bind(this)));
			promiseResolutions.push(apiService.addAsync(`${this.name}::deleteContact`, this._deleteProfileContactAsync.bind(this)));

			return promises.all(promiseResolutions);
		})
		.then(() => {
			if(callback) callback();
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_deregisterApis(callback) {
		this._dummyAsync()
		.then(() => {
			const apiService = this.$dependencies.ApiService,
				promiseResolutions = [];

			promiseResolutions.push(apiService.removeAsync(`${this.name}::login`, this._loginAsync.bind(this)));
			promiseResolutions.push(apiService.removeAsync(`${this.name}::logout`, this._logoutAsync.bind(this)));
			promiseResolutions.push(apiService.removeAsync(`${this.name}::resetPassword`, this._resetPasswordAsync.bind(this)));
			promiseResolutions.push(apiService.removeAsync(`${this.name}::registerAccount`, this._registerAccountAsync.bind(this)));

			promiseResolutions.push(apiService.removeAsync(`${this.name}::changePassword`, this._changePasswordAsync.bind(this)));

			promiseResolutions.push(apiService.removeAsync(`${this.name}::profile`, this._getProfileAsync.bind(this)));
			promiseResolutions.push(apiService.removeAsync(`${this.name}::updateProfile`, this._updateProfileAsync.bind(this)));
			promiseResolutions.push(apiService.removeAsync(`${this.name}::deleteProfile`, this._deleteProfileAsync.bind(this)));

			promiseResolutions.push(apiService.removeAsync(`${this.name}::contact`, this._getProfileContactAsync.bind(this)));
			promiseResolutions.push(apiService.removeAsync(`${this.name}::addContact`, this._addProfileContactAsync.bind(this)));
			promiseResolutions.push(apiService.removeAsync(`${this.name}::deleteContact`, this._deleteProfileContactAsync.bind(this)));

			return promises.all(promiseResolutions);
		})
		.then(() => {
			if(callback) callback();
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_login(user, mediaType, callback) {
		const loggerSrvc = this.$dependencies.LoggerService;

		loggerSrvc.debug(`Logged in: ${user.first_name} ${user.last_name} from ${mediaType}\n`);
		this.$module.emit('login', user.id, mediaType);

		if(callback) callback();
	}

	_logout(user, mediaType, callback) {
		const cacheSrvc = this.$dependencies.CacheService,
			loggerSrvc = this.$dependencies.LoggerService;

		this._dummyAsync()
		.then(() => {
			loggerSrvc.debug(`Logged out: ${user.first_name} ${user.last_name} from ${mediaType}\n`);
			this.$module.emit('logout', user.id);

			return cacheSrvc.keysAsync(`twyr!webapp!${mediaType}!user!${user.id}*`);
		})
		.then((cachedKeys) => {
			const cacheMulti = promises.promisifyAll(cacheSrvc.multi());
			cachedKeys.forEach((cachedKey) => {
				cacheMulti.delAsync(cachedKey);
			});

			return cacheMulti.execAsync();
		})
		.then(() => {
			if(callback) callback();
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_resetPassword(username, renderer, callback) {
		const databaseSrvc = this.$dependencies.DatabaseService.knex,
			loggerSrvc = this.$dependencies.LoggerService,
			mailerSrvc = this.$dependencies.MailerService;

		this._dummyAsync()
		.then(() => {
			return databaseSrvc.raw('SELECT id FROM users WHERE email = ?', [username]);
		})
		.then((result) => {
			if(!result.rows.length) throw new Error(`User "${username}" not found!`);

			const uuid = require('uuid');

			const randomRequestData = JSON.parse(JSON.stringify(this.$config.randomServer.options));
			randomRequestData.data.id = uuid.v4().toString().replace(/-/g, '');
			randomRequestData.data = JSON.stringify(randomRequestData.data);

			return promises.all([result.rows[0].id, this.$module.$utilities.restCallAsync(this.$config.randomServer.protocol, randomRequestData)]);
		})
		.then((results) => {
			const randomData = results[1] ? JSON.parse(results[1]) : null,
				userId = results[0];

			if(randomData && randomData.error) throw new Error(randomData.error.message);

			const bcrypt = promises.promisifyAll(require('bcrypt-nodejs')),
				newPassword = randomData && randomData.result ? randomData.result.random.data[0] : this._generateRandomPassword();

			return promises.all([newPassword, databaseSrvc.raw('UPDATE users SET password = ? WHERE id = ?', [bcrypt.hashSync(newPassword), userId])]);
		})
		.then((results) => {
			const path = require('path');

			const newPassword = results[0],
				renderOptions = {
					'username': username,
					'password': newPassword
				};

			return renderer(path.join(this.basePath, this.$config.resetPassword.template), renderOptions);
		})
		.then((html) => {
			return mailerSrvc.sendMailAsync({
				'from': this.$config.from,
				'to': username,
				'subject': this.$config.resetPassword.subject,
				'html': html
			});
		})
		.then((notificationResponse) => {
			loggerSrvc.debug('Response from Email Server: ', notificationResponse);

			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_registerAccount(username, firstname, lastname, renderer, callback) {
		const databaseSrvc = this.$dependencies.DatabaseService.knex,
			loggerSrvc = this.$dependencies.LoggerService,
			mailerSrvc = this.$dependencies.MailerService;

		this._dummyAsync()
		.then(() => {
			return databaseSrvc.raw('SELECT id FROM users WHERE email = ?', [username]);
		})
		.then((result) => {
			if(result.rows.length)
				throw new Error(`User "${username}" already exists! Please use the forgot password link to regain access this account!!`);

			const emailExists = promises.promisifyAll(require('email-existence')),
				validator = require('validatorjs');

			const validationData = {
					'username': username && username.trim() === '' ? '' : username,
					'firstname': firstname && firstname.trim() === '' ? '' : firstname,
					'lastname': lastname && lastname.trim() === '' ? '' : lastname
				},
				validationRules = {
					'username': 'required|email',
					'firstname': 'required',
					'lastname': 'required'
				};

			const validationResult = new validator(validationData, validationRules);
			if(validationResult.fails()) throw validationResult.errors.all();

			return emailExists.checkAsync(validationData.username);
		})
		.then((emailExists) => {
			if(!emailExists) throw new Error(`Invalid Email Id: ${username}`);

			const uuid = require('uuid');
			const randomRequestData = JSON.parse(JSON.stringify(this.$config.randomServer.options));
			randomRequestData.data.id = uuid.v4().toString().replace(/-/g, '');
			randomRequestData.data = JSON.stringify(randomRequestData.data);

			return this.$module.$utilities.restCallAsync(this.$config.randomServer.protocol, randomRequestData);
		})
		.then((randomPassword) => {
			randomPassword = randomPassword ? JSON.parse(randomPassword) : null;
			if(randomPassword && randomPassword.error) throw new Error(randomPassword.error.message);

			const bcrypt = promises.promisifyAll(require('bcrypt-nodejs')),
				newPassword = randomPassword && randomPassword.result ? randomPassword.result.random.data[0] : this._generateRandomPassword();

			return promises.all([
				newPassword,
				databaseSrvc.raw('INSERT INTO users (first_name, last_name, email, password) VALUES (?, ?, ?, ?) RETURNING id', [firstname, lastname, username, bcrypt.hashSync(newPassword)])
			]);
		})
		.then((result) => {
			const path = require('path');

			const renderOptions = {
				'username': username,
				'password': result[0]
			};

			return promises.all([
				renderer(path.join(this.basePath, this.$config.newAccount.template), renderOptions),
				databaseSrvc.raw('INSERT INTO tenants_users (tenant, login) SELECT id, ? FROM tenants WHERE parent IS NULL;', [result[1].rows[0].id])
			]);
		})
		.then((result) => {
			return mailerSrvc.sendMailAsync({
				'from': this.$config.from,
				'to': username,
				'subject': this.$config.newAccount.subject,
				'html': result[0]
			});
		})
		.then((notificationResponse) => {
			loggerSrvc.debug('Response from Email Server: ', notificationResponse);

			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_changePassword(user, requestBody, callback) {
		const bcrypt = promises.promisifyAll(require('bcrypt-nodejs'));

		this._dummyAsync()
		.then(() => {
			return new this.$UserModel({ 'id': user.id }).fetch();
		})
		.then((userRecord) => {
			if(requestBody.newPassword1 !== requestBody.newPassword2) throw new Error('The new passwords do not match');
			return promises.all([userRecord, bcrypt.compareAsync(requestBody.currentPassword, userRecord.get('password'))]);
		})
		.then((results) => {
			const currentPasswordMatch = results[1],
				userRecord = results[0];

			if(!currentPasswordMatch) throw new Error('Incorrect current password');
			return promises.all([userRecord, bcrypt.hashAsync(requestBody.newPassword1, null, null)]);
		})
		.then((results) => {
			const newPasswordHash = results[1],
				userRecord = results[0];

			userRecord.set('password', newPasswordHash);
			return userRecord.save();
		})
		.then(() => {
			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_getProfile(user, callback) {
		this._dummyAsync()
		.then(() => {
			return new this.$UserModel({ 'id': user.id }).fetch({ 'withRelated': ['profileContacts'] });
		})
		.then((profileData) => {
			profileData = this.$jsonApiMapper.map(profileData, 'profiles', {
				'typeForModel': {
					'profiles': 'profiles',
					'profileContacts': 'profile_contacts'
				},

				'enableLinks': false
			});

			profileData.data.attributes.profile_image_metadata = JSON.stringify(profileData.data.attributes.profile_image_metadata);
			delete profileData.data.attributes.password;

			if(callback) callback(null, profileData);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_updateProfile(user, callback) {
		this._dummyAsync()
		.then(() => {
			delete user.data.relationships;
			delete user.included;

			return this.$jsonApiDeserializer.deserializeAsync(user);
		})
		.then((jsonDeserializedData) => {
			delete jsonDeserializedData.email;
			delete jsonDeserializedData.created_at;
			delete jsonDeserializedData.updated_at;

			return this.$UserModel
			.forge()
			.save(jsonDeserializedData, {
				'method': 'update',
				'patch': true
			});
		})
		.then((savedRecord) => {
			if(callback) callback(null, savedRecord);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_deleteProfile(userId, callback) {
		this._dummyAsync()
		.then(() => {
			return new this.$UserModel({ 'id': userId }).destroy();
		})
		.then(() => {
			if(callback) callback(null, userId);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_getProfileContact(contactId, callback) {
		this._dummyAsync()
		.then(() => {
			return new this.$ContactModel({ 'id': contactId }).fetch();
		})
		.then((contactData) => {
			contactData = this.$jsonApiMapper.map(contactData, 'profile_contacts', {
				'enableLinks': false
			});

			if(callback) callback(null, contactData);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_addProfileContact(contact, callback) {
		this._dummyAsync()
		.then(() => {
			return this.$jsonApiDeserializer.deserializeAsync(contact);
		})
		.then((jsonDeserializedData) => {
			delete jsonDeserializedData.created_at;
			delete jsonDeserializedData.updated_at;

			jsonDeserializedData.login = contact.data.relationships.login.data.id;
			return this.$ContactModel
			.forge()
			.save(jsonDeserializedData, {
				'method': 'insert',
				'patch': false
			});
		})
		.then((savedRecord) => {
			if(callback) callback(null, savedRecord);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_deleteProfileContact(contactId, callback) {
		this._dummyAsync()
		.then(() => {
			return new this.$ContactModel({ 'id': contactId }).destroy();
		})
		.then(() => {
			if(callback) callback(null, contactId);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_generateRandomPassword() {
		return 'xxxxxxxx'.replace(/[x]/g, (c) => {
			const r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
		});
	}

	get basePath() { return __dirname; }
}

exports.middleware = User;
