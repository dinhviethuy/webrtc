import { createContext, useContext, useMemo } from "react"
import { io, Socket } from "socket.io-client"

interface SocketContextType {
  socket: Socket;
}

const SocketContext = createContext<SocketContextType>({
  socket: io('http://localhost:8080'),
})

export const useSocket = () => {
  return useContext(SocketContext)
}

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const socket: Socket = useMemo(() => io('http://localhost:8080'), [])
  return (
    <>
      <SocketContext.Provider value={{ socket }}>
        {children}
      </SocketContext.Provider>
    </>
  )
}