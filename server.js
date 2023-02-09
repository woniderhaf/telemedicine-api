const path = require('path');
const express = require('express');
const bodyParser = require('body-parser')
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const cors = require('cors')
const Session = require('./src/models/Session')
const {version, validate,v4} = require('uuid');
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')
// db
const mongoose = require('mongoose')

dotenv.config()

const ACTIONS = require('./src/socket/actions');
const PORT = process.env.PORT || 4444;

function getClientRooms() {
  const {rooms} = io.sockets.adapter;
  return Array.from(rooms.keys()).filter(roomID => validate(roomID) && version(roomID) === 4);
}
app.use(bodyParser.urlencoded())
app.use(cors())
app.use(express.json())

function generateAccessToken(username) {
  return jwt.sign(username, process.env.TOKEN_SECRET);
}
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader 
  console.log({token});


  if (token == null) return res.sendStatus(401)

  jwt.verify(token, process.env.TOKEN_SECRET , (err, user) => {
    console.log(err)

    if (err) return res.sendStatus(403)

    req.user = user

    next()
  })
}

app.post('/createRoom', authenticateToken, async (req,res) => {
  const body = req.body
  const roomId = v4()
  const url = `https://testcall.medmis.ru/room/${roomId}`
  const newSession = new Session({roomId,url, ...body})
  await newSession.save()
  res.send({roomId, url})

})




function shareRoomsInfo() {
  io.emit(ACTIONS.SHARE_ROOMS, {
    rooms: getClientRooms()
  })
}

io.on('connection', socket => {
  console.log('connection');
  shareRoomsInfo();

  socket.on(ACTIONS.JOIN, async config => {
    const {room: roomID} = config;
    console.log('join');
    const {rooms: joinedRooms} = socket;
    
    if (Array.from(joinedRooms).includes(roomID)) {
      return console.warn(`Already joined to ${roomID}`);
    }

    const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);

    const roomData = await Session.findOne({roomId:roomID})

    socket.emit(ACTIONS.ROOM_DATA, roomData)
    
    if (clients.length > 1) {
      socket.emit('ROOM-FULL', {code:501})
      return console.warn(`room ${roomID} full`);
    } else {
      socket.emit('ROOM-FULL', {code:200})
    }

    clients.forEach(clientID => {
      io.to(clientID).emit(ACTIONS.ADD_PEER, {
        peerID: socket.id,
        createOffer: false
      });

      socket.emit(ACTIONS.ADD_PEER, {
        peerID: clientID,
        createOffer: true,
      });
    });

    socket.join(roomID);
    shareRoomsInfo();
  });

  function  leaveRoom(conf) {
    console.log({conf});
    const {rooms} = socket;
    Array.from(rooms)
      // LEAVE ONLY CLIENT CREATED ROOM
      .filter(roomID => validate(roomID) && version(roomID) === 4)
      .forEach( async roomID => {

        const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);
        if(clients.length < 2) {
          await Session.findOneAndDelete({roomId: roomID})
        }
        clients
          .forEach(clientID => {
          io.to(clientID).emit(ACTIONS.REMOVE_PEER, {
            peerID: socket.id,
          });

          socket.emit(ACTIONS.REMOVE_PEER, {
            peerID: clientID,
          });
        });
        socket.leave(roomID);
      });
    
    
    shareRoomsInfo();
  }

  socket.on(ACTIONS.LEAVE, config => leaveRoom(config));
  socket.on('disconnect', leaveRoom);

  socket.on(ACTIONS.RELAY_SDP, ({peerID, sessionDescription}) => {
    io.to(peerID).emit(ACTIONS.SESSION_DESCRIPTION, {
      peerID: socket.id,
      sessionDescription,
    });
  });

  socket.on(ACTIONS.RELAY_ICE, ({peerID, iceCandidate}) => {
    io.to(peerID).emit(ACTIONS.ICE_CANDIDATE, {
      peerID: socket.id,
      iceCandidate,
    });
  });

});

// const publicPath = path.join(__dirname, 'build');

// app.use(express.static(publicPath));


server.listen(process.env.PORT, () => {
  console.log('Server Started!, port',PORT)
  mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })

})

const database = mongoose.connection
database.on('error', (err) => {
  console.log({err})
})

database.once('open', () => {
  console.log(`Mongo server start on port:: ${process.env.PORT}`)
})
