exports.config = ({
	"File": {
		"json": false,
		"level": "info",
		"maxsize": 10485760,
		"colorize": true,
		"filename": "logs/TwyrWebApp.log",
		"maxFiles": 10,
		"tailable": true,
		"timestamp": true,
		"prettyPrint": true,
		"zippedArchive": true,
		"handleExceptions": true,
		"humanReadableUnhandledException": true
	},
	"Console": {
		"json": false,
		"level": "error",
		"colorize": true,
		"timestamp": true,
		"prettyPrint": true,
		"handleExceptions": true,
		"humanReadableUnhandledException": true
	}
});