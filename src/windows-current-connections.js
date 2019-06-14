var exec = require('child_process').exec;
var env = require('./env');
var networkUtils = require('./network-utils.js');

function parseShowInterfaces (stdout, config) {
    var lines = stdout.split('\r\n');
    var connections = [];
    var i = 3;

    var connection = {
        iface: null,          // Name
        ssid: null,           // SSID
        bssid: null,
        mode: '',
        mac: null,            // Physical address
        frequency: 0,         // NetworkUtils.frequencyFromChannel(Channel)
        signal_level: 0,      // Signal, but is in percent not dBm
        security: null,        // Authentication
        security_flags: null,
    };

    var tmpConnection = {};
    var fields = [
        'name',
        'ssid',
        'bssid',
        'mode',
        'channel',
        'signal',
        'authentication',
        'encryption'
    ];

    for (var i=0;i<lines.length;i++) {

        // check that array item has proper format
        if (lines[i].match(/.*\: (.*)/)){
            //split into key and value and trim whitespace
            let item = lines[i].split(':').map(e => e.trim());
            if (fields.includes(item[0].toLowerCase())){
                tmpConnection[item[0].toLowerCase()] = item[1];
            }
                      
       
        } else {
            if (tmpConnection.name) {
                connections.push(createInterfaceObject(tmpConnection));
                tmpConnection = {};
            }
        }

    }

    return connections;
}

function createInterfaceObject(tempObj){
    
    //Check for undefined in key fields that produce NAN and replace with undefined
    let formatedObj = {
        iface: tempObj['name'],
        ssid: tempObj['ssid'],
        bssid: tempObj['bssid'],
        mac: tempObj['bssid'],
        mode: tempObj['mode'],
        channel: isNaN(parseInt(tempObj['channel'])) ? undefined : parseInt(tempObj['channel']),
        frequency:  isNaN(parseInt(tempObj['channel'])) ? undefined : parseInt(networkUtils.frequencyFromChannel(parseInt(tempObj['channel']))),
        signal_level: isNaN(parseInt(tempObj['signal'])) ? undefined : networkUtils.dBFromQuality(tempObj['signal']),
        quality: isNaN(parseInt(tempObj['signal'])) ? undefined : parseFloat(tempObj['signal']),
        security: tempObj['authentication'],
        security_flags: tempObj['encryption'],

    }

    //remove all undefiend fields from object
    Object.keys(formatedObj).map(e=> {
        if (typeof formatedObj[e] == 'undefined'){
            delete formatedObj[e]
        }
    })

    return formatedObj
}

function getCurrentConnection(config, callback) {
    var commandStr = "netsh wlan show interfaces" ;
    exec(commandStr, env, function(err, stdout) {
        if (err) {
            callback && callback(err);
        } else {
            try {
                 var connections = parseShowInterfaces(stdout, config)
                 callback && callback(null, connections);
            } catch (e) {
                callback && callback(e);
            }
        }
    });
}

module.exports = function (config) {
    return function(callback) {
        if (callback) {
            getCurrentConnection(config, callback);
        } else {
            return new Promise(function (resolve, reject) {
                getCurrentConnection(config, function (err, connections) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(connections);
                    }
                })
            });
        }
    }
}
