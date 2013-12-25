// USE local DB // Load the library
var nStore = require('nstore');
// Create a store
var users = nStore.new('punches.db', function () {
  // It's loaded now
  }); 


var toTcp = new Buffer(15); // write data buffer

var net = require('net');

//var client = net.connect({host: "192.168.1.72", port: 10000},
var client = net.connect({host: "127.0.0.1", port: 10001},
    function() {
    console.log('S: client connected to RELAY');
    });

client.on('error',function(e){
  console.log("S: On Error: " + e);
  });

client.on('data', function(dataTcp) {
  console.log('S: Data received'+ dataTcp);
    users.save(dataTcp, {Sent: true}, function (err) {
    if (err) { throw err; }
    // The save is finished and written to disk safely
    });

  });

client.setKeepAlive('enable');

client.on('end', function() {
  console.log('S: Server disconnected');
  });

var com = require("serialport");

var serialPort = new com.SerialPort("/dev/ttyUSB0", {
    baudrate: 38400,
    dataBits: 8,
   parity: 'none',
   stopBits: 1,
   flowControl: false,
   
    parser: com.parsers.raw
  });

serialPort.on('open',function() {
  console.log('S: Serial Port open');
});
serialPort.on('data', function(data) {
//	var data2 = data.toString('utf8');
//  console.log(data);
//  console.log(data2);
// console.log("toTcp: " + toTcp);

  toTcp.writeUInt8(0x00, 0);  // Null

  toTcp.writeUInt16LE(data.readUInt8(4), 1); // Control OK

// SI-Card OK
  var serie = data.readUInt8(6)
  console.log("Serie: " + data.readUInt8(6))
  if (serie > 1 & serie <=4) {
        var sicard = data.readUInt16BE(7)+100000*serie  // OLD Mode
        }
  else {var sicard = data.readUInt32BE(5) } // Ext.mode
    
  console.log("S: SI-Card: " + sicard);  
  toTcp.writeUInt32LE(sicard, 3);
// END SI-Card

// Time
//toTcp.writeUInt32LE(data.readUInt16BE(12), 11);
  var ampm = data.readUInt8(3)
//console.log("AM-PM: " + ampm);
  if (ampm = 1) {
    var toTimePM = ((data.readUInt16BE(10)*10)+432000);
    toTcp.writeUInt32LE(toTimePM, 11);
    // toTcp.writeUInt32LE((600), 11); // 1min 
    // toTcp.writeUInt32LE((432000), 11); // 1min
    console.log("S: AM-PM: " + ampm);
    console.log("S: Calc Time: " + toTimePM);
    punchTime = toTimePM;

    }
  else if (ampm =0) {
    var punchTime = (data.readUInt16BE(10)*10);
    toTcp.writeUInt32LE(data.readUInt16BE(10)*10,11); 
    console.log("S: AM-PM: " + ampm);
    }

  //Store punch localy
  var punchid = sicard+""+punchTime;
  console.log("S: PunchID: "+punchid);

  // Insert a new document with key "sicard+punchtime"
  users.save(punchid, {SICard: sicard, time: punchTime, Sent: false}, function (err) {
    if (err) { throw err; }
    // The save is finished and written to disk safely
    });


  //console.log("Read Time LE: " + data.readUInt16LE(12));
  //console.log("Read Time BE: " + data.readUInt16BE(12));

  // SEND to TCP
  console.log("S: Buffer size: "+client.bufferSize);
  client.write(toTcp,'ascii');
console.log("S: Buffer size: "+client.bufferSize);
  
  console.log(data);
  console.log(toTcp);

  //  client.write(data,'ascii');
  //	client.write(buf,'ascii');
  console.log("S: Total data sent: " + client.bytesWritten);
  //var data2 = data.toString();
  //console.log(data2);


  });
