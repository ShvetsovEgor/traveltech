import { forwardRef, useCallback } from "react";

type GameIframeProps = {
  src: string;
  title: string;
  className?: string;
  background?: string;
};

export const GameIframe = forwardRef<HTMLIFrameElement, GameIframeProps>(
  function GameIframe(
    { src, title, className, background = "#101320" },
    ref,
  ) {
    const handleLoad = useCallback(
      (event: React.SyntheticEvent<HTMLIFrameElement>) => {
        event.currentTarget.focus();
      },
      [],
    );

    return (
      <iframe
        ref={ref}
        src={src}
        title={title}
        className={className}
        tabIndex={0}
        allow="autoplay"
        onLoad={handleLoad}
        style={{ border: 0, background }}
      />
    );
  },
);
