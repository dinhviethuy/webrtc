import { createContext, use, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { io, Socket } from "socket.io-client";
// import { useSocket } from "./Socket";

interface PeerContextType {
  peer: RTCPeerConnection,
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  setLocalStream: (stream: MediaStream) => void;
}

const PeerContext = createContext<PeerContextType>({
  peer: new RTCPeerConnection(),
  localStream: null,
  remoteStream: null,
  setLocalStream: () => { }
})

export const usePeer = () => {
  return useContext(PeerContext)
}

export const PeerProvider = ({ children }: { children: React.ReactNode }) => {
  // const { socket } = useSocket()
  const socket: Socket = useMemo(() => io('http://localhost:8080'), [])
  const peer = useMemo(() => new RTCPeerConnection({
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302',
      }
    ]
  }), [])
  const [localStream, setLocalStream] = useState<null | MediaStream>(null)
  const [remoteStream, setRemoteStream] = useState<null | MediaStream>(null)
  useEffect(() => {
    if (localStream && localStream.getTracks().length > 0) {
      localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream)
      })
      peer.ontrack = (e) => {
        setRemoteStream(e.streams[0])
      }
      peer.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('icecandidate', e.candidate)
        }
      }
    }
  })


  const createOffer = useCallback(async ({ from, to, offer }: any) => {
    await peer.setRemoteDescription(offer)
    const answer = await peer.createAnswer()
    await peer.setLocalDescription(answer)
    console.log('check true')
    socket.emit('answer', { from, to, answer: peer.localDescription })
  }, [peer, socket])

  const createAnswer = useCallback(async (data: any) => {
    const { answer } = data
    await peer.setRemoteDescription(answer)
  }, [peer])

  const createIceCandidate = useCallback(async (candidate: any) => {
    console.log({ candidate })
    if (peer.remoteDescription) {
      try {
        await peer.addIceCandidate(candidate)
        console.log('ice candidate added')
      } catch (error) {
        console.log(error)
      }
    }
  }, [peer])

  useEffect(() => {
    socket.on('offer', createOffer)

    socket.on('answer', createAnswer)

    socket.on('icecandidate', createIceCandidate)

    return () => {
      socket.off('offer', createOffer)
      socket.off('answer', createAnswer)
      socket.off('icecandidate', createIceCandidate)
    }

  }, [socket, peer, createOffer, createAnswer, createIceCandidate])

  return (
    <>
      <PeerContext.Provider value={{ peer, localStream, remoteStream, setLocalStream }}>
        {children}
      </PeerContext.Provider>
    </>
  )
}