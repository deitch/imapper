"use strict";
var async = require('async'), _ = require('lodash');

module.exports = function(connection, parsed, data, callback) {
    if (!parsed.attributes ||
        parsed.attributes.length !== 2 ||
        !parsed.attributes[0] ||
        ["ATOM", "SEQUENCE"].indexOf(parsed.attributes[0].type) < 0 ||
        !parsed.attributes[1] ||
        ["ATOM", "STRING"].indexOf(parsed.attributes[1].type) < 0
    ) {

        connection.send({
            tag: parsed.tag,
            command: "BAD",
            attributes: [{
                type: "TEXT",
                value: "COPY expects sequence set and a mailbox name"
            }]
        }, "INVALID COMMAND", parsed, data);
        return callback();
    }

    if (["Selected"].indexOf(connection.state) < 0) {
        connection.send({
            tag: parsed.tag,
            command: "BAD",
            attributes: [{
                type: "TEXT",
                value: "Select mailbox first"
            }]
        }, "COPY FAILED", parsed, data);
        return callback();
    }

    var sequence = parsed.attributes[0].value,
			path = parsed.attributes[1].value;
		// now try and get the selected mailbox
		connection.getFolder(path,function (err,target) {
	    if (!target) {
	        connection.send({
	            tag: parsed.tag,
	            command: "NO",
	            attributes: [{
	                type: "TEXT",
	                value: "Target mailbox does not exist"
	            }]
	        }, "COPY FAIL", parsed, data);
	        return callback();
	    } else {
		    connection.getMessageRange(sequence, false, function (err,range) {
					async.each(_.without(range,null),function (msg,cb) {
						var message = msg,
							flags = [].concat(message.flags || []),
							internaldate = message.internaldate || new Date();
						connection.createMessage(path,{internaldate:internaldate,flags:flags,raw:message.raw}, cb);
					},function () {
				    connection.send({
				        tag: parsed.tag,
				        command: "OK",
				        attributes: [{
				            type: "TEXT",
				            value: "COPY Completed"
				        }]
				    }, "COPY", parsed, data);
				    callback();
					});
		    });
	    }
		});
};