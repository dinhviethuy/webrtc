import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const port = 8080;

const users = [];

io.on("connection", (socket) => {
  console.log("Connected id: ", socket.id);
  socket.on("join-user", (username) => {
    console.log("User joined: ", username);
    users.push({ id: socket.id, username });
    io.emit("joined", users);
  });
  socket.on("offer", ({ from, to, offer }) => {
    const toUser = users.find((user) => user.username === to);
    if (toUser) {
      console.log("Offer to: ", toUser.username);
      io.to(toUser.id).emit("offer", { from, to, offer });
    }
  });
  socket.on("answer", ({ from, to, answer }) => {
    const fromUser = users.find((user) => user.username === from);
    if (fromUser) {
      io.to(fromUser.id).emit("answer", { from, to, answer });
    }
  });

  socket.on("icecandidate", (candidate) => {
    // console.log({ candidate });
    socket.broadcast.emit("icecandidate", candidate);
  });
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
