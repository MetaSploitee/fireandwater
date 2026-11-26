import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve('public');
const rooms = new Map();
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server = http.createServer((req,res)=>{
  const url = new URL(req.url,'http://localhost');
  const file = path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('Not found');return}res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-cache'}).end(data)});
});
function send(socket,data){if(socket.destroyed)return;const body=Buffer.from(JSON.stringify(data));const head=body.length<126?Buffer.from([0x81,body.length]):Buffer.from([0x81,126,body.length>>8,body.length&255]);socket.write(Buffer.concat([head,body]))}
function broadcast(room,data){for(const p of Object.values(room.players))if(p)send(p.socket,data)}
function presence(room){broadcast(room,{type:'presence',fire:room.players.fire?.name||null,water:room.players.water?.name||null})}
function message(player,msg){const room=rooms.get(player.room);if(!room)return;
  if(msg.type==='state'&&msg.state){const s=msg.state;if(Number.isFinite(s.x)&&Number.isFinite(s.y))broadcast(room,{type:'state',role:player.role,state:{x:Math.max(0,Math.min(1280,s.x)),y:Math.max(0,Math.min(720,s.y)),vx:Number(s.vx)||0,vy:Number(s.vy)||0},seq:msg.seq||0})}
  if(msg.type==='level'&&Number.isInteger(msg.level)&&msg.level>=0&&msg.level<100){room.level=msg.level;broadcast(room,{type:'level',level:room.level})}
  if(msg.type==='event'&&['gem','switch','ready','restart'].includes(msg.event))broadcast(room,{type:'event',role:player.role,event:msg.event,id:String(msg.id||'').slice(0,50)})
}
server.on('upgrade',(req,socket)=>{if(req.headers.upgrade?.toLowerCase()!=='websocket'){socket.destroy();return}
  const u=new URL(req.url,'http://localhost');const code=u.searchParams.get('room')?.toUpperCase();if(!code||!/^[A-Z0-9]{6}$/.test(code)){socket.destroy();return}
  const key=req.headers['sec-websocket-key'];if(!key){socket.destroy();return}
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')+'\r\n\r\n');
  let room=rooms.get(code);if(!room){room={players:{fire:null,water:null},level:0};rooms.set(code,room)}
  const want=u.searchParams.get('role');const role=want&&['fire','water'].includes(want)&&!room.players[want]?want:!room.players.fire?'fire':!room.players.water?'water':null;
  if(!role){send(socket,{type:'full'});socket.end();return}
  const name=(u.searchParams.get('name')||'لاعب').trim().slice(0,18).replace(/[<>]/g,'')||'لاعب';
  const player={socket,room:code,role,name};room.players[role]=player;send(socket,{type:'welcome',role,level:room.level});presence(room);
  let pending=Buffer.alloc(0);socket.on('data',chunk=>{pending=Buffer.concat([pending,chunk]);while(pending.length>=2){const opcode=pending[0]&15,b=pending[1],lenCode=b&127,header=2+(lenCode===126?2:lenCode===127?8:0)+((b&128)?4:0);if(pending.length<header)return;let len=lenCode===126?pending.readUInt16BE(2):lenCode===127?Number(pending.readBigUInt64BE(2)):lenCode;if(len>65536){socket.destroy();return}if(pending.length<header+len)return;const payload=Buffer.from(pending.subarray(header,header+len));if(b&128){const mask=pending.subarray(header-4,header);for(let i=0;i<len;i++)payload[i]^=mask[i%4]}pending=pending.subarray(header+len);if(pending.length>1000000){socket.destroy();return}if(opcode===8){socket.end();return}if(opcode===1)try{message(player,JSON.parse(payload.toString()))}catch{}}});
  socket.on('close',()=>{if(room.players[role]===player)room.players[role]=null;presence(room);if(!room.players.fire&&!room.players.water)rooms.delete(code)});socket.on('error',()=>{});
});
export default server;
if (!process.env.VERCEL) {
  const port=Number(process.env.PORT)||3000;
  server.listen(port,()=>console.log(`Fire & Water running at http://localhost:${port}`));
}
