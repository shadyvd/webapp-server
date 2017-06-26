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
const TwyrBaseComponent = require('./../TwyrBaseComponent').TwyrBaseComponent,
	TwyrComponentError = require('./../TwyrComponentError').TwyrComponentError,
	TwyrJSONAPIError = require('./../TwyrComponentError').TwyrJSONAPIError;

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
			let error = err;
			if(!(error instanceof TwyrComponentError))
				error = new TwyrComponentError(`Error adding routes`, err);

			if(callback) callback(error);
		});
	}

	_getClientsideAssets(tenant, user, mediaType, renderer, callback) {
		if(user.id === 'ffffffff-ffff-4fff-ffff-ffffffffffff') {
			this._getEmptyClientsideAssets(tenant, user, mediaType, renderer, callback);
			return null;
		}

		super._getClientsideAssets(tenant, user, mediaType, renderer, callback);
	}

	_changePassword(request, response, next) {
		this._dummyAsync()
		.then(() => {
			const apiService = this.$dependencies.ApiService;
			return apiService.executeAsync('User::changePassword', [request.user, request.body]);
		})
		.catch((err) => {
			if(err instanceof TwyrJSONAPIError) throw err;

			const error = new TwyrJSONAPIError(`Error executing change password`);
			error.addErrorObject(err);

			throw error;
		})
		.then(() => {
			response.status(200).json({
				'status': true,
				'responseText': 'Change Password Successful!'
			});

			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrJSONAPIError)) {
				error = new TwyrJSONAPIError(`Error sending change password response`);
				error.addErrorObject(err);
			}

			next(error);
		});
	}

	_getProfileImage(request, response, next) {
		const path = require('path');

		this._dummyAsync()
		.then(() => {
			const apiService = this.$dependencies.ApiService;
			return apiService.executeAsync('User::profile', [request.user]);
		})
		.catch((err) => {
			if(err instanceof TwyrJSONAPIError) throw err;

			const error = new TwyrJSONAPIError(`Error retrieving profile data`);
			error.addErrorObject(err);

			throw error;
		})
		.then((profile) => {
			const profileImageName = path.join(this.$profileImagePath, `${profile.data.attributes.profile_image}.png`);
			return promises.all([profile, this._existsAsync(profileImageName)]);
		})
		.catch((err) => {
			if(err instanceof TwyrJSONAPIError) throw err;

			const error = new TwyrJSONAPIError(`Error checking profile image existence`);
			error.addErrorObject(err);

			throw error;
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
			let error = err;
			if(!(error instanceof TwyrJSONAPIError)) {
				error = new TwyrJSONAPIError(`Error sending profile image`);
				error.addErrorObject(err);
			}

			next(error);
		});
	}

	_updateProfileImage(request, response, next) {
		const fs = require('fs'),
			path = require('path'),
			uuid = require('uuid');

		const filesystem = promises.promisifyAll(fs);

		this._dummyAsync()
		.then(() => {
			const apiService = this.$dependencies.ApiService;
			return apiService.executeAsync('User::profile', [request.user]);
		})
		.catch((err) => {
			if(err instanceof TwyrJSONAPIError) throw err;

			const error = new TwyrJSONAPIError(`Error retrieving profile data`);
			error.addErrorObject(err);

			throw error;
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
		.catch((err) => {
			if(err instanceof TwyrJSONAPIError) throw err;

			const error = new TwyrJSONAPIError(`Error saving profile image`);
			error.addErrorObject(err);

			throw error;
		})
		.then((results) => {
			const currentImageId = results[1],
				profile = results[0];

			const apiService = this.$dependencies.ApiService;
			return promises.all([apiService.executeAsync('User::updateProfile', [profile]), currentImageId]);
		})
		.catch((err) => {
			if(err instanceof TwyrJSONAPIError) throw err;

			const error = new TwyrJSONAPIError(`Error updating profile data`);
			error.addErrorObject(err);

			throw error;
		})
		.then((results) => {
			const currentImageId = results[1];
			if(!currentImageId) return null;

			return filesystem.unlinkAsync(path.join(this.$profileImagePath, `${currentImageId}.png`));
		})
		.catch((err) => {
			if(err instanceof TwyrJSONAPIError) throw err;

			const error = new TwyrJSONAPIError(`Error deleting old profile image`);
			error.addErrorObject(err);

			throw error;
		})
		.then(() => {
			response.status(200).json({
				'status': true,
				'responseText': 'Profile Image Updated succesfully'
			});

			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrJSONAPIError)) {
				error = new TwyrJSONAPIError(`Error sending profile image update response`);
				error.addErrorObject(err);
			}

			next(error);
		});
	}

	_getProfile(request, response, next) {
		const apiService = this.$dependencies.ApiService;
		response.type('application/javascript');

		this._dummyAsync()
		.then(() => {
			return apiService.executeAsync('User::profile', [request.user]);
		})
		.catch((err) => {
			if(err instanceof TwyrJSONAPIError) throw err;

			const error = new TwyrJSONAPIError(`Error retrieving profile data`);
			error.addErrorObject(err);

			throw error;
		})
		.then((profile) => {
			response.status(200).json(profile);
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrJSONAPIError)) {
				error = new TwyrJSONAPIError(`Error sending profile image update response`);
				error.addErrorObject(err);
			}

			next(error);
		});
	}

	_updateProfile(request, response, next) {
		this._dummyAsync()
		.then(() => {
			if(request.user.id !== request.params.id) throw new Error('Profile information of other users is private');

			const apiService = this.$dependencies.ApiService;
			return apiService.executeAsync('User::updateProfile', [request.body]);
		})
		.catch((err) => {
			if(err instanceof TwyrJSONAPIError) throw err;

			const error = new TwyrJSONAPIError(`Error updating profile data`);
			error.addErrorObject(err);

			throw error;
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
			let error = err;
			if(!(error instanceof TwyrJSONAPIError)) {
				error = new TwyrJSONAPIError(`Error sending profile update response`);
				error.addErrorObject(err);
			}

			next(error);
		});
	}

	_deleteProfile(request, response, next) {
		this._dummyAsync()
		.then(() => {
			if(request.user.id !== request.params.id) throw new Error('Profile information of other users is private');

			const apiService = this.$dependencies.ApiService;
			return apiService.executeAsync('User::deleteProfile', [request.params.id]);
		})
		.catch((err) => {
			if(err instanceof TwyrJSONAPIError) throw err;

			const error = new TwyrJSONAPIError(`Error deleting profile data`);
			error.addErrorObject(err);

			throw error;
		})
		.then(() => {
			response.status(204).json({});
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrJSONAPIError)) {
				error = new TwyrJSONAPIError(`Error sending delete profile response`);
				error.addErrorObject(err);
			}

			next(error);
		});
	}

	_getProfileContact(request, response, next) {
		this._dummyAsync()
		.then(() => {
			const apiService = this.$dependencies.ApiService;
			return apiService.executeAsync('User::contact', [request.params.id]);
		})
		.catch((err) => {
			if(err instanceof TwyrJSONAPIError) throw err;

			const error = new TwyrJSONAPIError(`Error retrieving profile contact data`);
			error.addErrorObject(err);

			throw error;
		})
		.then((userContact) => {
			if(userContact.data.attributes.login !== request.user.id) throw new Error('Contact information of other users is private');
			response.status(200).json(userContact);

			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrJSONAPIError)) {
				error = new TwyrJSONAPIError(`Error sending profile contact response`);
				error.addErrorObject(err);
			}

			next(error);
		});
	}

	_addProfileContact(request, response, next) {
		this._dummyAsync()
		.then(() => {
			if(request.user.id !== request.body.data.relationships.login.data.id) throw new Error('Profile information of other users is private');

			const apiService = this.$dependencies.ApiService;
			return apiService.executeAsync('User::addContact', [request.body]);
		})
		.catch((err) => {
			if(err instanceof TwyrJSONAPIError) throw err;

			const error = new TwyrJSONAPIError(`Error adding profile contact data`);
			error.addErrorObject(err);

			throw error;
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
			let error = err;
			if(!(error instanceof TwyrJSONAPIError)) {
				error = new TwyrJSONAPIError(`Error sending add profile contact response`);
				error.addErrorObject(err);
			}

			next(error);
		});
	}

	_deleteProfileContact(request, response, next) {
		this._dummyAsync()
		.then(() => {
			const apiService = this.$dependencies.ApiService;
			return apiService.executeAsync('User::contact', [request.params.id]);
		})
		.catch((err) => {
			if(err instanceof TwyrJSONAPIError) throw err;

			const error = new TwyrJSONAPIError(`Error getting profile contact data`);
			error.addErrorObject(err);

			throw error;
		})
		.then((userContact) => {
			if(userContact.data.attributes.login !== request.user.id) throw new Error('Contact information of other users is private');

			const apiService = this.$dependencies.ApiService;
			return apiService.executeAsync('User::deleteContact', [request.params.id]);
		})
		.catch((err) => {
			if(err instanceof TwyrJSONAPIError) throw err;

			const error = new TwyrJSONAPIError(`Error deleting profile contact data`);
			error.addErrorObject(err);

			throw error;
		})
		.then(() => {
			response.status(204).json({});
			return null;
		})
		.catch((err) => {
			let error = err;
			if(!(error instanceof TwyrJSONAPIError)) {
				error = new TwyrJSONAPIError(`Error sending delete profile contact response`);
				error.addErrorObject(err);
			}

			next(error);
		});
	}

	get basePath() { return __dirname; }
}

exports.component = Profiles;
