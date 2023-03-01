const application = require("express")();
const server = require("http").createServer(application);
const io = require("socket.io")(server);
const PORT = process.env.PORT || 3000;

let clients = [];

application.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

server.listen(PORT, () => {
  console.log("Servidor ejecutando en puerto: " + PORT);
});

// Socket actions
io.on("connection", (socket) => {
  let hasName = false;
  let existingName = false;
  let connectedUsers;

  // When the client disconnect
  socket.on("disconnect", () => {
    let index;
    clients.forEach((client) => {
      if (client.socket == socket) {
        index = clients.indexOf(client);
        clients.splice(index, 1);
      }
    });
    if (hasName) {
      console.log("Usuario desconectado - Usuario: " + socket.username);
      io.emit("send message", {
        message: socket.username,
        user: "Usuario desconectado",
      });
    }
  });

  // When the client send a message
  socket.on("new message", (data) => {
    io.emit("send message", { message: data, user: socket.username });
  });

  socket.on("new image", (data) => {
    io.emit("send new image", { image: data, user: socket.username });
  });

  // Chat 1-1
  socket.on("new private message", (data) => {
    let clientRecipient;
    clients.forEach((client) => {
      clientRecipient = client.usr == data.userReceiver ? client : false;
    });
    if (clientRecipient) {
      io.to(clientRecipient.socket.id).emit("private message", {
        user: clientRecipient.usr,
        message: data.message,
      });
    } else {
      console.log("Cliente no encontrado");
    }
  });

  // When enter a new user
  socket.on("new user", (usr) => {
    if (!hasName) {
      socket.username = usr;
      clients.forEach((client) => {
        if (client.usr.toLowerCase() === socket.username.toLowerCase()) {
          existingName = true;
        }
      });
      if (!existingName) {
        clients.push({ usr, socket });
        console.log("Usuario conectado - Usuario: " + socket.username);
        hasName = true;
      } else {
        console.log("Ya existe este nombre de usuario");
        io.to(socket.id).emit("disconnect user", { refresh: true });
        socket.disconnect();
      }
    }
  });

  // Envía constantemente la lista
  setInterval(() => {
    connectedUsers = clients.map((user) => {
      return user.usr;
    });
    io.emit("user list", connectedUsers);
  }, 2500);
});
