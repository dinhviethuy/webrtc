import './App.css'
import io from 'socket.io-client'
import { AllRoute } from './components/AllRoute'

function App() {
  const socket = io('http://localhost:8080')
  socket.on('connect', () => {
    console.log('Connected to server')
  })
  return (
    <>
      <AllRoute />
    </>
  )
}

export default App
