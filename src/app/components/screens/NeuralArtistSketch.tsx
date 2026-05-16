import { useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { ReactSketchCanvas, ReactSketchCanvasRef } from "react-sketch-canvas";
import { Eraser, Minus, Plus, RotateCcw } from "lucide-react";
import { Button, Card, Surface, Typography } from "@heroui/react";
import { dataUrlToFile } from "../../utils/media";
import { KioskHeader, KioskScreen } from "../kiosk";

export function NeuralArtistSketch() {
  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [eraseMode, setEraseMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const style = location.state?.style || "vangogh";

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      const dataUrl = await canvasRef.current?.exportImage("jpeg");
      if (!dataUrl) throw new Error("empty");
      const sketchFile = await dataUrlToFile(dataUrl, "sketch.jpg");
      navigate("/neural-artist/loading", { state: { style, sketchFile } });
    } catch {
      alert("Нарисуйте набросок перед продолжением");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KioskScreen backTo="/neural-artist" contentClassName="overflow-hidden">
      <KioskHeader
        title="Нарисуйте свой набросок"
        subtitle="Рисуйте пальцем или стилусом на холсте"
      />

      <div className="flex flex-col items-center gap-6">
        <Card className="overflow-hidden w-full max-w-4xl aspect-[4/3] p-0">
          <ReactSketchCanvas
            ref={canvasRef}
            strokeWidth={strokeWidth}
            strokeColor={eraseMode ? "white" : "#000000"}
            canvasColor="white"
            style={{ width: "100%", height: "100%" }}
          />
        </Card>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Surface variant="secondary" className="flex items-center gap-2 rounded-xl p-3">
            <Button
              variant="secondary"
              isIconOnly
              onPress={() => setStrokeWidth(Math.max(1, strokeWidth - 2))}
            >
              <Minus className="size-5" />
            </Button>
            <Typography.Paragraph className="min-w-12 text-center">
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
            onPress={() => setEraseMode(!eraseMode)}
          >
            <Eraser className="size-5" />
            Ластик
          </Button>

          <Button
            variant="secondary"
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

          <Button variant="secondary" onPress={() => canvasRef.current?.clearCanvas()}>
            Очистить
          </Button>

          <Button
            variant="primary"
            onPress={handleComplete}
            isDisabled={submitting}
          >
            {submitting ? "Подготовка..." : "Готово"}
          </Button>
        </div>
      </div>
    </KioskScreen>
  );
}
