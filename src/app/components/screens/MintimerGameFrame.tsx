type MintimerGameFrameProps = {
  className?: string;
};

/** Canvas-игра «Приключения МинТимера» из mintimer_game/ */
export function MintimerGameFrame({ className }: MintimerGameFrameProps) {
  return (
    <iframe
      src="/mintimer_game/index.html"
      title="Приключения МинТимера"
      className={className}
      allow="autoplay"
      style={{ border: 0, background: "#101320" }}
    />
  );
}
