import { useRef, useState, useEffect, useCallback, Dispatch, MouseEvent, SetStateAction } from "react";
import { Socket } from "socket.io-client";

interface IProps {
  dataChannel: RTCDataChannel | null;
  socket: Socket;
  setChat: Dispatch<SetStateAction<{
    sender: string;
    text: string;
  }[]>>;
}


const Whiteboard = (props: IProps) => {
  const { dataChannel, setChat, socket } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000");
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDraw, setIsDraw] = useState<boolean>(false);

  const drawOnCanvas = useCallback((x: number, y: number, prevX: number, prevY: number, drawColor: string) => {
    if (!ctx) return;
    ctx.strokeStyle = drawColor;
    ctx.lineCap = "round";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [ctx]);

  const clearCanvas = useCallback(() => {
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    dataChannel?.send(JSON.stringify({ type: "reset" }));
  }, [ctx, dataChannel]);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      setCtx(canvas.getContext("2d"));
    }

    if (dataChannel) {
      dataChannel.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "draw") {
          drawOnCanvas(data.x, data.y, data.prevX, data.prevY, data.color);
        } else if (data.type === "reset") {
          if (ctx && canvasRef.current) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        } else if (data.type === "message") {
          setChat((prev) => [...prev, { sender: data.sender, text: data.message }]);
        }
      };
    }
  }, [dataChannel, drawOnCanvas, clearCanvas, setChat, ctx]);

  const getMousePos = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!ctx) return;
    setIsDrawing(true);
    setPos(getMousePos(e));
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctx) return;
    const newPos = getMousePos(e);
    drawOnCanvas(newPos.x, newPos.y, pos.x, pos.y, color);
    if (dataChannel && dataChannel.readyState === "open") {
      dataChannel.send(
        JSON.stringify({ type: "draw", x: newPos.x, y: newPos.y, prevX: pos.x, prevY: pos.y, color })
      );
    }

    setPos(newPos);
  };

  const changeColor = (newColor: string) => {
    setColor(newColor);
  };

  useEffect(() => {
    socket.on("change-whiteboard", () => {
      setIsDraw(false);
      clearCanvas();
    })
    socket.on('start-whiteboard', () => {
      clearCanvas();
      setIsDraw(true);
    })
  }, [socket, clearCanvas]);

  return (
    <div className="w-[1100px] h-[400px] relative">
      <div className="flex flex-col gap-1 absolute top-[60px] left-2">
        {isDraw && (
          <>
            <button onClick={clearCanvas} className="h-11 w-20 border border-gray-800 hover:bg-gray-900 text-gray-900 hover:text-white rounded-lg text-sm px-5 py-2.5">
              Clear
            </button>
            <button onClick={() => changeColor("#007bff")} className="h-11 w-20 bg-blue-500 hover:bg-blue-700 text-white rounded-lg text-sm px-5 py-2.5">
              Blue
            </button>
            <button onClick={() => changeColor("#28a745")} className="h-11 w-20 bg-green-500 hover:bg-green-700 text-white rounded-lg text-sm px-5 py-2.5">
              Green
            </button>
            <button onClick={() => changeColor("#dc3545")} className="h-11 w-20 bg-red-500 hover:bg-red-700 text-white rounded-lg text-sm px-5 py-2.5">
              Red
            </button>
            <button onClick={() => changeColor("#e83e8c")} className="h-11 w-20 bg-pink-500 hover:bg-pink-700 text-white rounded-lg text-sm px-5 py-2.5">
              Pink
            </button>
            <input type="color" value={color} onChange={(e) => changeColor(e.target.value)} className="h-11 w-20 border border-gray-300 rounded-lg cursor-pointer" />
          </>
        )}
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-full bg-white border border-gray-300"
        onMouseDown={isDraw ? handleMouseDown : undefined}
        onMouseUp={isDraw ? handleMouseUp : undefined}
        onMouseMove={isDraw ? handleMouseMove : undefined}
      ></canvas>
    </div>
  );
};

export default Whiteboard;
