exports.config = ({
	"static": {
		"path": "static",
		"index": "index.html",
		"maxAge": 500
	},
	"styleExclusions": [
		"bootstrap.min.css",
		"bootstrap-theme.min.css",
		"fontawesome",
		"jstree"
	],
	"scriptExclusions": [
		"ckeditor"
	],

	'renderConfig': {}
});
