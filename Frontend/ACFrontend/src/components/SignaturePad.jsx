import { useEffect, useImperativeHandle, useRef, useState } from "react";

// Canvas signature pad (mouse, pen and touch). Exposes isEmpty(), clear(), toDataURL() via ref.
export default function SignaturePad({ ref, height = 180 }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  // Size the canvas to its CSS width at device pixel ratio for crisp lines
  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const { width } = canvas.getBoundingClientRect();
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      const ctx = canvas.getContext("2d");
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#111";
      setEmpty(true);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [height]);

  const point = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const down = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.1, p.y + 0.1);
    ctx.stroke();
    setEmpty(false);
  };
  const move = (e) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };
  const up = () => {
    drawing.current = false;
  };

  const clear = () => {
    const c = canvasRef.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    setEmpty(true);
  };

  useImperativeHandle(ref, () => ({
    isEmpty: () => empty,
    clear,
    // White background so the PNG reads well on the PDF
    toDataURL: () => {
      const src = canvasRef.current;
      const out = document.createElement("canvas");
      out.width = src.width;
      out.height = src.height;
      const ctx = out.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(src, 0, 0);
      return out.toDataURL("image/png");
    },
  }));

  return (
    <div className="sigpad">
      <canvas
        ref={canvasRef}
        style={{ height }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        aria-label="Signature area"
      />
      <div className="sigpad-foot">
        <span className="muted">{empty ? "Sign above" : "Signature captured"}</span>
        <button type="button" className="btn btn-sm btn-ghost" onClick={clear}>
          Clear
        </button>
      </div>
    </div>
  );
}
