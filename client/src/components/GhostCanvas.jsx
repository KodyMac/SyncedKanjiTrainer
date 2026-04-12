import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react';

const GhostCanvas = forwardRef(({ kanjiChar, currentStroke, onStrokesLoaded }, ref) => {
    const canvasRef = useRef(null);
    const strokePathsRef = useRef([]);
    const [totalStrokes, setTotalStrokes] = useState(0);

    const parseStrokes = useCallback((svgText) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const paths = Array.from(doc.querySelectorAll('path[d]'));
        return paths.map(p => p.getAttribute('d'));
    }, []);

    const drawPath = useCallback((ctx, pathStr, color, alpha, lineWidth) => {
        const path = new Path2D(pathStr);
        ctx.save();
        ctx.translate(50, 0);
        ctx.scale(500 / 109, 500 / 109);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke(path);
        ctx.restore();
    }, []);

    const animateStrokes = useCallback(() => {
        if (!canvasRef.current || strokePathsRef.current.length === 0) return;
        const ctx = canvasRef.current.getContext('2d');
        const paths = strokePathsRef.current;
        let i = 0;

        function drawNext() {
            ctx.clearRect(0, 0, 600, 500);

            for (let j = 0; j < i; j++) {
                drawPath(ctx, paths[j], '#94a3b8', 0.2, 3);
            }

            if (i < paths.length) {
                drawPath(ctx, paths[i], '#3b82f6', 0.7, 5);
                i++;
                setTimeout(drawNext, 800);
            } else {
                // Stay for 1.5 seconds then return to ghost state
                setTimeout(() => {
                    ctx.clearRect(0, 0, 600, 500);
                    paths.forEach((pathStr, idx) => {
                        drawPath(ctx, pathStr, '#94a3b8', 0.08, 3);
                    });
                    if (currentStroke < paths.length) {
                        drawPath(ctx, paths[currentStroke], '#3b82f6', 0.35, 5);
                    }
                }, 1500);
            }
        }
        drawNext();
    }, [drawPath, currentStroke]);

    // Expose animate to parent via ref
    useImperativeHandle(ref, () => ({
        animate: animateStrokes
    }));

    // Redraw ghost when current stroke changes
    useEffect(() => {
        if (!kanjiChar || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, 600, 500);

        if (strokePathsRef.current.length === 0) return;
        const strokes = strokePathsRef.current;

        strokes.forEach((pathStr, i) => {
            if (i !== currentStroke) {
                drawPath(ctx, pathStr, '#94a3b8', i < currentStroke ? 0.15 : 0.08, 3);
            }
        });

        if (currentStroke < strokes.length) {
            drawPath(ctx, strokes[currentStroke], '#3b82f6', 0.35, 5);
        }
    }, [kanjiChar, currentStroke, drawPath]);

    // Fetch stroke data when kanji changes
    useEffect(() => {
        if (!kanjiChar) return;

        strokePathsRef.current = [];
        setTotalStrokes(0);

        fetch(`http://localhost:3001/api/kanji/strokes/${encodeURIComponent(kanjiChar)}`)
            .then(r => r.text())
            .then(svg => {
                const paths = parseStrokes(svg);
                strokePathsRef.current = paths;
                setTotalStrokes(paths.length);
                onStrokesLoaded(paths.length);

                if (!canvasRef.current) return;
                const ctx = canvasRef.current.getContext('2d');
                ctx.clearRect(0, 0, 600, 500);

                paths.forEach((pathStr, i) => {
                    if (i !== currentStroke) {
                        drawPath(ctx, pathStr, '#94a3b8', i < currentStroke ? 0.15 : 0.08, 3);
                    }
                });
                if (currentStroke < paths.length) {
                    drawPath(ctx, paths[currentStroke], '#3b82f6', 0.35, 5);
                }
            })
            .catch(err => console.error('Failed to load kanji strokes:', err));
    }, [kanjiChar, parseStrokes, onStrokesLoaded]);

    return (
        <canvas
            ref={canvasRef}
            width={600}
            height={500}
            style={{
                position: 'absolute', top: 0, left: 0,
                pointerEvents: 'none', borderRadius: 12,
            }}
        />
    );
});

export default GhostCanvas;