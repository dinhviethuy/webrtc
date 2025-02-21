import { createContext, Dispatch, useCallback, useContext, useEffect, useState } from "react"
import { useSocket } from "./Socket";

interface PeerContextType {
  peer: RTCPeerConnection,
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localScreen: MediaStream | null;
  remoteScreen: MediaStream | null;
  setLocalStream: (stream: MediaStream | null) => void;
  setLocalScreen: (stream: MediaStream | null) => void;
  setRemoteScreen: (stream: MediaStream | null) => void;
  callEnded: boolean;
  setCallEnded: (value: boolean) => void;
  caller: ICaller;
  dataChannel: null | RTCDataChannel
  setChat: Dispatch<React.SetStateAction<{
    sender: string;
    text: string;
  }[]>>,
  chat: {
    sender: string;
    text: string;
  }[],
  setDataChanel: Dispatch<React.SetStateAction<RTCDataChannel | null>>,
  setCaller: Dispatch<React.SetStateAction<ICaller>>
}

interface ICaller {
  from: string,
  to: string,
}

interface IProps {
  from: string;
  to: string;
  offer: RTCSessionDescriptionInit;
}

interface IPropsScreen {
  from: string;
  to: string;
}

interface IPropsAnswer {
  from: string;
  to: string;
  answer: RTCSessionDescriptionInit;
}

const PeerContext = createContext<PeerContextType>({
  peer: new RTCPeerConnection(),
  localStream: null,
  remoteStream: null,
  localScreen: null,
  remoteScreen: null,
  setLocalStream: () => { },
  setLocalScreen: () => { },
  setRemoteScreen: () => { },
  callEnded: false,
  setCallEnded: () => { },
  caller: {
    from: '',
    to: ''
  },
  dataChannel: null,
  setChat: () => { },
  chat: [],
  setDataChanel: () => { },
  setCaller: () => { }
})

export const usePeer = () => {
  return useContext(PeerContext)
}

const createPeer = () => {
  return new RTCPeerConnection({
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302',
      }
    ]
  })
}

export const PeerProvider = ({ children }: { children: React.ReactNode }) => {
  const { socket } = useSocket()
  const [peer, setPeer] = useState<RTCPeerConnection>(createPeer)
  const [localStream, setLocalStream] = useState<null | MediaStream>(null)
  const [localScreen, setLocalScreen] = useState<null | MediaStream>(null)
  const [remoteStream, setRemoteStream] = useState<null | MediaStream>(null)
  const [remoteScreen, setRemoteScreen] = useState<null | MediaStream>(null)
  const [callEnded, setCallEnded] = useState<boolean>(false)
  const [chat, setChat] = useState<{ sender: string, text: string }[]>([])
  const [caller, setCaller] = useState<ICaller>({
    from: '',
    to: ''
  })
  const [dataChannel, setDataChanel] = useState<RTCDataChannel | null>(null)
  const handleOffer = useCallback(async ({ from, to, offer }: IProps) => {
    await peer.setRemoteDescription(offer)
    const answer = await peer.createAnswer()
    await peer.setLocalDescription(answer)
    socket.emit('answer', { from, to, answer: peer.localDescription })
  }, [peer, socket])

  const createAnswer = useCallback(async (data: IPropsAnswer) => {
    console.log({ data })
    const { answer, from, to } = data
    await peer.setRemoteDescription(answer)
    socket.emit('end-call', { from, to })
    setCaller({ to, from })
    setCallEnded(true)
  }, [peer, socket])

  const createIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    console.log({ candidate })
    if (peer.remoteDescription) {
      try {
        await peer.addIceCandidate(candidate)
      } catch (error) {
        console.log(error)
      }
    }
  }, [peer])

  const handleEndCall = useCallback((data: { from: string, to: string }) => {
    console.log({ data })
    setCallEnded(true)
    setCaller({ from: data.to, to: data.from })
  }, [setCallEnded, setCaller,])

  const handleCallEnded = useCallback((data: { from: string, to: string }) => {
    console.log({ data })
    setCallEnded(false)
    setCaller({ from: '', to: '' })
    setRemoteStream(null)
    setChat([])
    peer.close()
    setDataChanel(null)
    setPeer(createPeer)
  }, [setCallEnded, setCaller, setRemoteStream, peer, setChat, setDataChanel])

  const handleCamera = useCallback(() => {
    localStream?.getVideoTracks().forEach(track => {
      track.enabled = !track.enabled
    })
  }, [localStream])

  const handleAudio = useCallback(() => {
    console.log('audio')
    localStream?.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled
    })
  }, [localStream])

  const handleScreenShare = useCallback(async (data: IPropsScreen) => {
    const offer = await peer.createOffer()
    await peer.setLocalDescription(offer)
    socket.emit('offer', { from: data.from, to: data.to, offer: peer.localDescription })
  }, [peer, socket])

  useEffect(() => {
    if (localStream && localStream.getTracks().length > 0) {
      localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream)
      })
    }
  }, [localStream, peer])

  useEffect(() => {
    peer.ontrack = (e) => {
      console.log({ e: e.streams })
      setRemoteStream(e.streams[0])
    }

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('icecandidate', e.candidate)
      }
    }
  }, [peer, socket])

  useEffect(() => {
    peer.ondatachannel = (e) => {
      console.log({ e })
      const channel = e.channel;
      setDataChanel(channel);
      channel.onmessage = (e) => {
        setChat((prev) => [...prev, { sender: caller.to, text: e.data }]);
      };
      channel.onopen = () => console.log("DataChannel đã mở");
      channel.onclose = () => {
        console.log("DataChannel đã đóng");
        setDataChanel(null);
      };
    };
  }, [peer, setDataChanel, setChat, caller])

  useEffect(() => {
    socket.on('offer', handleOffer)
    socket.on('answer', createAnswer)
    socket.on('icecandidate', createIceCandidate)
    socket.on('end-call', handleEndCall)
    socket.on('call-ended', handleCallEnded)
    socket.on('camera', handleCamera)
    socket.on('audio', handleAudio)
    socket.on('start-share-screen', handleScreenShare)
    return () => {
      socket.off('offer', handleOffer)
      socket.off('answer', createAnswer)
      socket.off('icecandidate', createIceCandidate)
      socket.off('end-call', handleEndCall)
      socket.off('call-ended', handleCallEnded)
    }
  }, [socket, peer, handleOffer, createAnswer, createIceCandidate, handleEndCall, handleCallEnded, handleCamera, handleAudio, handleScreenShare])

  return (
    <>
      <PeerContext.Provider value={{ peer, localStream, remoteStream, setLocalStream, callEnded, setCallEnded, caller, localScreen, remoteScreen, setLocalScreen, setRemoteScreen, dataChannel, setChat, chat, setDataChanel, setCaller }}>
        {children}
      </PeerContext.Provider>
    </>
  )
}