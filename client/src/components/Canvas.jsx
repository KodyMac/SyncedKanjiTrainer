import { useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';

export default function Canvas({ roomId, userColor }) {
    const { socket } = useSocket();
    const canvasRef = useRef(null);
    const isDrawing = useRef(false);
    const lastPos = useRef({ x: 0, y:0 });
    const [brushSize, setBrushSize] = useState(4);
    const [brushStyle, setBrushStyle] = useState('round');

    //draw line on canvas
    const drawSegment = useCallback((ctx, x0, y0, x1,y1,color,lineWidth, style) => {
        if(!ctx) return;
        ctx.beginPath();
        ctx.moveTo(x0,y0);
        ctx.lineTo(x1,y1);
        ctx.strokeStyle = color;
        ctx.lineWidth = style === 'calligraphy' ? lineWidth * 2 : lineWidth;
        ctx.lineCap = style === 'square' ? 'square' : 'round';;
        ctx.lineJoin = style === 'square' ? 'square' : 'round';
        if (style === 'calligraphy') {
            const angle = Math.atan2(y1 - y0, x1-x0);
            ctx.lineWidth = lineWidth + Math.abs(Math.sin(angle)) * lineWidth * 2;
        }
        ctx.stroke();
    }, []);

    //get mouse position relative to canvas
    const getPos = useCallback((e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        //handle both mouse and touch events
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }, []);

    //listen for draw events from other users (server)
    useEffect(() => {
        if(!socket) return;
        socket.on('draw', ({ x0,y0,x1,y1,color,lineWidth }) => {
            const ctx = canvasRef.current.getContext('2d');
            drawSegment(ctx, x0,y0,x1,y1,color,lineWidth);
        });

        socket.on('clear_canvas', () => {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0,0,600,500);
        });

        socket.on('replay_strokes', (strokes) => {
            const ctx = canvasRef.current.getContext('2d');
            strokes.forEach(({ x0, y0,x1,y1,color,lineWidth }) => {
                drawSegment(ctx,x0,y0,x1,y1,color,lineWidth);
            });
        });

        return () => {
            socket.off('draw');
            socket.off('clear_canvas');
        };
    }, [socket, drawSegment]);

    //mouse event handler (for client drawing, not server)
    const startDrawing = useCallback((e) => {
        isDrawing.current = true;
        lastPos.current = getPos(e);
    }, [getPos]);

    const draw = useCallback((e) => {
        if (!isDrawing.current) return;
        if(!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const currentPos = getPos(e);
        const{ x:x0,y:y0 } = lastPos.current;
        const {x:x1,y:y1} = currentPos;
        const color = userColor;
        const lineWidth = brushSize;
        

        //local drawing
        drawSegment(ctx, x0,y0,x1,y1,color,lineWidth);
        //send to server
        socket.emit('draw', {roomId, x0,y0,x1,y1,color,lineWidth: brushSize, style: brushStyle});
        lastPos.current = currentPos;
    }, [getPos, drawSegment, socket, roomId]);

    const stopDrawing = useCallback(() => {
        if(!isDrawing.current) return;
        isDrawing.current = false;
        socket.emit('stroke_end', { roomId });
    }, [socket, roomId]);

    return (
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16}}>
            
            {/* Brush controls */}
<div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
  
  {/* Color swatch showing your assigned color */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <div style={{ width: 24, height: 24, borderRadius: '50%', background: userColor, border: '2px solid #e5e7eb' }} />
    <span style={{ fontSize: 13, color: '#666' }}>Your color</span>
  </div>

  {/* Brush size */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <span style={{ fontSize: 13, color: '#666' }}>Size</span>
    {[2, 4, 8, 14].map(size => (
      <button key={size} onClick={() => setBrushSize(size)} style={{
        width: size + 16, height: size + 16,
        borderRadius: '50%', border: brushSize === size ? '2px solid #3b82f6' : '1px solid #e5e7eb',
        background: brushSize === size ? '#eff6ff' : 'white',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ width: size, height: size, borderRadius: '50%', background: userColor }} />
      </button>
    ))}
  </div>

  {/* Brush style */}
              <div style={{ display: 'flex', gap: 6 }}>
                {['round', 'square', 'calligraphy'].map(style => (
                  <button key={style} onClick={() => setBrushStyle(style)} style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 12,
                    border: brushStyle === style ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    background: brushStyle === style ? '#eff6ff' : 'white',
                    cursor: 'pointer', color: '#444', textTransform: 'capitalize'
                  }}>
                    {style}
                  </button>
                ))}
              </div>
            </div>
            <canvas
                ref={canvasRef}
                width={600}
                height={500}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing} //if mouse leaves canvas
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                style={{
                    border: '2px solid #e5e7eb',
                    borderRadius: 12,
                    cursor: 'crosshair',
                    background: 'white',
                    touchAction: 'none' //prevent page from scrolling on mobile
                }}
                />
                <button
                    onClick={() => {
                        const ctx = canvasRef.current.getContext('2d');
                        ctx.clearRect(0,0,600,500);
                        socket.emit('clear_canvas', {roomId});
                    }}
                    style = {{
                        padding: '8px 20px', borderRadius: 8, border: '1px solid #e5e7eb',
                        background: 'white', cursor: 'pointer', fontSize: 14, color: '#666'
                    }}
                    >
                        Clear Canvas
                    </button>
        </div>
    );
    }
