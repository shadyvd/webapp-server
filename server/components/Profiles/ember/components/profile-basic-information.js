define(
	'twyr-webapp/components/profile-basic-information',
	['exports', 'ember', 'twyr-webapp/components/base-widget'],
	function(exports, _ember, _baseWidget) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/components/profile-basic-information');
		exports['default'] = _baseWidget['default'].extend({
			'_imageCroppie': null,
			'_enableCroppieUpdates': false,
			'_profileImageUploadTimeout': null,

			'didInsertElement': function() {
				this._super(...arguments);
				this.$('div.box').activateBox();

				this.dummyFunc()
				.then(() => {
					const promiseResolutions = [],
						profileModel = this.get('store').peekAll('profile').objectAt(0);

					if(profileModel) {
						promiseResolutions.push(profileModel);
					}
					else {
						promiseResolutions.push(this.get('store').findAll('profile'));
					}

					promiseResolutions.push(
						this.ajaxFunc({
							'url': '/Masterdata/genders',
							'dataType': 'json',
							'cache': true
						})
					);
					return _ember['default'].RSVP.allSettled(promiseResolutions);
				})
				.then((result) => {
					this.set('model', this.get('store').peekAll('profile').objectAt(0));

					this.$('div#profile-basic-information-input-dob').datepicker({
						'autoclose': true,
						'format': 'dd M yyyy',
						'minDate': '-120y',
						'maxDate': '-1d',
						'defaultViewDate': this.get('model.formattedDOB')
					})
					.on('show', () => {
						this.$('div#profile-basic-information-input-dob').datepicker('setUTCDate', window.moment.tz(this.get('model.dob'), 'DD MMM YYYY', 'GMT').toDate());
					});

					const genderSelectElem = _ember['default'].$('select#profile-basic-information-select-gender');
					genderSelectElem.html('');

					_ember['default'].$.each(result[1].value, (index, item) => {
						const thisOption = new Option(_ember['default'].String.capitalize(item), item, false, false);
						genderSelectElem.append(thisOption);
					});

					genderSelectElem.select2({
						'minimumInputLength': 0,
						'minimumResultsForSearch': 10,

						'allowClear': true,
						'closeOnSelect': true,

						'placeholder': 'Gender'
					})
					.on('change', () => {
						this.get('model').set('gender', genderSelectElem.val());
					});

					genderSelectElem.val(this.get('model.gender')).trigger('change');

					const profileImageElem = _ember['default'].$('div#profile-basic-information-image');
					profileImageElem.outerHeight(_ember['default'].$('div#profile-basic-information-text-stuff').height());

					if(this.get('_imageCroppie')) {
						this.get('_imageCroppie').destroy();
						this.set('_imageCroppie', null);
					}

					const croppieDimensions = ((profileImageElem.width() < profileImageElem.height()) ? profileImageElem.width() : profileImageElem.height()) - 40;
					this.set('_imageCroppie', new Croppie(document.getElementById('profile-basic-information-image'), {
						'boundary': {
							'width': croppieDimensions,
							'height': croppieDimensions
						},

						'viewport': {
							'width': croppieDimensions,
							'height': croppieDimensions,
							'type': 'circle'
						},

						'showZoomer': true,
						'useCanvas': true,
						'update': this._processCroppieUpdate.bind(this)
					}));

					const imgMetadata = JSON.parse(this.get('model').get('profileImageMetadata'));
					return this.get('_imageCroppie')
					.bind({
						'url': '/Profiles/get-image',
						'points': (imgMetadata && imgMetadata.points) ? imgMetadata.points : [0, 0, croppieDimensions, croppieDimensions]
					});
				})
				.then(() => {
					const imgMetadata = JSON.parse(this.get('model').get('profileImageMetadata'));
					if(imgMetadata && imgMetadata.zoom) this.get('_imageCroppie').setZoom(imgMetadata.zoom);

					// Add an event handler for catching dropped images
					document
					.getElementById('profile-basic-information-image')
					.addEventListener('drop', this._processDroppedImage.bind(this));

					this.set('_enableCroppieUpdates', true);
				})
				.catch((err) => {
					if(window.developmentMode) console.error('profile-basic-information::didInsertElement error:\n', err);
					this.sendAction('controller-action', 'display-status-message', {
						'type': 'danger',
						'message': err.message
					});
				});
			},

			'willDestroyElement': function() {
				this._super(...arguments);
				this.$('div#profile-basic-information-input-dob').datepicker('destroy');

				if(this.get('_imageCroppie')) {
					this.get('_imageCroppie').destroy();
					this.set('_imageCroppie', null);
				}
			},

			'_processDroppedImage': function(event) {
				event.stopPropagation();
				event.preventDefault();

				const imageFile = event.dataTransfer.files[0];
				if(!imageFile.type.match('image.*'))
					return;

				const imageReader = new FileReader();
				imageReader.onload = ((imageData) => {
					this.get('_imageCroppie').bind({
						'url': imageData.target.result
					});
				});

				imageReader.readAsDataURL(imageFile);
			},

			'_processCroppieUpdate': function () {
				if(!this.get('_enableCroppieUpdates'))
					return;

				this.dummyFunc()
				.then(() => {
					return this.get('_imageCroppie').result();
				})
				.then((image) => {
					if(this.get('_profileImageUploadTimeout')) {
						clearTimeout(this.get('_profileImageUploadTimeout'));
						this.set('_profileImageUploadTimeout', null);
					}

					this.set('_profileImageUploadTimeout', setTimeout(
						this._uploadProfileImage.bind(this, image, this.get('_imageCroppie').get()),
						5000
					));

					return null;
				})
				.catch((err) => {
					if(window.developmentMode) console.error('profile-basic-information::_processCroppieUpdate error:\n', err);
					this.sendAction('controller-action', 'display-status-message', {
						'type': 'danger',
						'message': err.message
					});
				});
			},

			'_uploadProfileImage': function(imageData, metadata) {
				this.dummyFunc()
				.then(() => {
					return this.ajaxFunc({
						'type': 'POST',
						'url': '/Profiles/upload-image',

						'dataType': 'json',
						'data': {
							'image': imageData,
							'metadata': metadata
						}
					});
				})
				.then((data) => {
					this.set('_enableCroppieUpdates', false);

					return this.get('_imageCroppie').bind({
						'url': '/Profiles/get-image?_random=' + window.moment().valueOf(),
						'points': metadata.points
					});
				})
				.then(() => {
					this.get('_imageCroppie').setZoom(metadata.zoom);
					return this.get('model').reload();
				})
				.catch((err) => {
					if(window.developmentMode) console.error('profile-basic-information::_uploadProfileImage error:\n', err);
					this.sendAction('controller-action', 'display-status-message', {
						'type': 'danger',
						'message': err.message
					});
				})
				.finally(() => {
					this.set('_enableCroppieUpdates', true);
					this.set('_profileImageUploadTimeout', null);
				});
			},

			'save': function() {
				this.dummyFunc()
				.then(() => {
					return this.get('model').save();
				})
				.then(() => {
					this.sendAction('controller-action', 'display-status-message', {
						'type': 'success',
						'message': 'Profile details updated'
					});
				})
				.catch((err) => {
					if(window.developmentMode) console.error('profile-basic-information::save error:\n', err);
					this.sendAction('controller-action', 'display-status-message', {
						'type': 'ember-error',
						'errorModel': this.get('model')
					});
				});
			},

			'cancel': function() {
				this.get('model').rollbackAttributes();
			},
		});
	}
);
