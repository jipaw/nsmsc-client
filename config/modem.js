var modem =  require('../lib/gsm_modem');

var smsc0 = new modem({
    ports: ['/dev/ttyUSB14'],
    msidn: '6289654672090',
    group: ['THREE', 'ALL', 'TSEL'],
    token: 100,
    onDisconnect: onDisconnect,
    debug: false,
    forever: false
});

var smsc1 = new modem({
    ports: ['/dev/ttyUSB15'],
    msidn: '6285890605845',
    group: ['ALL', 'ISAT', 'TSEL'],
    token: 100,
    onDisconnect: onDisconnect,
    debug: false,
    forever: false
});

var device = [smsc0, smsc1];
// connect modem
device.forEach(function(item, index) {
    device[index].connect(function(err) {
        if (err) {
            console.log(err);
            console.log("SMSC-" + index + " not connected");
        } else {
            // console.log(item);
            console.log("SMSC-" + index + " connected");
        }
    })
})

// event listener
device.forEach(function(item,index) {
    device[index].on('message', onStatusReport);
    device[index].on('report', onStatusReport);
    device[index].on('USSD', onUSSD);
})

function onSMS(sms) {
    console.log('onSMS', sms);
}

function onUSSD(ussd) {
    console.log('onUSSD', ussd);
}

function onStatusReport(report) {
    console.log('onStatusReport', report);
}

function onDisconnect(modem) {
    console.log('onDisconnect');
}

module.exports = device;
