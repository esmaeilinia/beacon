'use strict';

var WebSocketServer = require('ws').Server
  , broker = require('../broker')
  ;

var tag = 'WS/BROKER';

module.exports = function(server) {
  var wss = new WebSocketServer({server: server, path: '/broker'});

  var count = 0;
  var clients = {};

  wss.broadcast = function broadcast(data) {
    for (var i in clients) {
      var ws = clients[i];
      if (ws.readyState === ws.OPEN) {
        ws.send(data);
      } else if (ws.readyState === ws.CLOSED) {
        console.log(tag, 'Peer #' + ws.id + ' disconnected from /broker.');
        delete clients[ws.id];
      }
    };
  };

  wss.on('connection', function connection(ws) {
    var id = count++;
    clients[id] = ws;
    ws.id = id;
    ws.send(JSON.stringify({type: 'setup', data: {interval: broker.interval}}));
    broker.enqueueCountsFeed().tap(function(event) {
      wss.broadcast(JSON.stringify(event));
    }).subscribeOnError(function(err) {
      console.log(tag, err);
    });;
    console.log(tag, 'Peer #' + id + ' connected to /broker.');
  });

  broker.eventFeed().tap(function(event) {
    wss.broadcast(JSON.stringify(event));
  })
  .subscribeOnError(function(err) {
    console.log(tag, err);
  });
};
