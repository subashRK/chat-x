const http = require("http")
const socketIo = require("socket.io")

const server = http.createServer()
const io = socketIo(server, {
  cors: { origin: "localhost:5500" },
})

io.use((socket, next) => {
  socket.username = socket.handshake.auth?.username || "Unknown user"
  next()
})

let usersToConnect = []
let connectedUsers = []

io.on("connection", socket => {
  socket.emit("id", socket.id)

  if (usersToConnect.length !== 0) {
    const userToConnect = usersToConnect[0]
    socket.emit("userid", userToConnect)
    socket.to(userToConnect.id).emit("remote-user-username", socket.username)
    socket.emit("remote-user-username", userToConnect.username)
    connectedUsers.push([
      { id: socket.id, username: socket.username },
      userToConnect,
    ])
    usersToConnect.shift()
  } else usersToConnect.push({ id: socket.id, username: socket.username })

  socket.on("disconnect", () => {
    if (usersToConnect.find(user => user.id === socket.id) != null) {
      usersToConnect = usersToConnect.filter(user => user?.id !== socket?.id)
      return
    }

    userOnline = connectedUsers.find(
      user => user.find(user1 => user1.id === socket.id) != null
    )
    userOnline.forEach(user => {
      if (user.id === socket.id) return
      socket.to(user.id).emit("close-call")
      usersToConnect.push(user)
    })
  })
})

server.listen(5000)
