/**
 * @file      server/services/AuthService/utilities/user-session-cache/utility.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Authentication Service Utility Method to retrieve and cache user details
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

const getUserDetails = function(tenant, userId, mediaType, callback) {
	const cacheSrvc = this.$dependencies.CacheService,
		databaseSrvc = this.$dependencies.DatabaseService,
		loggerSrvc = this.$dependencies.LoggerService;

	// Setup the models...
	const User = databaseSrvc.Model.extend({
		'tableName': 'users',
		'idAttribute': 'id',

		'social': function() {
			return this.hasMany(UserSocialLogins, 'login');
		}
	});

	const UserSocialLogins = databaseSrvc.Model.extend({
		'tableName': 'user_social_logins',
		'idAttribute': 'id',

		'user': function() {
			return this.belongsTo(User, 'login');
		}
	});

	this._dummyAsync()
	.then(() => {
		return cacheSrvc.getAsync(`twyr!webapp!${mediaType}!user!${userId}!basics`);
	})
	.then((cachedUser) => {
		if(cachedUser) {
			cachedUser = JSON.parse(cachedUser);
			return promises.all([cachedUser, false]);
		}

		return promises.all([User.forge({ 'id': userId }).fetch({ 'withRelated': ['social'] }), true]);
	})
	.then((results) => {
		const shouldCache = results.pop(),
			user = results.shift();

		if(!user) throw new Error(`User Not Found: ${userId}`);

		const databaseUser = user.toJSON ? user.toJSON() : user;
		delete databaseUser.password;

		databaseUser.social.forEach((social) => {
			delete social.social_data;
		});

		const promiseResolutions = [databaseUser];
		if(shouldCache)
			promiseResolutions.push(cacheSrvc.setAsync(`twyr!webapp!${mediaType}!user!${userId}!basics`, JSON.stringify(databaseUser)));

		return promises.all(promiseResolutions);
	})
	.then((results) => {
		if(callback) callback(null, results.shift());
		return null;
	})
	.catch((err) => {
		loggerSrvc.error(`userSessionCache::getUserDetails Error:\nUser Id: ${userId}\nTenant: ${tenant}\nMedia: ${mediaType}\nError: `, err);
		if(callback) callback(err);
	});
};

const getTenantUserPermissions = function(tenant, userId, mediaType, callback) {
	const cacheSrvc = this.$dependencies.CacheService,
		databaseSrvc = this.$dependencies.DatabaseService,
		loggerSrvc = this.$dependencies.LoggerService;

	this._dummyAsync()
	.then(() => {
		return cacheSrvc.getAsync(`twyr!webapp!${mediaType}!user!${userId}!${tenant}!permissions`);
	})
	.then((cachedTenantUserPermissions) => {
		if(cachedTenantUserPermissions) {
			cachedTenantUserPermissions = JSON.parse(cachedTenantUserPermissions);
			return promises.all([false, cachedTenantUserPermissions]);
		}

		const promiseResolutions = [];

		promiseResolutions.push(true);
		promiseResolutions.push(databaseSrvc.knex.raw(`SELECT id FROM component_permissions WHERE name = ?`, ['public']));
		promiseResolutions.push(databaseSrvc.knex.raw('SELECT * FROM fn_get_user_permissions(?, ?)', [tenant, userId]));

		if(userId !== 'ffffffff-ffff-4fff-ffff-ffffffffffff')
			promiseResolutions.push(databaseSrvc.knex.raw('SELECT permission FROM tenant_group_permissions WHERE tenant_group = (SELECT id FROM tenant_groups WHERE tenant = (SELECT id FROM tenants WHERE sub_domain = \'www\') AND default_for_new_user = true)'));

		return promises.all(promiseResolutions);
	})
	.then((allPermissions) => {
		const shouldCache = allPermissions.shift();
		let tenantUserPermissions = undefined;

		if(allPermissions.length > 1) {
			const publicPermission = allPermissions.shift(),
				userPermissions = allPermissions.shift(),
				defaultPermissions = allPermissions.shift();

			tenantUserPermissions = [publicPermission.rows[0].id];
			userPermissions.rows.forEach((userPermission) => {
				if(tenantUserPermissions.indexOf(userPermission.permission) >= 0)
					return;

				tenantUserPermissions.push(userPermission.permission);
			});

			if(defaultPermissions) {
				defaultPermissions.rows.forEach((defaultPermission) => {
					if(tenantUserPermissions.indexOf(defaultPermission.permission) >= 0)
						return;

					tenantUserPermissions.push(defaultPermission.permission);
				});
			}
		}
		else
			tenantUserPermissions = allPermissions[0];

		const promiseResolutions = [tenantUserPermissions];
		if(shouldCache)
			promiseResolutions.push(cacheSrvc.setAsync(`twyr!webapp!${mediaType}!user!${userId}!${tenant}!permissions`, JSON.stringify(tenantUserPermissions)));

		return promises.all(promiseResolutions);
	})
	.then((results) => {
		if(callback) callback(null, results.shift());
		return null;
	})
	.catch((err) => {
		loggerSrvc.error(`userSessionCache::getTenantUserPermissions Error:\nUser Id: ${userId}\nTenant: ${tenant}\nMedia: ${mediaType}\nError: `, err);
		if(callback) callback(err);
	});
};

const getTenantUserEmberComponentsByModule = function(tenant, userId, mediaType, callback) {
	const cacheSrvc = this.$dependencies.CacheService,
		databaseSrvc = this.$dependencies.DatabaseService,
		loggerSrvc = this.$dependencies.LoggerService;

	const getTenantUserPermissionsAsync = promises.promisify(getTenantUserPermissions.bind(this));

	this._dummyAsync()
	.then(() => {
		return getTenantUserPermissionsAsync(tenant, userId, mediaType);
	})
	.then((userPermissions) => {
		return promises.all([userPermissions, cacheSrvc.getAsync(`twyr!webapp!${mediaType}!user!${userId}!${tenant}!ember!components`)]);
	})
	.then((results) => {
		const userPermissions = results.shift();
		let cachedTenantUserEmberComponents = results.shift();

		if(cachedTenantUserEmberComponents) {
			cachedTenantUserEmberComponents = JSON.parse(cachedTenantUserEmberComponents);
			return promises.all([cachedTenantUserEmberComponents, false]);
		}

		return promises.all([databaseSrvc.knex.raw('SELECT A.name AS component_name, B.id AS component_widget_id, B.ember_component, B.ember_template, B.media FROM modules A INNER JOIN (SELECT X.id, X.module, X.ember_component, Y.ember_template, Y.media FROM component_widgets X INNER JOIN component_widget_templates Y ON (Y.component_widget = X.id) WHERE Y.media = ?) B ON (B.module = A.id) WHERE B.id IN (SELECT component_widget FROM component_widgets_permissions WHERE component_permission IN (\'' + userPermissions.join('\', \'') + '\'))', [mediaType]), true]);
	})
	.then((results) => {
		let componentList = undefined,
			tenantUserEmberComponents = results.shift();

		const shouldCache = results.shift();

		if(tenantUserEmberComponents.rows) {
			tenantUserEmberComponents = tenantUserEmberComponents.rows;
			componentList = {};

			tenantUserEmberComponents.forEach((userEmberComponent) => {
				if(!componentList[userEmberComponent.component_name])
					componentList[userEmberComponent.component_name] = [];

				const relevantRecord = componentList[userEmberComponent.component_name].filter((componentWidget) => {
					return componentWidget.component_widget_id === userEmberComponent.component_widget_id;
				})[0];

				if(relevantRecord) {
					if(relevantRecord.ember_templates.indexOf(userEmberComponent.ember_template) < 0)
						relevantRecord.ember_templates.push(userEmberComponent.ember_template);
				}
				else {
					componentList[userEmberComponent.component_name].push({
						'component_widget_id': userEmberComponent.component_widget_id,
						'ember_component': userEmberComponent.ember_component,
						'ember_templates': [userEmberComponent.ember_template],
						'media': userEmberComponent.media
					});
				}
			});
		}
		else
			componentList = tenantUserEmberComponents;

		const promiseResolutions = [componentList];
		if(shouldCache)
			promiseResolutions.push(cacheSrvc.setAsync(`twyr!webapp!${mediaType}!user!${userId}!${tenant}!ember!components`, JSON.stringify(componentList)));

		return promises.all(promiseResolutions);
	})
	.then((results) => {
		if(callback) callback(null, results.shift());
		return null;
	})
	.catch((err) => {
		loggerSrvc.error(`userSessionCache::getTenantUserEmberComponentsByModule Error:\nUser Id: ${userId}\nTenant: ${tenant}\nMedia: ${mediaType}\nError: `, err);
		if(callback) callback(err);
	});
};

const getTenantUserDefaultApplication = function(tenant, userId, mediaType, callback) {
	const cacheSrvc = this.$dependencies.CacheService,
		databaseSrvc = this.$dependencies.DatabaseService,
		loggerSrvc = this.$dependencies.LoggerService;

	this._dummyAsync()
	.then(() => {
		return cacheSrvc.getAsync(`twyr!webapp!${mediaType}!user!${userId}!${tenant}!default!application`);
	})
	.then((cachedTenantUserDefaultApplication) => {
		if(cachedTenantUserDefaultApplication)
			return promises.all([cachedTenantUserDefaultApplication, false]);

		return promises.all([databaseSrvc.knex.raw('SELECT default_tenant_application FROM tenants_users WHERE login = ? AND tenant = (SELECT id FROM tenants WHERE sub_domain = ?)', [userId, tenant]), true]);
	})
	.then((results) => {
		let tenantUserDefaultApplication = results.shift();
		const shouldCache = results.shift();

		if(tenantUserDefaultApplication.rows)
			tenantUserDefaultApplication = tenantUserDefaultApplication.rows[0].default_tenant_application;

		const promiseResolutions = [tenantUserDefaultApplication];
		if(shouldCache && tenantUserDefaultApplication)
			promiseResolutions.push(cacheSrvc.setAsync(`twyr!webapp!${mediaType}!user!${userId}!${tenant}!default!application`, tenantUserDefaultApplication));

		return promises.all(promiseResolutions);
	})
	.then((results) => {
		if(callback) callback(null, results.shift());
		return null;
	})
	.catch((err) => {
		loggerSrvc.error(`userSessionCache::getTenantUserDefaultApplication Error:\nUser Id: ${userId}\nTenant: ${tenant}\nMedia: ${mediaType}\nError: `, err);
		if(callback) callback(err);
	});
};

exports.utility = {
	'name': 'userSessionCache',
	'isAsync': true,
	'method': function(tenant, userId, mediaType, callback) {
		// Sanity check...
		if(mediaType && !callback) {
			if(typeof mediaType === 'function') {
				callback = mediaType;
				mediaType = undefined;
			}
		}

		if(!tenant) {
			if(callback) callback(new Error('No tenant id found in the request!'));
			return;
		}

		if(!userId) {
			if(callback) callback(new Error('No user id found in the request!'));
			return;
		}

		if(!mediaType) {
			if(callback) callback(new Error('Request from unsupported media!'));
			return;
		}

		const cacheSrvc = this.$dependencies.CacheService,
			loggerSrvc = this.$dependencies.LoggerService;

		const getTenantUserDefaultApplicationAsync = promises.promisify(getTenantUserDefaultApplication.bind(this)),
			getTenantUserEmberComponentsByModuleAsync = promises.promisify(getTenantUserEmberComponentsByModule.bind(this)),
			getTenantUserPermissionsAsync = promises.promisify(getTenantUserPermissions.bind(this)),
			getUserDetailsAsync = promises.promisify(getUserDetails.bind(this));

		this._dummyAsync()
		.then(() => {
			return promises.all([
				getUserDetailsAsync(tenant, userId, mediaType),
				getTenantUserPermissionsAsync(tenant, userId, mediaType),
				getTenantUserEmberComponentsByModuleAsync(tenant, userId, mediaType),
				getTenantUserDefaultApplicationAsync(tenant, userId, mediaType)
			]);
		})
		.then((results) => {
			const deserializedUser = results.shift(),
				tenantUserPermissions = results.shift(),
				tenantUserModules = results.shift(),
				defaultApplication = results.shift();

			deserializedUser.permissionList = tenantUserPermissions;
			deserializedUser.modules = tenantUserModules;
			deserializedUser.default_application = defaultApplication;

			return promises.all([deserializedUser, cacheSrvc.keysAsync(`twyr!webapp!${mediaType}!user!${userId}*`)]);
		})
		.then((results) => {
			const deserializedUser = results.shift(),
				cachedKeys = results.shift(),
				cacheMulti = promises.promisifyAll(cacheSrvc.multi());

			cachedKeys.forEach((cachedKey) => {
				cacheMulti.expireAsync(cachedKey, 3600);
			});

			return promises.all([deserializedUser, cacheMulti.execAsync()]);
		})
		.then((results) => {
			if(callback) callback(null, results.shift());
			return null;
		})
		.catch((err) => {
			loggerSrvc.error('userSessionCache Error:\nUser Id: ', userId, 'Error: ', err);
			if(callback) callback(err);
		});
	}
};
