const express = require('express');
const socketio = require('socket.io');
const http = require('http');

const { addUser, getUser, getUsersInRoom, removeUser } = require('./users.js');

const PORT = process.env.PORT || 5001;

const router = require('./router');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  socket.on('login', ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    if (error) return callback(error);

    socket.join(user.room);

    socket.emit('message', {
      user: 'Admin',
      text: 'Вы вошли в чат',
    });
    socket.broadcast.to(user.room).emit('message', {
      text: `${user.name} присоеденился`,
    });
    io.to(user.room).emit('roomData', {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);

    io.to(user.room).emit('message', { user: user.name, text: message });

    callback();
  });

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit('message', {
        user: 'Admin',
        text: `${user.name} покинул чат.`,
      });
      io.to(user.room).emit('roomData', {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

app.use(router);

server.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
