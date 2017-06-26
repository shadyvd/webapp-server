'use strict';

exports.config = {
	'ssl': {
		'key': './ssl/webapp.key',
		'cert': './ssl/webapp.crt',
		'rejectUnauthorized': false
	},
	'static': {
		'path': 'static',
		'index': 'index.html',
		'maxAge': 300
	},
	'port': {
		'TwyrWebApp': 9100
	},
	'favicon': './favicon.ico',
	'session': {
		'key': 'twyr-webapp',
		'ttl': 3600,
		'store': {
			'media': 'redis',
			'prefix': 'twyr!webapp!session!'
		},
		'secret': 'Th1s!sTheTwyrWebAppFramew0rk'
	},
	'protocol': 'http',
	'poweredBy': 'Twy\'r Web App',
	'cookieParser': {
		'path': '/',
		'domain': '.twyr.com',
		'secure': false,
		'httpOnly': false
	},
	'maxRequestSize': 5242880,
	'requestTimeout': 25,
	'templateEngine': 'ejs',
	'connectionTimeout': 30,
	'corsAllowedDomains': [],
	'subdomainMappings': {
		'local-portal': 'www'
	}
};
