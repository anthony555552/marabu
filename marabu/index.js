import {createServer, Socket} from 'net';
import{readFileSync, writeFile} from 'fs';

const NODE = "ANTHONY_RADKE_NODE";

const PORT = 18018;

const PEERS = JSON.parse(readFileSync("peers.json"));

const CONNECTIONS = {};

const HELLO_MSG = {
    "type": "hello",
    "version": "0.9.0",
    "agent": NODE
};
const GET_PEERS_MESSAGE = {
    "type": "getpeers"
}

function updatePeers(newPeers) {
    PEERS = [...new Set(PEERS.append(newPeers))]
    writeFile("peers.json", JSON.stringify(PEERS))
}

function handleHello(sock)
{
    if (!CONNECTIONS[sock]) {
        CONNECTIONS[sock] = true;
        updatePeers([sock.remoteAddress]);
        requestPeers(sock);
    }
    
    // sock.on('data', response => {
    //     console.log("hello response: ", response.toString());
    // })
}
function requestPeers(sock){
    console.log("requested peers")
    sock.write(JSON.stringify(GET_PEERS_MESSAGE));
}
function sendHello(sock) {
    sock.write(JSON.stringify(HELLO_MSG))
    requestPeers(sock)
}

function handleGetPeers(sock) {
    console.log("sending our peers...")
    if (CONNECTIONS[sock]) {
        sock.write(JSON.stringify({
            "type": "peers",
            "peers": PEERS
        }))
    } else {
        sock.write(JSON.stringify({
            "type": "error",
            "name": "INVALID_HANDSHAKE",
            "message": "No greeting sent."
        }))
    }
}

function handleRecievePeers(msg) {
    console.log("got peers: ", msg)
    updatePeers(msg)
}

function createNode() {
    var server = createServer();
    server.listen(PORT, () =>{
        console.log("listening");
    })
    server.on('connection', connection => {
        console.log("server recieved new connection")
        var message = 
        {
            "type": "hello",
            "version": "0.9.0",
            "agent": NODE
        }
        connection.write(JSON.stringify(message));
        connection.on("data", data => handleConnection(data.toString(), connection));
    })

}
function handleConnection(message, connection) {
    try{
        console.log("recieved ", message)
        const messages = message.trim().split('\n')
        console.log("len:", messages.length)
        for (var i in messages) {
            message = JSON.parse(messages[i]);
            console.log("parsed message:", message, message.type, messages)
            if(message.type == "hello"){
                handleHello(connection)
            } else if (message.type == "getpeers") {
                handleGetPeers(connection)
            } else if (message.type == "peers") { 
                handleRecievePeers(msg)
            } else {
                console.log("undefined type")
            }
        }
    }
    catch(e){
        console.log("error", e);
        var response = 
        {
            "type": "error",
            "name": "INVALID_FORMAT",
            "message": "The note field in the block message contains more than 128 characters"
        }
        connection.write(JSON.stringify(response));
    }
}

createNode()

PEERS.map((ip) =>{
    var sock = Socket();
    sock.connect(PORT, ip, () => {
        console.log("connected to ", ip)
        sendHello(sock);
        sock.on("data", data => handleConnection(data.toString(), sock))
    })
})