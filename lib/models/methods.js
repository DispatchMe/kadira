var METHOD_METRICS_FIELDS = ['wait', 'db', 'http', 'email', 'async', 'compute', 'total'];

MethodsModel = function (metricsThreshold) {
  var self = this;

  this.methodMetricsByMinute = {};
  this.errorMap = {};

  this._metricsThreshold = _.extend({
    "wait": 100,
    "db": 100,
    "http": 1000,
    "email": 100,
    "async": 100,
    "compute": 100,
    "total": 200
  }, metricsThreshold || {});

  //store max time elapsed methods for each method, event(metrics-field)
  this.maxEventTimesForMethods = {};

  this.tracerStore = new TracerStore({
    interval: 1000 * 60, //process traces every minute
    maxTotalPoints: 30, //for 30 minutes
    archiveEvery: 5 //always trace for every 5 minutes,
  });

  this.tracerStore.start();
};

_.extend(MethodsModel.prototype, KadiraModel.prototype);

MethodsModel.prototype._getMetrics = function(timestamp, method) {
  var dateId = this._getDateId(timestamp);

  if(!this.methodMetricsByMinute[dateId]) {
    this.methodMetricsByMinute[dateId] = {
      methods: {}
    };
  }

  var methods = this.methodMetricsByMinute[dateId].methods;

  //initialize method
  if(!methods[method]) {
    methods[method] = {
      count: 0,
      errors: 0,
      fetchedDocSize: 0,
      sentMsgSize: 0
    };

    METHOD_METRICS_FIELDS.forEach(function(field) {
      methods[method][field] = 0;
    });
  }

  return this.methodMetricsByMinute[dateId].methods[method];
};

MethodsModel.prototype.setStartTime = function(timestamp) {
  this.metricsByMinute[dateId].startTime = timestamp;
}

MethodsModel.prototype.processMethod = function(methodTrace) {
  // Skip kadira-specific methods so we don't double log
  if (methodTrace.name.indexOf('kadira') === 0) {
    return;
  }

  var metricTags = ['method:' + methodTrace.name];
  if(methodTrace.errored) {
    Kadira.datadogClient.increment('kadira.method.errors', 1, metricTags);
  }

  Kadira.datadogClient.increment('kadira.method.calls', 1, metricTags);
  Kadira.datadogClient.timing('kadira.method.time.compute', methodTrace.metrics.compute || 0, Kadira.timingSampleRate, metricTags);
  Kadira.datadogClient.timing('kadira.method.time.db', methodTrace.metrics.db || 0, Kadira.timingSampleRate, metricTags);
  Kadira.datadogClient.timing('kadira.method.time.http', methodTrace.metrics.http || 0, Kadira.timingSampleRate, metricTags);
  Kadira.datadogClient.timing('kadira.method.time.wait', methodTrace.metrics.wait || 0, Kadira.timingSampleRate, metricTags);
  Kadira.datadogClient.timing('kadira.method.time.async', methodTrace.metrics.async || 0, Kadira.timingSampleRate, metricTags);
  Kadira.datadogClient.timing('kadira.method.time.total', methodTrace.metrics.total || 0, Kadira.timingSampleRate, metricTags);

  // Also log it
  var level = methodTrace.errored ? 'error' : 'info';
  Kadira.logger.info('method call', {
    compute_time: methodTrace.metrics.compute || 0,
    db_time: methodTrace.metrics.db || 0,
    http_time: methodTrace.metrics.http || 0,
    wait_time: methodTrace.metrics.wait || 0,
    total_time: methodTrace.metrics.total || 0,
    user_id: methodTrace.userId || null,
    session_id: methodTrace.session,
    method: methodTrace.name,
  });
};


MethodsModel.prototype.trackDocSize = function(method, size) {
  var timestamp = Ntp._now();
  var dateId = this._getDateId(timestamp);

  var methodMetrics = this._getMetrics(dateId, method);
  methodMetrics.fetchedDocSize += size;
}

MethodsModel.prototype.trackMsgSize = function(method, size) {
  var timestamp = Ntp._now();
  var dateId = this._getDateId(timestamp);

  var methodMetrics = this._getMetrics(dateId, method);
  methodMetrics.sentMsgSize += size;
}

/*
  There are two types of data

  1. methodMetrics - metrics about the methods (for every 10 secs)
  2. methodRequests - raw method request. normally max, min for every 1 min and errors always
*/
MethodsModel.prototype.sendPeriodicMetrics = function(buildDetailedInfo) {
  return;
};
