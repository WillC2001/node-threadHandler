var spawn = require('child_process').spawn;
var eventEmitter = require( "events" ).EventEmitter;

// module vars - defining total threads
var runningThreads = 0;
var totalThreads = 5;
var runningThreadProc = [];

var controller = new eventEmitter();




// set total threads - can be called at any time and will either allow more or throttle back
var setTotalThreads = function(total) {
	totalThreads = total;
};

// script to run - can be changed during runtime
var setChildScript = function(scriptName, args) {
	scriptToRun = scriptName;
	scriptArgs = args;
};

var getAvailableThread = function (callback) {
	if(runningThreads < totalThreads) {
		callback();
	} else {
		waitForThread(callback);
	}
};

// used internally
var waitForThread = function(callback) {
	setTimeout(function() {
		controller.getAvailableThread(callback);
	},0);
};

var runForever = function() {
	controller.startChild([],function() {
		process.nextTick(controller.runForever);
	});
};

var startChild = function (options, callback) {
	controller.getAvailableThread(function() {
		controller.spawnChild(options,callback);
	});
};

var spawnChild = function(customArgs,callback) {
	runningThreads++;
	var spawnArgs = scriptArgs;

	if(customArgs) {
		spawnArgs = scriptArgs.concat(customArgs);
	}

	var newThread = spawn(scriptToRun, spawnArgs);

	controller.emit('start', newThread.pid);

	runningThreadProc[newThread.pid] = newThread;

	runningThreadProc[newThread.pid].stdout.on('data', function (data) {
		controller.emit('stdout', newThread.pid, data);
	});

	runningThreadProc[newThread.pid].stderr.on('data', function (data) {
		controller.emit('stderr', newThread.pid, data);
	});

	runningThreadProc[newThread.pid].on('exit', function (code) {
		runningThreads--;
		controller.emit('exit', newThread.pid, code);
	});


	// spawned - run next callback
	if(callback) {
		callback();
	}
};

function getTotalThreads(cb) {
	return runningThreads;
}

controller.spawnChild = spawnChild;
controller.getAvailableThread = getAvailableThread;
controller.getTotalThreads = getTotalThreads;
controller.setChildScript = setChildScript;
controller.runForever = runForever;
controller.setTotalThreads = setTotalThreads;
controller.startChild = startChild;

exports.threadHandler = controller;