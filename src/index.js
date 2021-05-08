const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocation } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

io.on('connection', (socket) => {
    console.log('New websocket connection')

    socket.on('join', ({ username, room }, callBack) => {
        const {error, user} = addUser( {id: socket.id, username, room})
        
        if(error) {
            return callBack(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin','Welcome new Client'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin',`${user.username} has joined`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callBack()
    })

    socket.on('sendMessage', (message, callBack) => {
        const filter = new Filter()
        const user = getUser(socket.id)

        if (filter.isProfane(message)) {
            return callBack('Profanity is not allowed')
        }

        io.to(user.room).emit('message', generateMessage(user.username, message))
        //callBack('Delivered')
        callBack()
    })

    socket.on('sendLocation', ({ latitude, longitude }, callBack) => {
        //io.emit('message', `location: ${latitude}, ${longitude}`)
        const user = getUser(socket.id)

        io.to(user.room).emit('LocationMessage', generateLocation(user.username, `https://google.com/maps?q=${latitude},${longitude}`))
        callBack()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if(user) {
            io.to(user.room).emit('message', generateMessage('Admin',`${user.username} has left`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
})
})

// let count = 0
// io.on('connection', (socket) => {
//     console.log('New websocket connection')

//     socket.emit('countUpdated', count)

//     socket.on('increment', () => {
//         count++
//         io.emit('countUpdated', count)
//     })
// })

server.listen(port, () => {
    console.log(`Server is up on ${port}`);
})