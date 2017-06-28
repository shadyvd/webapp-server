/**
 * @file      index.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      Entry point into the Twy'r Web Application Framework
 *
 */

'use strict';

/**
 * First things first... load the environment
 * @ignore
 */
require('dotenv').config();

/**
 * Module dependencies.
 * @ignore
 */
const path = require('path'),
	promises = require('bluebird');

/**
 * Get what we need - environment, and the configuration specific to that environment
 * @ignore
 */
const env = (process.env.NODE_ENV || 'development').toLowerCase();
const config = require(path.join(__dirname, 'config', env, 'index')).config;

let numForks = Math.floor(require('os').cpus().length * config.loadFactor);
if(numForks < 1) numForks = 1;

/**
 * Setup the title to reflect what we're running in the OS Process Table
 * @ignore
 */
process.title = config.title;

/**
 * Generate a unique id for this entire cluster
 * @ignore
 */
const cluster = promises.promisifyAll(require('cluster'));
const uuid = require('uuid');

const clusterId = uuid.v4().toString().replace(/-/g, '');

/*
 * Instantiate the application, and start the execution
 */
if(cluster.isMaster) {
	let onlineCount = 0,
		port = 0;

	const forkIfRequired = () => {
		if(onlineCount >= numForks)
			return;

		cluster.fork();
	};

	const printNetworkInterfaceList = () => {
		onlineCount++;
		if(onlineCount < numForks)
			return;

		const forPrint = [],
			networkInterfaces = require('os').networkInterfaces();

		Object.keys(networkInterfaces).forEach((networkInterfaceName) => {
			const networkInterfaceAddresses = networkInterfaces[networkInterfaceName];

			for(const address of networkInterfaceAddresses) {
				forPrint.push({
					'Interface': networkInterfaceName,
					'Protocol': address.family,
					'Address': address.address,
					'Port': port ? port : 'NOT LISTENING'
				});
			}
		});

		if(forPrint.length) {
			const printf = require('node-print');

			console.log(`\n\n${process.title} Listening On:`);
			printf.printTable(forPrint);
			console.log('\n\n');
		}
	};

	const timeoutMonitor = {};

	cluster
		.on('fork', (worker) => {
			if(env === 'development') console.log(`Forked Twy'r Web Application #${worker.id}`);
			timeoutMonitor[worker.id] = setTimeout(() => {
				if(env === 'development') console.error(`Twy'r Web Application #${worker.id} did not start in time! KILL!!`);
				worker.kill();
			}, 300000);
		})
		.on('online', (worker) => {
			if(env === 'development') console.log(`Twy'r Web Application #${worker.id} Online`);
			clearTimeout(timeoutMonitor[worker.id]);
		})
		.on('listening', (worker, address) => {
			if(env === 'development') console.log(`Twy'r Web Application #${worker.id} Listening`);

			port = address.port;
			clearTimeout(timeoutMonitor[worker.id]);
			if(onlineCount >= numForks) printNetworkInterfaceList();
		})
		.on('disconnect', (worker) => {
			if(env === 'development') console.log(`Twy'r Web Application #${worker.id}: Disconnected`);
			timeoutMonitor[worker.id] = setTimeout(() => {
				worker.kill();
			}, 2000);

			timeoutMonitor[worker.id].unref();
			if(cluster.isMaster && config.restart) cluster.fork();

			if(Object.keys(cluster.workers).length <= 0) {
				const processExit = process.exit;
				processExit(0);
			}
		})
		.on('exit', (worker, code, signal) => {
			if(env === 'development') console.log(`Twy'r Web Application #${worker.id}: Exited with code: ${code} on signal: ${signal}`);
			clearTimeout(timeoutMonitor[worker.id]);

			if(Object.keys(cluster.workers).length <= 0) {
				const processExit = process.exit;
				processExit(0);
			}
		})
		.on('death', (worker) => {
			if(env === 'development') console.error(`Twy'r Web Application #${worker.pid}: Death!`);
			clearTimeout(timeoutMonitor[worker.id]);
		});

	// Setup listener for online counts
	cluster.on('message', (worker, message) => {
		if(message !== 'worker-online')
			return;

		printNetworkInterfaceList();
		forkIfRequired();
	});

	// Fork workers.
	if(env === 'development') console.log(`Twy'r Web Application Master: Starting now...`);
	cluster.fork();


	// In development mode (i.e., start as "npm start"), wait for input from command line
	// In other environments, start a telnet server and listen for the exit command
	if(env === 'development' || env === 'test') {
		const repl = require('repl');

		const replConsole = repl.start(config.repl);
		replConsole.on('exit', () => {
			console.log(`Twy'r Web Application Master: Stopping now...`);
			config.restart = false;

			Object.keys(cluster.workers).forEach((workerId) => {
				cluster.workers[workerId].send('terminate');
			});

			cluster.disconnectAsync()
			.then(() => {
				console.log(`Twy'r Web Application Master: Disconnected workers. Exiting now...`);
				return null;
			})
			.timeout(180000)
			.catch((err) => {
				console.error(`Twy'r Web Application Master Error: ${err.stack}\n\n`);
			})
			.finally(() => {
				const processExit = process.exit;
				processExit(0);
			});
		});
	}
	else {
		const telnetServer = require('net').createServer((socket) => {
			config.repl.parameters.input = socket;
			config.repl.parameters.output = socket;

			const repl = require('repl');

			const replConsole = repl.start(config.repl.parameters);
			replConsole.context.socket = socket;
			replConsole.on('exit', () => {
				config.restart = false;

				Object.keys(cluster.workers).forEach((workerId) => {
					cluster.workers[workerId].send('terminate');
				});

				cluster.disconnectAsync()
				.then(() => {
					console.log(`Twy'r Web Application Master: Disconnected workers. Exiting now...`);

					socket.end();
					telnetServer.close();
					return null;
				})
				.timeout(180000)
				.catch((err) => {
					console.error(`Twy'r Web Application Master Error: ${err.stack}\n\n`);
				})
				.finally(() => {
					const processExit = process.exit;
					processExit(0);
				});
			});
		});

		telnetServer.listen(config.repl.controlPort, config.repl.controlHost);
	}
}
else {
	const TwyrWebApp = require(config.main).TwyrWebApp;

	const application = promises.promisifyAll(new TwyrWebApp(config.application, clusterId, cluster.worker.id), {
		'filter': function () {
			return true;
		}
	});

	const startupFn = () => {
		const allStatuses = [];
		if(!application) return;

		// Call load / initialize / start...
		application.loadAsync(null)
			.timeout(180000)
			.then((status) => {
				allStatuses.push(`Twy'r Web Application #${cluster.worker.id}::Load status: ${JSON.stringify(status, null, '\t')}\n\n`);
				if(!status) throw status;

				return application.initializeAsync();
			})
			.timeout(180000)
			.then((status) => {
				allStatuses.push(`Twy'r Web Application #${cluster.worker.id}::Initialize status: ${JSON.stringify(status, null, '\t')}\n\n`);
				if(!status) throw status;

				return application.startAsync(null);
			})
			.timeout(180000)
			.then((status) => {
				allStatuses.push(`Twy'r Web Application #${cluster.worker.id}::Start Status: ${JSON.stringify(status, null, '\t')}\n\n`);
				if(!status) throw status;

				return null;
			})
			.timeout(180000)
			.catch((err) => {
				if(env === 'development') console.error(`\n\nTwy'r Web Application #${cluster.worker.id}::Startup Error: ${err.stack}\n\n`);
				cluster.worker.disconnect();
			})
			.finally(() => {
				if(env === 'development') console.log(`\n\n${allStatuses.join('\n')}\n\n`);
				process.send('worker-online');
				return null;
			});
	};

	const shutdownFn = () => {
		const allStatuses = [];
		if(!application) return;

		application.stopAsync()
			.timeout(180000)
			.then((status) => {
				allStatuses.push(`Twy'r Web Application #${cluster.worker.id}::Stop Status: ${JSON.stringify(status, null, '\t')}\n\n`);
				if(!status) throw status;

				return application.uninitializeAsync();
			})
			.timeout(180000)
			.then((status) => {
				allStatuses.push(`Twy'r Web Application #${cluster.worker.id}::Uninitialize Status: ${JSON.stringify(status, null, '\t')}\n\n`);
				if(!status) throw status;

				return application.unloadAsync();
			})
			.timeout(180000)
			.then((status) => {
				allStatuses.push(`Twy'r Web Application #${cluster.worker.id}::Unload Status: ${JSON.stringify(status, null, '\t')}\n\n`);
				if(!status) throw status;

				return null;
			})
			.timeout(180000)
			.then(() => {
				cluster.worker.disconnect();
				return null;
			})
			.catch((err) => {
				if(env === 'development') console.error(`\n\nTwy'r Web Application #${cluster.worker.id}::Shutdown Error: ${err.stack}\n\n`);
			})
			.finally(() => {
				if(env === 'development') console.log(`\n\n${allStatuses.join('\n')}\n\n`);
				return null;
			});
	};

	// Listen for messages from master, and shutdown when termination is received
	process.on('message', (message) => {
		if(message !== 'terminate') return;
		shutdownFn();
	});

	// Listen for uncaught exceptions, and shutdown when they occur...
	process.on('uncaughtException', (err) => {
		if(env === 'development') console.error(`Twy's Web Application #${cluster.worker.id}::Process Error: ${err.stack}`);
		shutdownFn();
	});

	// Startup...
	startupFn();
}
