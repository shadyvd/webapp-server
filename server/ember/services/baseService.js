define(
	'twyr-webapp/services/realtime-data',
	['exports', 'ember', 'twyr-webapp/application'],
	function(exports, _ember, _app) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/services/realtime-data');

		exports['default'] = _ember['default'].Service.extend(_ember['default'].Evented, {
			'init': function() {
				if(window.developmentMode) console.log('twyr-webapp/services/websockets::init: ', arguments);

				const dataProcessor = this._websocketDataProcessor.bind(this),
					streamer = window.Primus.connect('/', {
						'strategy': 'online, timeout, disconnect',
						'reconnect': {
							'min': 1000,
							'max': Infinity,
							'retries': 25
						}
					});

				streamer.on('open', () => {
					if(window.developmentMode) console.log('twyr-webapp/services/websockets::streamer::on::open: ', arguments);

					this.get('streamer').on('data', dataProcessor);
					this.trigger('websocket-connection');
				});

				streamer.on('reconnect', () => {
					if(window.developmentMode) console.log('twyr-webapp/services/websockets::streamer::on::reconnect: ', arguments);
				});

				streamer.on('reconnect scheduled', () => {
					if(window.developmentMode) console.log('twyr-webapp/services/websockets::streamer::on::reconnect scheduled: ', arguments);
				});

				streamer.on('reconnected', () => {
					if(window.developmentMode) console.log('twyr-webapp/services/websockets::streamer::on::reconnected: ', arguments);

					this.get('streamer').on('data', dataProcessor);
					this.trigger('websocket-connection');
				});

				streamer.on('reconnect timeout', () => {
					if(window.developmentMode) console.log('twyr-webapp/services/websockets::streamer::on::reconnect timeout: ', arguments);
				});

				streamer.on('reconnect failed', () => {
					if(window.developmentMode) console.log('twyr-webapp/services/websockets::streamer::on::reconnect failed: ', arguments);
				});

				streamer.on('close', () => {
					if(window.developmentMode) console.log('twyr-webapp/services/websockets::streamer::on::close: ', arguments);
					this.trigger('websocket-close');
					this.get('streamer').off('data', dataProcessor);
				});

				streamer.on('end', () => {
					if(window.developmentMode) console.log('twyr-webapp/services/websockets::streamer::on::end: ', arguments);
					this.trigger('websocket-disconnection');
					this.get('streamer').off('data', dataProcessor);
				});

				streamer.on('error', () => {
					if(window.developmentMode) console.error('twyr-webapp/services/websockets::streamer::on::error: ', arguments);
					this.trigger('websocket-error');
				});

				this.set('streamer', streamer);
				this._super(...arguments);
			},

			'_websocketDataProcessor': function(websocketData) {
				if(window.developmentMode) console.log('twyr-webapp/services/websockets::streamer::on::data: ', websocketData);
				this.trigger('websocket-data::' + websocketData.channel, websocketData.data);
			}
		});
	}
);
