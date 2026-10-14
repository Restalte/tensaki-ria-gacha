const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const SIZE = 15;
const rooms = new Map();

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ok:true, game:'シュレディンガーの五目並べ'}));

function newGame(code) {
 return {room:code, players:{black:null,white:null}, board:Array.from({length:SIZE},()=>Array(SIZE).fill(null)),
  turn:'black', selected:{black:90,white:30}, counts:{black:0,white:0}, lastPlaced:{black:null,white:null},
  finished:false,last:null,moveNo:0,winningLines:[],message:'先攻（黒）の手番です。石を置くか、観測してください。'};
}
function serialize(room) {
 return {room:room.room,players:Number(!!room.players.black)+Number(!!room.players.white),board:room.board,turn:room.turn,
  selected:room.selected,counts:room.counts,lastPlaced:room.lastPlaced,finished:room.finished,last:room.last,
  moveNo:room.moveNo,winningLines:room.winningLines,message:room.message};
}
function broadcast(room){io.to(room.room).emit('room-state',serialize(room))}
function lineFor(board,color){
 const dirs=[[1,0],[0,1],[1,1],[1,-1]];
 for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(board[r][c]?.color===color){
  for(const [dr,dc] of dirs){
   let cells=[[r,c]],rr=r+dr,cc=c+dc;
   while(rr>=0&&rr<SIZE&&cc>=0&&cc<SIZE&&board[rr][cc]?.color===color){cells.push([rr,cc]);rr+=dr;cc+=dc}
   rr=r-dr;cc=c-dc;
   while(rr>=0&&rr<SIZE&&cc>=0&&cc<SIZE&&board[rr][cc]?.color===color){cells.unshift([rr,cc]);rr-=dr;cc-=dc}
   if(cells.length>=5)return cells;
  }
 }
 return null;
}
function fail(socket,msg){socket.emit('action-error',{message:msg})}
function findRoom(code){return rooms.get(String(code||'').toUpperCase())}
io.on('connection',socket=>{
 socket.on('create-room',()=>{
  let code;
  do {code=crypto.randomBytes(3).toString('hex').toUpperCase()} while(rooms.has(code));
  const room=newGame(code);room.players.black=socket.id;rooms.set(code,room);
  socket.join(code);socket.data.room=code;socket.data.color='black';
  socket.emit('room-created',{room:code});broadcast(room);
 });
 socket.on('join-room',data=>{
  const room=findRoom(data?.room);
  if(!room)return socket.emit('room-error',{message:'その部屋番号は見つかりません。番号を確認してください。'});
  if(room.players.white)return socket.emit('room-error',{message:'この部屋は満員です。別の部屋を作ってください。'});
  if(room.players.black===socket.id)return socket.emit('room-error',{message:'作成者はすでに先攻として参加しています。'});
  room.players.white=socket.id;socket.join(room.room);socket.data.room=room.room;socket.data.color='white';
  socket.emit('room-joined',{room:room.room});room.message='対戦相手が参加しました。先攻（黒）から開始します。';broadcast(room);
 });
 socket.on('game-action',data=>{
  const room=findRoom(data?.room),action=data?.action;
  if(!room||socket.data.room!==room.room)return fail(socket,'対戦部屋に参加していません。');
  if(room.finished)return fail(socket,'ゲームは終了しています。');
  if(!room.players.white)return fail(socket,'対戦相手の参加を待っています。');
  if(socket.data.color!==room.turn)return fail(socket,'相手の手番です。');
  if(!action||typeof action.type!=='string')return fail(socket,'操作が不正です。');
  if(action.type==='place'){
   const r=Number(action.r),c=Number(action.c),p=Number(action.p),color=room.turn;
   const allowed=color==='black'?[90,70]:[30,10];
   if(!Number.isInteger(r)||!Number.isInteger(c)||r<0||r>=SIZE||c<0||c>=SIZE)return fail(socket,'盤面の位置が不正です。');
   if(room.board[r][c])return fail(socket,'そこにはすでに石があります。');
   if(!allowed.includes(p))return fail(socket,'その確率の石はこの手番では使えません。');
   if(room.lastPlaced[color]===p)return fail(socket,'同じ確率の石を連続して使うことはできません。');
   for(let rr=0;rr<SIZE;rr++)for(let cc=0;cc<SIZE;cc++)if(room.board[rr][cc])room.board[rr][cc].color=null;
   room.board[r][c]={p,owner:color,color:null};room.last=[r,c];room.lastPlaced[color]=p;room.moveNo++;
   room.selected[color]=color==='black'?(p===90?70:90):(p===30?10:30);
   room.turn=color==='black'?'white':'black';
   room.message=`${color==='black'?'先攻（黒）':'後攻（白）'}が確率${p}の石を配置しました。`;
  } else if(action.type==='observe'){
   const color=room.turn;
   if(room.counts[color]>=5)return fail(socket,'このプレイヤーは観測回数を使い切っています。');
   room.counts[color]++;
   for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){const st=room.board[r][c];if(st)st.color=Math.random()*100<st.p?'black':'white'}
   const b=lineFor(room.board,'black'),w=lineFor(room.board,'white');
   if(b&&w){room.finished=true;room.winningLines=[...b,...w];room.message=`黒・白の両方が五目！ 観測した${color==='black'?'先攻（黒）':'後攻（白）'}の勝ち！`;}
   else if(b||w){room.finished=true;room.winningLines=b||w;const winner=b?'黒':'白';room.message=`${winner}${winner==='黒'?'（先攻）':'（後攻）'}が五目！ ${winner==='黒'?'先攻':'後攻'}の勝ち！`;}
   else room.message='観測結果：今回は五目なし。色は表示したままです。次に石を置くと未確定状態に戻り、次の観測では再抽選されます。';
  } else if(action.type==='pass'){
   room.message=`${room.turn==='black'?'先攻（黒）':'後攻（白）'}が観測せずに手番を終了しました。`;
   room.turn=room.turn==='black'?'white':'black';
  } else return fail(socket,'不明な操作です。');
  broadcast(room);
 });
 socket.on('leave-room',data=>{
  const code=socket.data.room||data?.room,room=findRoom(code);
  if(room){
   socket.leave(room.room);
   if(room.players.black===socket.id)room.players.black=null;
   if(room.players.white===socket.id)room.players.white=null;
   io.to(room.room).emit('room-error',{message:'対戦相手が退出しました。'});
   if(!room.players.black&&!room.players.white)rooms.delete(room.room);
   else {room.finished=true;room.message='対戦相手が退出しました。新しい部屋を作ってください。';broadcast(room)}
  }
  socket.data.room=null;socket.data.color=null;socket.emit('room-left');
 });
 socket.on('disconnect',()=>{
  const room=findRoom(socket.data.room);
  if(!room)return;
  if(room.players.black===socket.id)room.players.black=null;
  if(room.players.white===socket.id)room.players.white=null;
  if(!room.players.black&&!room.players.white)rooms.delete(room.room);
  else {room.finished=true;room.message='対戦相手との接続が切れました。新しい部屋を作ってください。';broadcast(room)}
 });
});
server.listen(PORT,()=>console.log(`Schrodinger Gomoku listening on ${PORT}`));
