exports.config = ({
	"redis": {
		"type": "redis",
		"redis": "redis",
		"port": 6379,
		"host": "127.0.0.1",
		"db": 12,
		"options": {
			"detect_buffers": true
		}
	}
});
