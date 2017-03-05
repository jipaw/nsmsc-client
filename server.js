require('dotenv').config()
var express = require("express");
var io = require('socket.io-client')
var socket = io.connect('http://' + process.env.IO_HOST + ":" + process.env.IO_PORT);
var kue = require('kue');
var jobs = kue.createQueue();
var device = require('./config/modem');
var bus = require('./controller/eventBus');
var logger = require("./controller/logging");
var _ = require('lodash');
var app = express();

// Add a connection listener
socket.on('connect', function(socket) {
    console.log('Socket client connected to server http://' + process.env.IO_HOST + ":" + process.env.IO_PORT);
});

// event listener for modem
device.forEach(function(item, index) {
    device[index].on('reportreceived', function(reportObj) {
        socket.emit('report_send', reportObj)
    });
    device[index].on('messagereceived', function(msg) {
        socket.emit('message_send', msg)
    });
})

// Register event listener
socket.on('sms_request', function(data) {
    // console.log('Data triggered!:', data);
    var task = jobs.create('send_message', {
        name: "send sms",
        destination: data.destination,
        text: data.text,
        user: data.user,
        trxid: data.trxid,
        hlr: data.hlr
    });
    task
        .on('complete', function() {
            console.log('Job', task.id, 'with name', task.data.name, 'is done');
        })
        .on('failed', function() {
            console.log('Job', task.id, 'with name', task.data.name, 'has failed');
        })

    task.attempts(2).delay(2000).save();
    // console.log(data);
    jobs.process('send_message', function(task, done) {
        /* carry out all the job function here */
        data = task.data;
        device.push(device.splice(0, 1)[0]); // swap device position
        dataLoop : for (var i = 0; i < device.length; i++) {
            itemLoop : for (var j = 0; j < device[i].group.length; j++) {
                // console.log(j);
                // console.log(device[0].group[j]);
                if (device[0].group[j].toString() === task.data.hlr.toString()) {
                    break dataLoop;
                }
            }
            device.push(device.splice(0, 1)[0]);
        }
        device[0].sendSMS({
            receiver: task.data.destination,
            text: task.data.text,
            request_status: true
        }, function(err, ref) {
            // console.log(ref);
            if (err || ref === undefined) {
                data["reference"] = "PENDING";
                socket.emit('send_data', data);
                console.log(data);
                return done(new Error('Failed to send sms'));
            };
            data["reference"] = ref[0];
            socket.emit('send_data', data);
            device[0].deleteAllSMS(function(err, results) {
                if (err) {
                    console.log("Unable to delete message");
                }
            });
            done && done();
        });
    });
});

app.listen(process.env.PORT, function() {
    console.log("Nsmsc Client running on port:" + process.env.PORT);
});
