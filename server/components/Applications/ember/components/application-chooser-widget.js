define(
	'twyr-webapp/components/application-chooser-widget',
	['exports', 'ember', 'twyr-webapp/components/base-widget'],
	function(exports, _ember, _baseWidget) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/components/application-chooser-widget');
		exports['default'] = _baseWidget['default'].extend({
			'tagName': 'li'
		});
	}
);
