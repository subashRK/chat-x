const USERNAME_KEY = "username"
let username = JSON.parse(localStorage.getItem(USERNAME_KEY))
let remoteUsername
let socket
let myMediaStream

while (username == null || username.trim() === "") {
  username = prompt("Enter a name:")
  localStorage.setItem(USERNAME_KEY, JSON.stringify(username))
}

const videosContainer = document.querySelector(".videos")
const userVideoEl = document.querySelector("[data-user] > video")
const usernameEl = document.querySelector("[data-user] > span")

usernameEl.innerText = username

function getmyMediaStream() {
  return window.navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
  })
}

async function initializeVideo() {
  try {
    myMediaStream = await getmyMediaStream()
    userVideoEl.srcObject = myMediaStream
    userVideoEl.onloadedmetadata = () => {
      userVideoEl.play()
    }
  } catch (e) {
    alert(e.message)
  }
}

function addRemoteVideo(stream) {
  const oldRemoteVideoEl = document.querySelector("[data-remote-user] > video")
  if (
    oldRemoteVideoEl != null &&
    oldRemoteVideoEl.dataset?.["remoteUserId"] === stream.id
  )
    return
  // The above two lines are added because for some reason the stream is recieved twice
  const remoteVideoElContainer = document.createElement("div")
  const remoteVideoEl = document.createElement("video")
  const remoteUsernameEl = document.createElement("span")
  remoteUsernameEl.innerText = remoteUsername
  remoteVideoElContainer.classList.add("video")
  remoteVideoElContainer.setAttribute("data-remote-user", true)
  remoteVideoEl.setAttribute("data-remote-user-id", stream.id)
  remoteVideoElContainer.append(remoteVideoEl)
  remoteVideoElContainer.append(remoteUsernameEl)
  videosContainer.append(remoteVideoElContainer)
  remoteVideoEl.srcObject = stream
  remoteVideoEl.onloadedmetadata = () => {
    remoteVideoEl.play()
  }
}

function removeRemoteVideo() {
  const remoteVideoElContainer = document.querySelector("[data-remote-user]")
  remoteUsername = null
  remoteVideoElContainer?.remove()
}

function onStream(call) {
  call.on("stream", stream => {
    addRemoteVideo(stream)
  })
}

function closeCallListener(call, socket) {
  call.on("close", removeRemoteVideo)
  call.on("error", removeRemoteVideo)
  socket.on("close-call", () => {
    call.close()
    removeRemoteVideo()
  })
}

function establishSocketConnection() {
  socket = io("http://localhost:5000", {
    transports: ["websocket"],
    auth: { username },
  })
}

function listenToSocketEvents() {
  socket.on("id", id => {
    // Before initializing peer do the following:
    // 1. Run the command npm i -g peer
    // 2. Run the command peerjs --port <port> (in my case it is 8000), so i have to enter the command peerjs --port 8000
    // (OR) Run the bat file
    const peer = new Peer(id, {
      host: "/",
      port: 8000, // Use the port number used in the terminal, i.e. peerjs --port <port>
    })

    socket.on("remote-user-username", username => (remoteUsername = username))

    peer.on("call", call => {
      call.answer(myMediaStream)
      onStream(call)
      closeCallListener(call, socket)
    })

    socket.on("userid", user => {
      const call = peer.call(user.id, myMediaStream)
      onStream(call)
      closeCallListener(call, socket)
    })
  })
}

async function setUp() {
  await initializeVideo()
  establishSocketConnection()
  listenToSocketEvents()
}

setUp()
