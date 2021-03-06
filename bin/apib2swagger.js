#!/usr/bin/env node

var fs = require('fs'),
    http = require('http'),
    exec = require('child_process').exec,
    nopt = require('nopt'),
    apib2swagger = require('../lib/main.js');

var options = nopt({
    'input': String,
    'output': String,
    'server': Boolean,
    'port': Number
}, {
    'i': ['--input'],
    'o': ['--output'],
    's': ['--server'],
    'p': ['--port']
});

if (!options.input) {
    console.log("Usage: apib2swagger -i api.md");
    console.log("       apib2swagger -i api.md -o swagger.json");
    console.log("       apib2swagger -i api.md -s");
    console.log("       apib2swagger -i api.md -s -p 3000");
    process.exit();
}

var swaggerUI = 'https://github.com/swagger-api/swagger-ui/archive/master.tar.gz',
    output = options.output || '-',
    port = options.port || 3000,
    apibData = fs.readFileSync(options.input, {encoding: 'utf8'});

apib2swagger.convert(apibData, function(error, result) {
    if (error) {
        console.log(error);
        return;
    }
    var swagger = result.swagger;
    if (options.server) {
        if (!fs.existsSync('swagger-ui-master/dist')) {
            console.log('SwaggerUI is not found.');
            downloadSwagger(function() {
                runServer(swagger);
            });
            return;
        }
        return runServer(swagger);
    }
    var data = JSON.stringify(swagger, null, 4);
    if (output !== '-') {
        fs.writeFileSync(output, data);
    } else {
        console.log(data);
    }
});

function runServer(swagger) {
    var server = http.createServer(function(request, response) {
        console.log(request.url);
        var path = request.url.split('?')[0];
        if (path === '/swagger.json') {
            response.statusCode = 200;
            response.write(JSON.stringify(swagger));
            response.end();
        } else if (path === '/') {
            response.statusCode = 302;
            response.setHeader('Location', '/index.html?url=/swagger.json');
            response.end();
        } else {
            var file = 'swagger-ui-master/dist' + path;
            if (!fs.existsSync(file)) {
                response.statusCode = 404;
                response.end();
                return;
            }
            response.statusCode = 200;
            response.write(fs.readFileSync(file));
            response.end();
        }
    });
    console.log('Serving http://0.0.0.0:' + port + '/ ...');
    server.listen(port);
}

function downloadSwagger(callback) {
    var filename = 'swagger-ui-master.tar.gz';
    console.log('Downloading SwaggerUI (' + swaggerUI + ')');
    exec('wget ' + swaggerUI + ' -O ' + filename, function (err, stdout, stderr) {
        if (err) {
            console.log(stdout);
            console.log(stderr);
            return;
        }
        console.log('Extracting ' + filename);
        exec('tar xzvf ' + filename, function (err, stdout, stderr) {
            if (err) {
                console.log(stdout);
                console.log(stderr);
                return;
            }
            console.log('Complete!');
            callback();
        });
    });
}
