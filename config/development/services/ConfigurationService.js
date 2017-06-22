exports.config = ({
	"services": {
		"path": "./services"
	},
	"priorities": {
		"FileConfigurationService": 10,
		"RedisConfigurationService": 20,
		"DatabaseConfigurationService": 30,
		"DotEnvConfigurationService": 40
	},
	"subservices": {
		"DatabaseConfigurationService": {
			"client": "pg",
			"debug": false,
			"connection": {
				"host": "127.0.0.1",
				"port": "5432",
				"user": "twyr",
				"password": "twyr",
				"database": "twyr"
			},
			"pool": {
				"min": 2,
				"max": 4
			},
			"migrations": {
				"directory": "knex_migrations/migrations",
				"tableName": "knex_migrations"
			},
			"seeds": {
				"directory": "knex_migrations/seeds",
				"tableName": "knex_seeds"
			}
		},

		"RedisConfigurationService": {
			"port": 6379,
			"host": "127.0.0.1",
			"options": {
				"detect_buffers": false
			}
		}
	}
});
