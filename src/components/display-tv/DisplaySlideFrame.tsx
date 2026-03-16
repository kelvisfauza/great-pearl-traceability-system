import { useEffect, useMemo, useRef, useState } from "react";

interface DisplaySlideFrameProps {
  children: React.ReactNode;
}

const DISPLAY_WIDTH = 1920;
const DISPLAY_HEIGHT = 1080;

const DisplaySlideFrame = ({ children }: DisplaySlideFrameProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      setScale(Math.min(width / DISPLAY_WIDTH, height / DISPLAY_HEIGHT));
    };

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const transform = useMemo(
    () => `translate(-50%, -50%) scale(${scale})`,
    [scale]
  );

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-[2rem] border border-border/60 bg-background shadow-2xl">
      <div
        className="absolute left-1/2 top-1/2 h-[1080px] w-[1920px] overflow-hidden rounded-[2rem] bg-background"
        style={{ transform, transformOrigin: "center center" }}
      >
        {children}
      </div>
    </div>
  );
};

export default DisplaySlideFrame;
