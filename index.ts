import { createServer, Socket, } from "net";
import { createWriter, createReader } from "./bufferStuff/index";
import { Endian } from "./bufferStuff/Endian";
import { FunkyArray } from "./funkyArray";
import { Vec3 } from "./Vec3";
import { Packets } from "./Packets";
import { IWriter } from "./bufferStuff/writers/IWriter";
import { IReader } from "./bufferStuff/readers/IReader";

class Client {
	public socket:Socket;
	public timeoutTime:number;
	public username:string;

	public pos:Vec3;

	public constructor(socket:Socket) {
		this.socket = socket
		this.timeoutTime = Date.now() + 10000; // 10 secs away
		this.username = "LOADING";

		this.pos = new Vec3(0, 0, 0);
	}
}

const clients = new FunkyArray<number, Client>();

// Cache this, there's no point in making it every time we want to keepalive ping
const keepAlivePacket = createWriter(Endian.LE, 1).writeUByte(Packets.KeepAlive).toBuffer();

setInterval(() => {
	/*for (let client of clients.getIterableItems()) {
		if (client == null) continue;

		if (Date.now >= client.timeoutTime) {
			client.socket.write(createWriter(Endian.LE, 1).writeUByte(Packets.KeepAlive).toBuffer());
			client.socket.end();
		} else {
			client.socket.write(keepAlivePacket);
		}
	}*/
	clients.forEach(client => {
		if (Date.now() >= client.timeoutTime) {
			client.socket.write(createWriter(Endian.LE, 1).writeUByte(Packets.KeepAlive).toBuffer());
			client.socket.end();
		} else {
			client.socket.write(keepAlivePacket);
		}
	});
}, 1000);

function decodeBitFlags(byte = 0) {
	let result = new Array<boolean>();

	// Extract bits back to flags
	for (let i = 0; i < 8; i++) {
		result.push((byte & (1 << i)) != 0);
	}

	return result;
}

function printableFlags(flags = [false]) {
	let result = "";
	flags.forEach(bool => result += `${bool ? 1 : 0}`);

	return result;
}

let globalIdPool = 0;

const server = createServer((socket) => {
	console.log("CLIENT CONNECTED");

	const isHost = clients.length === 0;

	const clientId = globalIdPool;
	const client = clients.set(globalIdPool++, new Client(socket));

	socket.on("data", data => {
		//console.log(data);
		const packet = createReader(Endian.LE, data);
		const packetId = packet.readUByte();
		switch (packetId) {
			case Packets.KeepAlive:
				console.log(`Client ${clientId} keepalive`);
				client.timeoutTime = Date.now() + 10000;
				break;

			case Packets.AbsMov:
				AbsoluteMovement(packet);
				break;

			/*case Packets.RelativeMovement:
				RelativeMovement(packet);
				break;*/

			case Packets.SpawnPlayer:
				SpawnPlayer(packet);
				break;

			case Packets.SceneChange:
				SceneChange(packet);
				break;

			default:
				console.log(Packets[packetId]);
				break;
		}
	});

	function AbsoluteMovement(packet:IReader) {
		client.pos.x = packet.readFloat();
		client.pos.y = packet.readFloat();
		client.pos.z = packet.readFloat();

		//console.log(`ABS | X: ${packet.readFloat().toFixed(2)} Y: ${packet.readFloat().toFixed(2)} Z: ${packet.readFloat().toFixed(2)}`)

		console.log(`${Date.now()} | CMOV A | ${client.pos}`);
	}

	/*function RelativeMovement(packet = new bufferStuff.Reader) {
		const diffX = packet.readUByte() / 32 * 2;
		const diffY = packet.readUByte() / 32 * 2;
		const diffZ = packet.readUByte() / 32 * 2;

		//console.log(`REL | X: ${diffX} Y: ${diffY} Z: ${diffZ}`);

		client.pos.x += diffX;
		client.pos.y += diffY;
		client.pos.z += diffZ;

		console.log(`MOV R | ${client.pos}`);
	}*/

	function SpawnPlayer(packet:IReader) {
		const username = packet.readShortString();
		client.username = username;
		console.log("User " + username + " connected");
		socket.write(createWriter(Endian.LE, 2).writeUByte(Packets.SetIsHost).writeBool(isHost).toBuffer());
		if (isHost) {
			console.log(username + " set to host");
		}
	}

	function SceneChange(packet:IReader) {
		const sceneName = packet.readShortString();
		console.log("Host changed scene to " + sceneName);
	}
	
	socket.on("close", hadError => {

		closeEvents();
	});

	socket.on("error", err => {

		closeEvents();
	});

	function closeEvents() {
		clients.remove(clientId);
		console.log("CLIENT DISCONNECTED");
	}
});

server.listen(33843, () => console.log(`Listening at ${33843}`));