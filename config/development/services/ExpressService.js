exports.config = {
	"ssl": {
		"key": "./ssl/webapp.key",
		"cert": "./ssl/webapp.crt",
		"rejectUnauthorized": false
	},
	"i18n": {
		"cookie": "twyr-webapp-locale",
		"locales": [
			"en"
		],
		"directory": "i18n",
		"syncFiles": true,
		"autoReload": false,
		"updateFiles": true,
		"defaultLocale": "en"
	},
	"port": {
		"TwyrWebApp": 9100
	},
	"static": {
		"path": "static",
		"index": "index.html",
		"maxAge": 300
	},
	"favicon": "./favicon.ico",
	"session": {
		"key": "twyr-webapp",
		"ttl": 86400,
		"store": {
			"media": "redis",
			"prefix": "twyr!webapp!session!"
		},
		"secret": "Th1s!sTheTwyrWebAppFramew0rk"
	},
	"protocol": "http",
	"poweredBy": "Twy'r Web App",
	"cookieParser": {
		"path": "/",
		"domain": ".twyr.com",
		"maxAge": 1813664047248,
		"secure": false,
		"httpOnly": false
	},
	"maxRequestSize": 5242880,
	"requestTimeout": 25,
	"templateEngine": "ejs",
	"connectionTimeout": 30,
	"subdomainMappings": {
		"local-portal": "www"
	},
	"corsAllowedDomains": []
};
