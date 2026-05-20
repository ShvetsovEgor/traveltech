import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { ReactSketchCanvas, ReactSketchCanvasRef } from "react-sketch-canvas";
import { Eraser, Minus, Plus, RotateCcw } from "lucide-react";
import { Button, Card, Surface, Typography } from "@heroui/react";
import {
  clearPendingArtistSketch,
  setPendingArtistSketch,
} from "../../utils/artistSketchSession";
import { dataUrlToFile } from "../../utils/media";
import { KioskBody, KioskHeader, KioskScreen } from "../kiosk";

export function NeuralArtistSketch() {
  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [eraseMode, setEraseMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const style = location.state?.style || "vangogh";

  useEffect(() => {
    clearPendingArtistSketch();
  }, []);

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      const dataUrl = await canvasRef.current?.exportImage("jpeg");
      if (!dataUrl) throw new Error("empty");
      const sketchFile = await dataUrlToFile(dataUrl, "sketch.jpg");
      setPendingArtistSketch(sketchFile);
      navigate("/neural-artist/loading", { state: { style } });
    } catch {
      alert("Нарисуйте набросок перед продолжением");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KioskScreen
      backTo="/neural-artist"
      contentClassName="min-h-0 overflow-hidden"
    >
      <KioskHeader
        compact
        centered={false}
        title="Нарисуйте свой набросок"
        subtitle="Рисуйте пальцем или стилусом на холсте"
      />

      <KioskBody className="flex min-h-0 flex-col gap-3">
        <Card className="aspect-[4/3] min-h-0 w-full max-w-4xl flex-1 overflow-hidden p-0 self-center">
          <ReactSketchCanvas
            ref={canvasRef}
            strokeWidth={strokeWidth}
            strokeColor={eraseMode ? "white" : "#000000"}
            canvasColor="white"
            style={{ width: "100%", height: "100%" }}
          />
        </Card>

        <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 pb-1 sm:gap-3">
          <Surface variant="secondary" className="flex items-center gap-2 rounded-xl p-2 sm:p-3">
            <Button
              variant="secondary"
              isIconOnly
              onPress={() => setStrokeWidth(Math.max(1, strokeWidth - 2))}
            >
              <Minus className="size-5" />
            </Button>
            <Typography.Paragraph className="min-w-12 text-center text-sm">
              {strokeWidth}px
            </Typography.Paragraph>
            <Button
              variant="secondary"
              isIconOnly
              onPress={() => setStrokeWidth(Math.min(20, strokeWidth + 2))}
            >
              <Plus className="size-5" />
            </Button>
          </Surface>

          <Button
            variant={eraseMode ? "primary" : "secondary"}
            size="sm"
            onPress={() => setEraseMode(!eraseMode)}
          >
            <Eraser className="size-5" />
            Ластик
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onPress={() => {
              try {
                canvasRef.current?.undo();
              } catch {
                /* empty */
              }
            }}
          >
            <RotateCcw className="size-5" />
            Отменить
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onPress={() => canvasRef.current?.clearCanvas()}
          >
            Очистить
          </Button>

          <Button
            variant="primary"
            size="sm"
            onPress={handleComplete}
            isDisabled={submitting}
          >
            {submitting ? "Подготовка..." : "Готово"}
          </Button>
        </div>
      </KioskBody>
    </KioskScreen>
  );
}
