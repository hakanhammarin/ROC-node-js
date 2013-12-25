// USE local DB // Load the library
var nStore = require('nstore');
// Create a store
var users = nStore.new('punchesrelay.db', function () {
  // It's loaded now
  }); 

var toTcp = new Buffer(15); // write data buffer

var net = require('net');

var client = net.connect({host: "192.168.1.72", port: 10000},
    function(e) {
    console.log('R: client connected to MEOS: ' + e);
    });

client.on('error',function(e){
  console.log("R: On Error: " + e);
  });

client.on('data', function(dataTcp) {
  console.log('R: Data received');
  console.log(dataTcp.toString());
  //  client.end();
  });

client.setKeepAlive('enable', 60000);

client.on('end', function() {
  console.log('R: Server disconnected');
  });



var relayServerPort = net.createServer(function(c){
    console.log('R: Client Connected to server');
    c.on('end', function() {
      console.log('R: Client disconnected from server');
      });

    c.on('data', function(relayData) {
  
      //console.log(relayData.readUInt16LE(1)); // Control OK
      console.log("R: "+relayData); // Control OK
      // SI-Card OK
      console.log("R: SI-Card: "+relayData.readUInt32LE(3));
      var sicard = relayData.readUInt32LE(3); 
      // END SI-Card

      // Time
      //toTcp.writeUInt32LE(data.readUInt16BE(12), 11);
      console.log("R: punchTime: "+relayData.readUInt32LE(11));
      var punchTime = relayData.readUInt32LE(11);
      
      
      //Store punch localy
      var punchid = sicard+""+punchTime;
      console.log("R: PunchID: "+punchid);

      // Insert a new document with key "sicard+punchtime"
      users.save(punchid, {SICard: sicard, time: punchTime, Sent: false}, function (err) {
      if (err) { throw err; }
      // The save is finished and written to disk safely
      });
      

      //console.log("Read Time LE: " + data.readUInt16LE(12));
      //console.log("Read Time BE: " + data.readUInt16BE(12));

      // SEND to TCP
      console.log("R: Buffer size: "+client.bufferSize);
      
      client.setKeepAlive('enable', 1000);

      client.write(relayData,'ascii');
      users.save(punchid, {SICard: sicard, time: punchTime, Sent: true}, function (err) {
      if (err) { throw err; }
      // The save is finished and written to disk safely
      });
      c.write(punchid);
      client.setKeepAlive('enable', 60000);

      console.log("R: Buffer size: "+client.bufferSize);
      
      console.log("R: Total data sent: " + client.bytesWritten);
      });
  });

relayServerPort.listen("10001");

relayServerPort.on('error', function (e) {
  if (e.code == 'EADDRINUSE') {
    console.log('R: Address in use, retrying...');
    setTimeout(function () {
      relayServerPort.close();
      relayServerPort.listen("10001");
    }, 1000);
  }
});

