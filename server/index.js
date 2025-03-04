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

const busy = [];

const port = 8080;

const users = [];

io.on("connection", (socket) => {
  console.log("Connected id: ", socket.id);
  socket.on("join-user", (username) => {
    console.log("User joined: ", username);
    users.push({ id: socket.id, username });
    io.emit("joined", users);
    io.to(socket.id).emit("busy", busy);
  });
  socket.on("offer", ({ from, to, offer }) => {
    console.log("Offer from: ", from, " to: ", to);
    const toUser = users.find((user) => user.username === to);
    if (toUser) {
      console.log("Offer to: ", toUser.username);
      io.to(toUser.id).emit("offer", { from, to, offer });
    }
  });

  socket.on("call", ({ from, to }) => {
    console.log("Call from: ", from, " to: ", to);
    busy.push(from);
    busy.push(to);
    const toUser = users.find((user) => user.username === to);
    if (toUser) {
      io.to(toUser.id).emit("call", { from, to });
    }
    io.emit("busy", busy);
  });

  socket.on("cancel-call", ({ from, to }) => {
    console.log("Cancel call from: ", from, " to: ", to);
    const indexFromUser = busy.indexOf(from);
    const indexToUser = busy.indexOf(to);
    if (indexFromUser !== -1) {
      busy.splice(indexFromUser, 1);
    }
    if (indexToUser !== -1) {
      busy.splice(indexToUser, 1);
    }
    const toUser = users.find((user) => user.username === to);
    if (toUser) {
      io.to(toUser.id).emit("cancel-call", { from, to });
    }
    io.emit("busy", busy);
  });

  socket.on("reject-call", ({ from, to }) => {
    console.log("Reject call from: ", from, " to: ", to);
    const indexFromUser = busy.indexOf(from);
    const indexToUser = busy.indexOf(to);
    if (indexFromUser !== -1) {
      busy.splice(indexFromUser, 1);
    }
    if (indexToUser !== -1) {
      busy.splice(indexToUser, 1);
    }
    const fromUser = users.find((user) => user.username === from);
    if (fromUser) {
      io.to(fromUser.id).emit("reject-call", { from, to });
    }
    io.emit("busy", busy);
  });

  socket.on("accept-call", ({ from, to }) => {
    console.log("Accept call from: ", from, " to: ", to);
    const fromUser = users.find((user) => user.username === from);
    if (fromUser) {
      io.to(fromUser.id).emit("accept-call", { from, to });
    }
  });

  socket.on("answer", ({ from, to, answer }) => {
    console.log("Answer from: ", from, " to: ", to);
    const fromUser = users.find((user) => user.username === from);
    if (fromUser) {
      io.to(fromUser.id).emit("answer", { from, to, answer });
    }
  });

  socket.on("end-call", ({ from, to }) => {
    const toUser = users.find((user) => user.username === to);
    if (toUser) {
      io.to(toUser.id).emit("end-call", { from, to });
    }
  });
  socket.on("call-ended", ({ from, to }) => {
    const indexFromUser = busy.indexOf(from);
    const indexToUser = busy.indexOf(to);
    if (indexFromUser !== -1) {
      busy.splice(indexFromUser, 1);
    }
    if (indexToUser !== -1) {
      busy.splice(indexToUser, 1);
    }
    const fromUser = users.find((user) => user.username === from);
    const toUser = users.find((user) => user.username === to);
    console.log("Call ended: ", from, to);
    if (toUser) {
      io.to(toUser.id).emit("call-ended", { from, to });
    }
    if (fromUser) {
      io.to(fromUser.id).emit("call-ended", { from, to });
    }
    io.emit("busy", busy);
  });

  socket.on("camera", ({ from, to }) => {
    console.log("Camera ", from, to);
    const fromUser = users.find((user) => user.username === from);
    if (fromUser) {
      io.to(fromUser.id).emit("camera", { from, to });
    }
  });

  socket.on("audio", ({ from, to }) => {
    const fromUser = users.find((user) => user.username === from);
    if (fromUser) {
      io.to(fromUser.id).emit("audio", { from, to });
    }
  });

  socket.on("start-share-screen", ({ from, to }) => {
    const fromUser = users.find((user) => user.username === from);
    if (fromUser) {
      io.to(fromUser.id).emit("start-share-screen", { from, to });
    }
  });

  socket.on("icecandidate", (candidate) => {
    // console.log({ candidate });
    socket.broadcast.emit("icecandidate", candidate);
  });

  socket.on("offer-chat", ({ offer }) => {
    socket.broadcast.emit("offer-chat", offer);
  });

  socket.on("answer-chat", ({ answer }) => {
    socket.broadcast.emit("answer-chat", answer);
  });

  socket.on("change-whiteboard", ({ to }) => {
    console.log("Change whiteboard to: ", to);
    const index = users.findIndex((user) => user.username === to);
    if (index !== -1) {
      io.to(users[index].id).emit("change-whiteboard", { to });
    }
  });

  socket.on("start-whiteboard", ({ from }) => {
    console.log("Change whiteboard from: ", from);
    const index = users.findIndex((user) => user.username === from);
    if (index !== -1) {
      io.to(users[index].id).emit("start-whiteboard", { from });
    }
  });

  socket.on("disconnect", () => {
    console.log("Disconnected id: ", socket.id);
    const user = users.find((user) => user.id === socket.id);
    if (user) {
      users.splice(users.indexOf(user), 1);
      io.emit("joined", users);
      const index = busy.indexOf(user.username);
      if (index !== -1) {
        busy.splice(index, 1);
      }
      io.emit("busy", busy);
    }
  });
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
