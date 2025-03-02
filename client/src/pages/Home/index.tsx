import { useCallback, useEffect, useRef, useState } from "react";
import ReactPlayer from "react-player";
import { useSocket } from "../../provider/Socket";
import phone from '../../assets/phone.png'
import endCall from '../../assets/phone-disconnect.png'
import { usePeer } from "../../provider/Peer";
import { AiFillAudio, AiOutlineAudioMuted, AiOutlineUser } from "react-icons/ai";
import { FaCamera } from "react-icons/fa";
import { RiCameraOffFill } from "react-icons/ri";
import { MdScreenShare } from "react-icons/md";
import { BsChatSquareText } from "react-icons/bs";
interface IProps {
  id: string,
  username: string,
}


function HomePage() {
  const [hidden, setHidden] = useState<boolean>(false);
  const [isCamera, setIsCamera] = useState<boolean>(true);
  const [isAudio, setIsAudio] = useState<boolean>(true);
  const [name, setName] = useState<string>('');
  const [users, setUsers] = useState<IProps[]>([]);
  const { socket } = useSocket()
  const { localStream, setLocalStream, peer, remoteStream, callEnded, caller, localScreen, remoteScreen, setLocalScreen, setRemoteScreen, dataChannel, setChat, chat, setDataChanel, setCaller, setShowNotification, showNotification, busy } = usePeer()
  const ref = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string>("")
  const [showChat, setShowChat] = useState<boolean>(true)
  const [notification, setNotification] = useState<boolean>(false)
  const handleSubmit = () => {
    if (ref.current) {
      const name = ref.current.value;
      setName(name)
      socket.emit('join-user', name)
      setHidden(true);
    }
  }
  const joined = useCallback((data: IProps[]) => {
    setUsers(data)
  }, [setUsers])
  const setupDataChannel = useCallback((channel: RTCDataChannel, user: string) => {
    channel.onopen = () => console.log("DataChannel đã mở!");
    channel.onmessage = (event) => {
      setChat((prev: { sender: string; text: string; }[]) => [...prev, { sender: user, text: event.data }])
    }
    channel.onclose = () => console.log("DataChannel đã đóng!");
  }, [setChat])

  const handleSetupCall = useCallback(async (user: string) => {
    setShowNotification(true)
    setCaller({ from: name, to: user })
    socket.emit('call', { from: name, to: user })
  }, [socket, name, setShowNotification, setCaller])

  const handleCall = useCallback(async ({ from, to }: { from: string, to: string }) => {
    setCaller({ from, to })
    const dataChannel = peer.createDataChannel('chat')
    setDataChanel(dataChannel)
    setupDataChannel(dataChannel, to)
    const offer = await peer.createOffer()
    await peer.setLocalDescription(offer)
    socket.emit('offer', { from, to, offer })
  }, [peer, socket, setCaller, setDataChanel, setupDataChannel])
  useEffect(() => {
    socket.on('joined', joined)
    return () => {
      socket.off('joined', joined)
    }
  }, [socket, joined])

  const handleEndCall = useCallback(() => {
    socket.emit('call-ended', { from: caller.from, to: caller.to })
  }, [socket, caller])

  const handleScreenShare = useCallback(async () => {
    const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
    setLocalScreen(screen)
    screen.getTracks().forEach(track => peer.addTrack(track, screen))
    peer.ontrack = (e) => {
      setRemoteScreen(e.streams[0])
    }
    socket.emit('start-share-screen', ({ from: caller.from, to: caller.to }))
  }, [peer, socket, caller, setLocalScreen, setRemoteScreen])

  const cam = useCallback(() => {
    setIsCamera(!isCamera)
    socket.emit('camera', { from: caller.from, to: caller.to })
  }, [socket, caller, isCamera]);

  const audio = useCallback(() => {
    setIsAudio(!isAudio)
    socket.emit('audio', { from: caller.from, to: caller.to })
  }, [socket, caller, isAudio]);

  const sendMessage = useCallback(async () => {
    if (dataChannel && message) {
      dataChannel.send(message)
      setMessage('')
      console.log({ caller })
      setChat((prev: { sender: string; text: string; }[]) => [...prev, { sender: caller.from, text: message }])
    }
  }, [dataChannel, message, setChat, caller, setMessage])

  const handleNotification = useCallback(({ from, to }: { from: string, to: string }) => {
    console.log({ from, to })
    setNotification(true)
    setCaller({ from: to, to: from })
  }, [setNotification, setCaller])

  const handleAcceptCall = useCallback(async () => {
    setNotification(false)
    socket.emit('accept-call', { from: caller.from, to: caller.to })
  }, [socket, caller])

  const handleRejectCall = useCallback(async () => {
    setNotification(false)
    socket.emit('reject-call', { from: caller.to, to: caller.from })
  }, [socket, caller])

  const handleRejectCallFrom = useCallback(() => {
    console.log('reject-call')
    setShowNotification(false)
  }, [setShowNotification])

  const handleCancelCallSuccess = useCallback(() => {
    console.log('cancel-call')
    setCaller({ from: '', to: '' })
    setNotification(false)
  }, [setCaller])

  const handleCancelCall = useCallback(() => {
    setShowNotification(false)
    console.log({ caller })
    socket.emit('cancel-call', { from: caller.from, to: caller.to })
    setCaller({ from: '', to: '' })
  }, [socket, caller, setShowNotification, setCaller])

  useEffect(() => {
    const startMyVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        setLocalStream(stream)
      } catch (error) {
        console.log(error)
      }
    }
    startMyVideo()
  }, [setLocalStream])
  const lastMessageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat]);

  useEffect(() => {
    socket.on('call', handleNotification)
    return () => {
      socket.off('call', handleNotification)
    }
  }, [socket, handleNotification])

  useEffect(() => {
    socket.on('reject-call', handleRejectCallFrom)
    return () => {
      socket.off('reject-call', handleRejectCallFrom)
    }
  }, [socket, handleRejectCallFrom])

  useEffect(() => {
    socket.on('accept-call', handleCall)
    socket.on('cancel-call', handleCancelCallSuccess)
    return () => {
      socket.off('accept-call', handleCall)
      socket.off('cancel-call', handleCancelCallSuccess)
    }
  }, [socket, handleCall, handleCancelCallSuccess])

  return (
    <>
      <div className="w-screen dark:bg-gray-800 col-span-12 gap-4 h-screen flex">
        <div className="w-[300px] bg-gray-5 font-bold0 dark:bg-gray-800 p-4 shadow-2xl">
          <div className="mb-2">
            <h2 className="text-white text-2xl font-bold text-center">Contacts</h2>
          </div>
          <ul className="flex flex-col gap-2">
            {users.map((user, index) => (
              <div key={index}>
                <li className="bg-violet-400 px-2 py-1 rounded-lg text-center font-bold h-12 flex justify-center items-center relative">
                  <span>
                    {user.username === name ? `${name} (You)` : `${user.username} (Khách)`}
                  </span>
                  {user.username !== name ? <img src={phone} onClick={() => {
                    if (!busy.includes(user.username)) {
                      if (endCall) {
                        alert("Bạn đang trong cuộc gọi")
                      } else {
                        handleSetupCall(user.username)
                      }
                    } else {
                      alert('Người dùng đang bận')
                    }
                  }} alt="phone" className="cursor-pointer w-8 h-8 absolute right-2 bottom-2 bg-amber-50 rounded-full p-1" /> : ''}
                </li>
              </div>
            ))}
          </ul>
        </div>
        <div className="flex-1 h-screen flex justify-center items-center flex-col gap-4">
          <div className={`flex justify-center gap-4 items-center ` + (hidden ? 'hidden' : '')}>
            <input ref={ref} type="text" id="name" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-[350px] p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Enter your name" required />
            <button onClick={handleSubmit} type="button" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800 cursor-pointer">Join Server</button>
          </div>
          <div className="flex gap-4">
            {
              localStream !== null &&
              <div className="relative">
                <ReactPlayer url={localStream} playing width={400} />
                <span className="absolute left-3 top-10 bg-gray-400 px-2 py-1 font-bold text-sm rounded-lg">{caller.from || name || "You"}</span>
              </div>
            }
            {
              remoteStream !== null &&
              <div className="relative">
                <ReactPlayer url={remoteStream} playing width={400} />
                <span className="absolute left-3 top-10 bg-gray-400 px-2 py-1 font-bold text-sm rounded-lg">{caller.to || ''}</span>
              </div>
            }
          </div>
          <div className="flex gap-4">
            {
              localScreen !== null &&
              <div className="relative">
                <ReactPlayer url={localScreen} playing width={400} />
                <span className="absolute left-22 top-2 bg-white px-2 py-1 font-bold text-sm rounded-lg">{caller.from || ''}</span>
              </div>
            }
            {
              remoteScreen !== null &&
              <div className="relative">
                <ReactPlayer url={remoteScreen} playing width={400} />
                <span className="absolute left-22 top-2 bg-white px-2 py-1 font-bold text-sm rounded-lg">{caller.to || ''}</span>
              </div>
            }
          </div>
          <div className="flex gap-2 justify-center items-center">
            {
              callEnded &&
              <div className="flex gap-2">
                <button onClick={handleScreenShare} className="bg-red-500 text-white p-2 rounded-full font-bold cursor-pointer">
                  <MdScreenShare size={30} />
                </button>
                <button onClick={cam} className="bg-red-500 text-white p-2 rounded-full font-bold cursor-pointer">
                  {isCamera ? <FaCamera size={30} /> : <RiCameraOffFill size={30} />}
                </button>
                <button className="bg-red-500 text-white p-2 rounded-full font-bold cursor-pointer" onClick={() => {
                  setShowChat(!showChat)
                }}>
                  <BsChatSquareText size={30} />
                </button>
                <button onClick={audio} className="bg-red-500 text-white p-2 rounded-full font-bold cursor-pointer">
                  {isAudio ? <AiFillAudio size={30} /> : <AiOutlineAudioMuted size={30} />}
                </button>
              </div>
            }
            {callEnded && <img onClick={handleEndCall} src={endCall} alt="end-call" className="bg-white p-2 rounded-full cursor-pointer" />}
          </div>
        </div>
        {
          callEnded && showChat &&
          <div
            className="w-[400px] h-full bg-white relative rounded-2xl flex flex-col"
          >
            <div className="border p-2 bg-gray-100 w-full flex-1 overflow-y-auto mb-2">
              {chat.map((msg, index) => (
                msg.sender === name ? (
                  <div key={index} className="flex flex-col w-full" ref={index === chat.length - 1 ? lastMessageRef : null}>
                    <div className="max-w-1/2 flex flex-col self-end">
                      <strong className="self-end text-sm">{msg.sender}</strong>
                      <span className="bg-blue-400 text-black px-2 py-2 rounded-lg max-w-full self-end break-words">{msg.text}</span>
                    </div>
                  </div>
                ) : (
                  <div key={index} className="flex flex-col w-full" ref={index === chat.length - 1 ? lastMessageRef : null}>
                    <div className="max-w-1/2 flex flex-col">
                      <strong className="text-sm self-start">{msg.sender}</strong>
                      <span className="bg-gray-400 text-black px-2 py-2 rounded-lg max-w-full self-start break-words">{msg.text}</span>
                    </div>
                  </div>
                )
              ))}
            </div>
            <div className="h-[58px]">
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }} id="chat" className="absolute bottom-0 bg-gray-50 border border-gray-300 text-gray-900 text-sm focus:ring-blue-500 focus:border-blue-500 block w-[350px] py-3 px-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 resize-none break-words" rows={2} required />
              <button onClick={sendMessage} className="w-[50px] absolute bottom-0 right-0 bg-blue-500 h-[66px] text-white cursor-pointer">Gửi</button>
            </div>
          </div>
        }
      </div >
      {showNotification &&
        <div className="fixed top-0 left-0 w-full h-full bg-gray-700 opacity-95 flex justify-center items-center z-auto">
          <div className="bg-white p-4 w-[500px] h-[320px] rounded-lg flex flex-col items-center justify-between">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-gray-400 p-6 rounded-full">
                <AiOutlineUser size={100} />
              </div>
              <span>Đang gọi cho <span className="font-bold text-xl">{caller.to}</span></span>
            </div>
            <div className="flex justify-evenly w-full">
              <div className="bg-gray-200 p-2 rounded-full cursor-pointer hover:bg-gray-300" onClick={handleCancelCall}>
                <img src={endCall} alt="" className="w-12 h-12 p-1" />
              </div>
            </div>
          </div>
        </div>
      }
      {notification &&
        <div className="fixed top-0 left-0 w-full h-full bg-gray-700 opacity-95 flex justify-center items-center z-auto">
          <div className="bg-white p-4 w-[500px] h-[320px] rounded-lg flex flex-col items-center justify-between">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-gray-400 p-6 rounded-full">
                <AiOutlineUser size={100} />
              </div>
              <span>Cuộc gọi đến từ <span className="font-bold text-xl">{caller.to}</span></span>
            </div>
            <div className="flex justify-evenly w-full">
              <div className="bg-gray-200 p-2 rounded-full cursor-pointer hover:bg-gray-300">
                <img src={phone} alt="" className="w-12 h-12 p-1" onClick={handleAcceptCall} />
              </div>
              <div className="bg-gray-200 p-2 rounded-full cursor-pointer hover:bg-gray-300" onClick={handleRejectCall}>
                <img src={endCall} alt="" className="w-12 h-12 p-1" />
              </div>
            </div>
          </div>
        </div>
      }
    </>
  );
}

export default HomePage;