/**
 * @file      server/components/Profiles/component.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Profile Component - provides functionality to allow users to manage their own profile
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
const TwyrBaseComponent = require('./../TwyrBaseComponent').TwyrBaseComponent;

class Profiles extends TwyrBaseComponent {
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
			const path = require('path');

			this.$profileImagePath = path.isAbsolute(this.$config.profileImagePath) ? this.$config.profileImagePath : path.join(this.basePath, this.$config.profileImagePath);
			if(callback) callback(null, status);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_addRoutes(callback) {
		this._dummyAsync()
		.then(() => {
			this.$router.post('/change-password', this._changePassword.bind(this));

			this.$router.get('/get-image', this._getProfileImage.bind(this));
			this.$router.post('/upload-image', this._updateProfileImage.bind(this));

			this.$router.get('/profiles', this._getProfile.bind(this));
			this.$router.get('/profiles/:id', this._getProfile.bind(this));
			this.$router.patch('/profiles/:id', this._updateProfile.bind(this));
			this.$router.delete('/profiles/:id', this._deleteProfile.bind(this));

			this.$router.get('/profile-contacts/:id', this._getProfileContact.bind(this));
			this.$router.post('/profile-contacts', this._addProfileContact.bind(this));
			this.$router.delete('/profile-contacts/:id', this._deleteProfileContact.bind(this));

			super._addRoutes(callback);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_getClientsideAssets(tenant, user, mediaType, renderer, callback) {
		if(user.id === 'ffffffff-ffff-4fff-ffff-ffffffffffff') {
			this._getEmptyClientsideAssets(tenant, user, mediaType, renderer, callback);
			return null;
		}

		super._getClientsideAssets(tenant, user, mediaType, renderer, callback);
	}

	_changePassword(request, response) {
		const apiService = this.$dependencies.ApiService,
			loggerSrvc = this.$dependencies.LoggerService;

		loggerSrvc.debug(`Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${request.body.username}\n`);
		response.type('application/javascript');

		this._dummyAsync()
		.then(() => {
			return apiService.executeAsync('User::changePassword', [request.user, request.body]);
		})
		.then(() => {
			response.status(200).json({
				'status': true,
				'responseText': 'Change Password Successful!'
			});

			return null;
		})
		.catch((err) => {
			loggerSrvc.error(`Error Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${JSON.stringify(request.body, undefined, '\t')}\nError: ${err.stack}\n`);
			response.status(200).json({
				'status': false,
				'responseText': err.stack.split('\n', 1)[0].replace('error: ', '').trim()
			});
		});
	}

	_getProfileImage(request, response) {
		const path = require('path');

		const apiService = this.$dependencies.ApiService,
			loggerSrvc = this.$dependencies.LoggerService;

		loggerSrvc.debug(`Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${request.body.username}\n`);
		response.type('application/javascript');

		this._dummyAsync()
		.then(() => {
			return apiService.executeAsync('User::profile', [request.user]);
		})
		.then((profile) => {
			const profileImageName = path.join(this.$profileImagePath, `${profile.data.attributes.profile_image}.png`);
			return promises.all([profile, this._existsAsync(profileImageName)]);
		})
		.then((results) => {
			const exists = results[1],
				profile = results[0];

			if(exists)
				response.sendFile(path.join(this.$profileImagePath, `${profile.data.attributes.profile_image}.png`));
			else
				response.sendFile(path.join(this.$profileImagePath, 'anonymous.jpg'));

			return null;
		})
		.catch((err) => {
			loggerSrvc.error(`Error Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${JSON.stringify(request.body, undefined, '\t')}\nError: ${err.stack}\n`);
			response.status(400).json({ 'code': 400, 'message': err.stack.split('\n', 1)[0].replace('error: ', '').trim() });
		});
	}

	_updateProfileImage(request, response) {
		const fs = require('fs'),
			path = require('path'),
			uuid = require('uuid');

		const filesystem = promises.promisifyAll(fs);
		const apiService = this.$dependencies.ApiService,
			loggerSrvc = this.$dependencies.LoggerService;

		loggerSrvc.debug(`Servicing request ${request.method} "${request.originalUrl}"\n`);
		response.type('application/javascript');

		this._dummyAsync()
		.then(() => {
			return apiService.executeAsync('User::profile', [request.user]);
		})
		.then((profile) => {
			const currentImageId = profile.data.attributes.profile_image,
				image = request.body.image.replace(/' '/g, '+').replace('data:image/png;base64,', ''),
				imageId = uuid.v4().toString(),
				imagePath = path.join(this.$profileImagePath, `${imageId}.png`);

			profile.data.attributes.profile_image = imageId;
			profile.data.attributes.profile_image_metadata = request.body.metadata;

			return promises.all([profile, currentImageId, filesystem.writeFileAsync(imagePath, Buffer.from(image, 'base64'))]);
		})
		.then((results) => {
			const currentImageId = results[1],
				profile = results[0];

			return promises.all([apiService.executeAsync('User::updateProfile', [profile]), currentImageId]);
		})
		.then((results) => {
			const currentImageId = results[1];
			if(!currentImageId) return null;

			return filesystem.unlinkAsync(path.join(this.$profileImagePath, `${currentImageId}.png`));
		})
		.then(() => {
			response.status(200).json({
				'status': true,
				'responseText': 'Profile Image Updated succesfully'
			});

			return null;
		})
		.catch((err) => {
			loggerSrvc.error(`Error Servicing request ${request.method} "${request.originalUrl}":\n${err.stack}\n`);
			response.status(400).json({ 'code': 400, 'message': err.stack.split('\n', 1)[0].replace('error: ', '').trim() });
		});
	}

	_getProfile(request, response) {
		const apiService = this.$dependencies.ApiService,
			loggerSrvc = this.$dependencies.LoggerService;

		loggerSrvc.debug(`Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${request.body.username}\n`);
		response.type('application/javascript');

		this._dummyAsync()
		.then(() => {
			return apiService.executeAsync('User::profile', [request.user]);
		})
		.then((profile) => {
			response.status(200).json(profile);
			return null;
		})
		.catch((err) => {
			loggerSrvc.error(`Error Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${JSON.stringify(request.body, undefined, '\t')}\nError: ${err.stack}\n`);
			response.status(400).json({
				'errors': [{
					'status': 400,
					'source': { 'pointer': '/data' },
					'title': 'Get profile error',
					'detail': err.stack.split('\n', 1)[0].replace('error: ', '').trim()
				}]
			});
		});
	}

	_updateProfile(request, response) {
		const apiService = this.$dependencies.ApiService,
			loggerSrvc = this.$dependencies.LoggerService;

		loggerSrvc.debug(`Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${request.body.username}\n`);
		response.type('application/javascript');

		this._dummyAsync()
		.then(() => {
			if(request.user.id !== request.params.id) throw new Error('Profile information of other users is private');
			return apiService.executeAsync('User::updateProfile', [request.body]);
		})
		.then((updatedProfile) => {
			response.status(200).json({
				'data': {
					'type': request.body.data.type,
					'id': updatedProfile.get('id')
				}
			});
			return null;
		})
		.catch((err) => {
			loggerSrvc.error(`Error Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${JSON.stringify(request.body, undefined, '\t')}\nError: ${err.stack}\n`);
			response.status(400).json({
				'errors': [{
					'status': 400,
					'source': { 'pointer': '/data' },
					'title': 'Update profile error',
					'detail': err.stack.split('\n', 1)[0].replace('error: ', '').trim()
				}]
			});
		});
	}

	_deleteProfile(request, response) {
		const apiService = this.$dependencies.ApiService,
			loggerSrvc = this.$dependencies.LoggerService;

		loggerSrvc.debug(`Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${request.body.username}\n`);
		response.type('application/javascript');

		this._dummyAsync()
		.then(() => {
			if(request.user.id !== request.params.id) throw new Error('Profile information of other users is private');
			return apiService.executeAsync('User::deleteProfile', [request.params.id]);
		})
		.then(() => {
			response.status(204).json({});
			return null;
		})
		.catch((err) => {
			loggerSrvc.error(`Error Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${JSON.stringify(request.body, undefined, '\t')}\nError: ${err.stack}\n`);
			response.status(400).json({
				'errors': [{
					'status': 400,
					'source': { 'pointer': '/data' },
					'title': 'Delete profile error',
					'detail': err.stack.split('\n', 1)[0].replace('error: ', '').trim()
				}]
			});
		});
	}

	_getProfileContact(request, response) {
		const apiService = this.$dependencies.ApiService,
			loggerSrvc = this.$dependencies.LoggerService;

		loggerSrvc.debug(`Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${request.body.username}\n`);
		response.type('application/javascript');

		this._dummyAsync()
		.then(() => {
			return apiService.executeAsync('User::contact', [request.params.id]);
		})
		.then((userContact) => {
			if(userContact.data.attributes.login !== request.user.id) throw new Error('Contact information of other users is private');
			response.status(200).json(userContact);

			return null;
		})
		.catch(function(err) {
			loggerSrvc.error(`Error Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${JSON.stringify(request.body, undefined, '\t')}\nError: ${err.stack}\n`);
			response.status(400).json({
				'errors': [{
					'status': 400,
					'source': { 'pointer': '/data' },
					'title': 'Get profile contact error',
					'detail': err.stack.split('\n', 1)[0].replace('error: ', '').trim()
				}]
			});
		});
	}

	_addProfileContact(request, response) {
		const apiService = this.$dependencies.ApiService,
			loggerSrvc = this.$dependencies.LoggerService;

		loggerSrvc.debug(`Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${request.body.username}\n`);
		response.type('application/javascript');

		this._dummyAsync()
		.then(() => {
			if(request.user.id !== request.body.data.relationships.login.data.id) throw new Error('Profile information of other users is private');
			return apiService.executeAsync('User::addContact', [request.body]);
		})
		.then((newContact) => {
			response.status(201).json({
				'data': {
					'type': request.body.data.type,
					'id': newContact.get('id')
				}
			});
			return null;
		})
		.catch((err) => {
			loggerSrvc.error(`Error Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${JSON.stringify(request.body, undefined, '\t')}\nError: ${err.stack}\n`);
			response.status(400).json({
				'errors': [{
					'status': 400,
					'source': { 'pointer': '/data' },
					'title': 'Add profile contact error',
					'detail': err.stack.split('\n', 1)[0].replace('error: ', '').trim()
				}]
			});
		});
	}

	_deleteProfileContact(request, response) {
		const apiService = this.$dependencies.ApiService,
			loggerSrvc = this.$dependencies.LoggerService;

		loggerSrvc.debug(`Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${request.body.username}\n`);
		response.type('application/javascript');

		this._dummyAsync()
		.then(() => {
			return apiService.executeAsync('User::contact', [request.params.id]);
		})
		.then((userContact) => {
			if(userContact.data.attributes.login !== request.user.id) throw new Error('Contact information of other users is private');
			return apiService.executeAsync('User::deleteContact', [request.params.id]);
		})
		.then(() => {
			response.status(204).json({});
			return null;
		})
		.catch((err) => {
			loggerSrvc.error(`Error Servicing request ${request.method} "${request.originalUrl}":\nQuery: ${JSON.stringify(request.query, undefined, '\t')}\nParams: ${JSON.stringify(request.params, undefined, '\t')}\nBody: ${JSON.stringify(request.body, undefined, '\t')}\nError: ${err.stack}\n`);
			response.status(400).json({
				'errors': [{
					'status': 400,
					'source': { 'pointer': '/data' },
					'title': 'Delete profile contact error',
					'detail': err.stack.split('\n', 1)[0].replace('error: ', '').trim()
				}]
			});
		});
	}

	get basePath() { return __dirname; }
}

exports.component = Profiles;
