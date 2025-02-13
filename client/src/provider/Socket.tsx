import { createContext, useContext, useMemo } from "react"
import { io, Socket } from "socket.io-client"

interface SocketContextType {
  socket: Socket;
  // callAccepted: boolean;
  // callEnded: boolean;
  // call: boolean | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: io('http://localhost:8080'),
  // callAccepted: false,
  // callEnded: false,
  // call: null,
})

export const useSocket = () => {
  return useContext(SocketContext)
}

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const socket: Socket = useMemo(() => io('http://localhost:8080'), [])

  // const [callAccepted, setCallAccepted] = useState<boolean>(false)
  // const [callEnded, setCallEnded] = useState<boolean>(false)
  // const [call, setCall] = useState<null | boolean>(null)
  return (
    <>
      <SocketContext.Provider value={{ socket }}>
        {children}
      </SocketContext.Provider>
    </>
  )
}