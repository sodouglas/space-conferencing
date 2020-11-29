const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidv4 } = require('uuid');
const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
    debug: true
}) 

app.set('view engine', 'ejs');  // embeds backend to frontend
app.use(express.static('public'));

app.use('/peerjs', peerServer);

app.get('/', (req, res) => {
    res.render('index');
})

app.get('/new-room/:name', (req, res) => {
    res.redirect(`/room/${uuidv4()}.${req.params.name}`);
})

app.get('/room/:room.:name', (req, res) => {
    res.render('room', { roomId: req.params.room, name: req.params.name});
})

app.get('/thank-you', (req, res) => {
    res.render('thank-you');
})

app.get('/room-full', (req, res) => {
    res.render('room-full');
})

io.on('connection', socket => {
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        socket.to(roomId).broadcast.emit('user-connected', userId);
    })

    socket.on('hand-event', (roomId, userId, handIsRaised) => {
        socket.join(roomId);
        socket.to(roomId).broadcast.emit('hand-event', userId, handIsRaised);
    });

    socket.on('leave-room', (roomId, userId) => {
        socket.join(roomId);
        socket.to(roomId).broadcast.emit('user-disconnected', userId);
    })

    socket.on('room-full', (roomId, userId) => {
        socket.join(roomId);
        socket.to(roomId).broadcast.emit('join-cancelled', userId);
    })
})

server.listen(process.env.PORT || 3030);