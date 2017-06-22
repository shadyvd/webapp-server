exports.config = ({
	"primus": {
		"parser": "JSON",
		"pathname": "/websockets",
		"transformer": "websockets",
		"iknowclusterwillbreakconnections": true
	},
	"session": {
		"key": "twyr-webapp",
		"ttl": 3600,
		"store": {
			"media": "redis",
			"prefix": "twyr!webapp!session!"
		},
		"secret": "Th1s!sTheTwyrWebAppFramew0rk"
	},
	"cookieParser": {
		"path": "/",
		"domain": ".twyr.com",
		"secure": false,
		"httpOnly": false
	},
	"subdomainMappings": {
		"local-portal": "www"
	}
});
