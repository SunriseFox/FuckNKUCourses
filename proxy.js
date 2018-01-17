
// LICENSE:
// YOU ARE NOT ALLOWED TO DISTRIBUTE IT, MODIFY IT OR EVEN USE IT.
// JUST PROSTRATE YOURSELF BEFORE IT.

// AUTHOR: Sun-Yi Ran (sunrisefox@qq.com)
// CONTACT BEFORE DOING ANY BAD THINGS.

const http = require('http');
const net = require("net");
const dns = require("dns");
const qs = require('querystring');
const { URL } = require("url");
const port = 3000;

const server = http.createServer();
dns.setServers([
    '8.8.8.8',
    '2620:0:ccc::2',
    '8.8.4.4',
    '2620:0:ccd::2'
]);

const map_req = new Map();
const map_res = new Map();
const map_elect = new Map();


let login_req;
information = {};
information.name = { "init": false };

let global_count = 0;

const regex_hostport = /^([^:]+)(:([0-9]+))?$/;

const getHostPortFromString = function (hostString, defaultPort) {
    let host = hostString;
    let port = defaultPort;
    const result = regex_hostport.exec(hostString);
    if (result !== null) {
        host = result[1];
        if (result[2] !== null) {
            port = result[3];
        }
    }
    return ( [host, port] );
};

const sendRequest = function(req, res){
    const host_port = getHostPortFromString(req.headers['host']);
    const host = host_port[0];
    const port = host_port[1];
    const url = new URL(req.url);
    const proxy_req = http.request({
        hostname: host,
        port: port,
        method: req.method,
        headers: req.headers,
        path: url.pathname + url.search + url.hash,
        // path: req.url,
        timeout: 5000
    });

    proxy_req.whoami = req.whoami;
    proxy_req.on('response',function (proxy_res) {
        if(res !== undefined)
            res.writeHeader(proxy_res.statusCode, proxy_res.headers);
        proxy_res.whoami = proxy_req.whoami;
        proxy_res.res_array = [];
        map_res.set(proxy_res.whoami, proxy_res);

        proxy_res.on('data', function (chunk) {
            const arr = map_res.get(proxy_res.whoami).res_array;
            arr.push(chunk);
        });

        proxy_res.on('end', function () {
            const arr = proxy_res.res_array;
            proxy_res.res_buffer = Buffer.concat(arr);
            if(res !== undefined) {
                res.write(proxy_res.res_buffer);
                res.end();
            }
            if(req.specialType === undefined) {
                // Something else we don't care.
            } else if(req.specialType === 'elect'){
                if (proxy_res.headers['Location'] !== undefined && proxy_res.headers['Location'].indexOf('eamis.nankai.edu.cn/eams/login.action') !== -1) {
                    sendRequest(login_req, undefined);
                    return;
                }
                const str = proxy_res.res_buffer.toString();
                if (str.indexOf('成功') !== -1 || str.indexOf('已经选过') !== -1) {
                    console.log(`Successfully got a class, name ${information.name[req.params.lesson0]}, req ${req.whoami}`);
                    map_elect.delete(proxy_res.whoami);
                } else if(str.indexOf('冲突') !== -1) {
                    console.log(`Time conflict for class ${information.name[req.params.lesson0]} (req ${req.whoami}). We keep retrying but you may have to fix it.`);
                } else {
                    console.log(`Failed to get class ${information.name[req.params.lesson0]} (req ${req.whoami}), retry.`);
                }
            } else if(req.specialType === 'name'){
                let str = proxy_res.res_buffer.toString();
                str = str.slice(str.indexOf('['), str.lastIndexOf(']')+1);
                let name = eval(str);
                try {
                    name.forEach(function (el) {
                        information.name[+el.id] = `${el.name} of ${el.teachers}`;
                    });
                    information.name.init = true;
                } catch (e){
                    information.name.init = false;
                }
            }
        })
    });
    proxy_req.on('error', function (e) {
        console.log(e);
        if(res !== undefined) {
            res.writeHeader(504);
            res.end(`[Proxy Response] ${e}`);
        }
    });
    proxy_req.write(req.res_buffer);
    proxy_req.end();
};

server.on('connect', function (req, socket, head) {
    // socket.end();
    const hostPort = getHostPortFromString(req.url, 443);
    const hostDomain = hostPort[0];
    const port = parseInt(hostPort[1]);
    // console.log("Proxying HTTPS request for:", hostDomain, port);

    const proxySocket = new net.Socket();
    proxySocket.connect(port, hostDomain, function () {
            proxySocket.write(head);
            socket.write("HTTP/" + req.httpVersion + " 200 Connection established\r\n\r\n");
        }
    );
    proxySocket.on('data', function (chunk) {
        socket.write(chunk);
    });
    proxySocket.on('end', function () {
        socket.end();
    });
    proxySocket.on('error', function () {
        socket.write("HTTP/" + req.httpVersion + " 500 Connection error\r\n\r\n");
        socket.end();
    });
    socket.on('data', function (chunk) {
        proxySocket.write(chunk);
    });

    socket.on('end', function () {
        proxySocket.end();
    });
    socket.on('error', function () {
        proxySocket.end();
    });
});

server.on('request', function (req, res) {

    // Serve magic to local request.
    if(req.url.startsWith('http://localhost'))
        return serveData(req,res);

    req.whoami = global_count++;

    if(req.method === 'POST'){
        if(req.url.indexOf('eams/stdElectCourse!batchOperator.action?') !== -1) {
            map_elect.set(req.whoami, req);
            req.specialType = 'elect';
        } else if(req.url.indexOf('/eams/login.action') !== -1){
            console.log('Found login action. Save it for later use.');
            login_req = req;
            req.specialType = 'login';
        }
    }else {
        if(req.url.indexOf('/eams/stdElectCourse!data.action') !== -1){
            if(information.name.init === false) req.headers['If-None-Match'] = 0;
            req.specialType = 'name';
        }
    }

    // console.log(`Request ${req.whoami} to ${req.url} detected.`);

    map_req.set(req.whoami, req);
    req.res_array = [];
    req.on('data',function (chunk) {
        const arr = map_req.get(req.whoami).res_array;
        arr.push(chunk);
    });
    req.on('end', function () {
        const arr = req.res_array;
        req.res_buffer = Buffer.concat(arr);
        if(req.specialType === 'elect'){
            req.params = qs.parse(req.res_buffer.toString());
            console.log(`Found elect action (req ${req.whoami}). I guess the class is ${information.name[req.params.lesson0]}`);
        }
        sendRequest(req, res);
    });

});

server.listen(port);
console.log(`Server started at localhost:${port}, set your browser proxy.`);

const serveData = function (req, res) {
    // TODO: add control to remove a running retry
    // TODO: , and set interval.
    res.end(req.url);
    return null;
};

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ', err);
    if(err.errno === 'EADDRINUSE') process.exit(-1);
});

const k = function () {
    setTimeout(k, 5000);
    map_elect.forEach(function (v, k) {
        // console.log(`Retrying: ${k}`);
        sendRequest(v, undefined);
    });
};
k();


