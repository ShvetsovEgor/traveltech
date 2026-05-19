import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { Card, Typography, cn } from "@heroui/react";

export type LoadingStep = {
  icon: LucideIcon;
  text: string;
};

type LoadingStepsListProps = {
  steps: LoadingStep[];
  /** Интервал смены активного шага, мс */
  intervalMs?: number;
  className?: string;
};

export function LoadingStepsList({
  steps,
  intervalMs = 2400,
  className,
}: LoadingStepsListProps) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (steps.length <= 1) return;
    const id = window.setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [steps.length, intervalMs]);

  return (
    <div className={cn("w-full max-w-md space-y-3", className)}>
      {steps.map((step, index) => {
        const isActive = index === activeStep;
        const isDone = index < activeStep;
        const Icon = step.icon;

        return (
          <Card
            key={step.text}
            className={cn(
              "flex items-center gap-4 border bg-card p-4 shadow-sm transition-all duration-500",
              "animate-loading-step-enter",
              isActive &&
                "animate-loading-step-glow border-accent ring-2 ring-accent/30",
              isDone && "border-accent/35 bg-accent/5",
              !isActive && !isDone && "border-border opacity-55"
            )}
            style={{ animationDelay: `${index * 120}ms` }}
          >
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full transition-colors duration-500",
                isActive && "bg-accent/15",
                isDone && "bg-accent/10"
              )}
            >
              {isDone ? (
                <Check className="size-6 text-accent" aria-hidden />
              ) : (
                <Icon
                  className={cn(
                    "size-7 text-accent",
                    isActive && "animate-loading-step-icon"
                  )}
                  aria-hidden
                />
              )}
            </div>
            <Typography.Paragraph
              className={cn(
                "text-left text-lg font-medium transition-colors duration-500",
                isActive ? "text-foreground" : "text-foreground/80"
              )}
            >
              {step.text}
            </Typography.Paragraph>
          </Card>
        );
      })}
    </div>
  );
}
