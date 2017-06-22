define(
	'twyr-webapp/controllers/base-controller',
	['exports', 'ember'],
	function(exports, _ember) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/controllers/base-controller');

		exports['default'] = _ember['default'].Controller.extend(_ember['default'].Evented, {
			'store': _ember['default'].inject.service('store'),

			'set-model': function(data) {
				data.modelName = data.modelName || '';
				if(data.modelName.trim() == '') return;

				if(data.modelId) {
					this.set('model', this.get('store').peekRecord(data.modelName, data.modelId));
					if(this.get('model')) return;

					this.get('store').findRecord(data.modelName, data.modelId, { 'backgroundReload': true })
					.then((model) => {
						this.set('model', model);
					})
					.catch((err) => {
						if(window.developmentMode) console.error(err);
						this.send('controller-action', 'display-status-message', {
							'type': 'ember-error',
							'errorModel': err
						});
					});
				}
				else {
					this.set('model', this.get('store').peekAll(data.modelName));
					if(this.get('model.length')) return;

					this.get('store').findAll(data.modelName, { 'backgroundReload': true })
					.then((model) => {
						this.set('model', model);
					})
					.catch((err) => {
						if(window.developmentMode) console.error(err);
						this.send('controller-action', 'display-status-message', {
							'type': 'ember-error',
							'errorModel': err
						});
					});
				}
			},

			'actions': {
				'controller-action': function(action, data) {
					if(this[action])
						this[action](data);
					else
						return true;
				}
			}
		});
	}
);
