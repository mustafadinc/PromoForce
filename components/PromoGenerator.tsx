"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { GeneratedPreview } from "@/components/GeneratedPreview";
import { PromoForm } from "@/components/PromoForm";
import { buildClientPrompt } from "@/lib/buildPrompt";
import type { PromoFormValues, StyleName } from "@/lib/types";

type UploadedImage = {
  file: File;
  image: HTMLImageElement;
  url: string;
};

const styleTokens: Record<
  StyleName,
  {
    bg: [string, string];
    accent: string;
    glow: string;
    text: string;
    muted: string;
    ctaBg: string;
    ctaText: string;
  }
> = {
  "Minimal SaaS": {
    bg: ["#eff7f5", "#dfe7ff"],
    accent: "#101828",
    glow: "#45d6b5",
    text: "#101828",
    muted: "#526071",
    ctaBg: "#101828",
    ctaText: "#ffffff",
  },
  "Modern Gradient": {
    bg: ["#301f75", "#0bb6b0"],
    accent: "#ffffff",
    glow: "#ffcf5a",
    text: "#ffffff",
    muted: "#dce8ff",
    ctaBg: "#ffffff",
    ctaText: "#101828",
  },
  "Dark Tech": {
    bg: ["#07090f", "#121a2f"],
    accent: "#45d6b5",
    glow: "#7c5cff",
    text: "#f5f7fb",
    muted: "#a7b2c3",
    ctaBg: "#f5f7fb",
    ctaText: "#07090f",
  },
  "App Store Launch": {
    bg: ["#121722", "#25324a"],
    accent: "#8ef0ff",
    glow: "#ffffff",
    text: "#ffffff",
    muted: "#c7d2e5",
    ctaBg: "#ffffff",
    ctaText: "#121722",
  },
  "Fun & Colorful": {
    bg: ["#ff6b8a", "#ffd166"],
    accent: "#10212b",
    glow: "#7c5cff",
    text: "#101828",
    muted: "#344054",
    ctaBg: "#101828",
    ctaText: "#ffffff",
  },
};

const initialValues: PromoFormValues = {
  appName: "",
  category: "",
  description: "",
  targetAudience: "",
  style: "Minimal SaaS",
};

const loadImage = (file: File) =>
  new Promise<UploadedImage>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve({ file, image, url: String(reader.result) });
      image.onerror = reject;
      image.src = String(reader.result);
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export function PromoGenerator() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [values, setValues] = useState<PromoFormValues>(initialValues);
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [prompt, setPrompt] = useState("Fill the form and upload a screenshot to generate a prompt.");
  const [generatedImageUrl, setGeneratedImageUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const updateValue = <Field extends keyof PromoFormValues>(field: Field, value: PromoFormValues[Field]) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleScreenshotChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = event.target.files || [];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please upload a valid image file.");
      return;
    }

    setUploadedImage(await loadImage(file));
    setErrorMessage("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!uploadedImage) {
      setErrorMessage("Please upload an app screenshot first.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage("");

    const fallbackPrompt = buildClientPrompt(values);
    setPrompt(fallbackPrompt);

    try {
      const formData = new FormData();
      formData.append("appName", values.appName);
      formData.append("category", values.category);
      formData.append("description", values.description);
      formData.append("targetAudience", values.targetAudience);
      formData.append("style", values.style);
      formData.append("screenshot", uploadedImage.file);

      const response = await fetch("/api/generate-promo", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Image generation failed.");
      }

      setPrompt(result.prompt || fallbackPrompt);

      if (result.imageUrl || result.dataUrl) {
        await renderExternalImage(result.imageUrl || result.dataUrl);
      } else {
        renderLocalPromo(values, uploadedImage.image);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Image generation failed.");
      renderLocalPromo(values, uploadedImage.image);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderExternalImage = async (imageSource: string) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        fitImageCover(context, image, 0, 0, canvas.width, canvas.height);
        setGeneratedImageUrl(canvas.toDataURL("image/png"));
        resolve();
      };
      image.onerror = reject;
      image.src = imageSource;
    });
  };

  const renderLocalPromo = (data: PromoFormValues, image: HTMLImageElement) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const tokens = styleTokens[data.style];
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(context, canvas, tokens);
    drawCopy(context, data, tokens);
    drawPhoneMockup(context, image, tokens);
    setGeneratedImageUrl(canvas.toDataURL("image/png"));
  };

  return (
    <section className="workspace" aria-label="Instagram promo image generator">
      <PromoForm
        errorMessage={errorMessage}
        isGenerating={isGenerating}
        onChange={updateValue}
        onScreenshotChange={handleScreenshotChange}
        onSubmit={handleSubmit}
        uploadPreviewUrl={uploadedImage?.url || ""}
        values={values}
      />

      <GeneratedPreview canvasRef={canvasRef} generatedImageUrl={generatedImageUrl} prompt={prompt} />
    </section>
  );
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function fitImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = x + (width - drawWidth) / 2;
  const offsetY = y + (height - drawHeight) / 2;
  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  });

  if (line) lines.push(line);

  lines.slice(0, maxLines).forEach((currentLine, index) => {
    const suffix = index === maxLines - 1 && lines.length > maxLines ? "..." : "";
    context.fillText(`${currentLine}${suffix}`, x, y + index * lineHeight);
  });
}

function drawBackground(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  tokens: (typeof styleTokens)[StyleName],
) {
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, tokens.bg[0]);
  gradient.addColorStop(1, tokens.bg[1]);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.globalAlpha = 0.24;
  context.fillStyle = tokens.glow;
  context.beginPath();
  context.arc(865, 212, 260, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 0.16;
  context.beginPath();
  context.arc(182, 862, 310, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;

  context.strokeStyle = "rgba(255,255,255,0.12)";
  context.lineWidth = 1;
  for (let x = 80; x < canvas.width; x += 86) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x - 420, canvas.height);
    context.stroke();
  }
}

function drawPhoneMockup(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  tokens: (typeof styleTokens)[StyleName],
) {
  const phone = { x: 585, y: 124, width: 342, height: 742, radius: 46 };
  const screen = { x: 607, y: 162, width: 298, height: 666, radius: 34 };

  context.save();
  context.shadowColor = "rgba(0,0,0,0.45)";
  context.shadowBlur = 44;
  context.shadowOffsetY = 26;
  roundRect(context, phone.x, phone.y, phone.width, phone.height, phone.radius);
  context.fillStyle = "#07090d";
  context.fill();
  context.restore();

  context.strokeStyle = "rgba(255,255,255,0.28)";
  context.lineWidth = 3;
  roundRect(context, phone.x, phone.y, phone.width, phone.height, phone.radius);
  context.stroke();

  context.save();
  roundRect(context, screen.x, screen.y, screen.width, screen.height, screen.radius);
  context.clip();
  fitImageCover(context, image, screen.x, screen.y, screen.width, screen.height);
  context.restore();

  roundRect(context, 704, 140, 104, 20, 10);
  context.fillStyle = "#07090d";
  context.fill();

  context.strokeStyle = tokens.glow;
  context.globalAlpha = 0.78;
  context.lineWidth = 2;
  roundRect(context, screen.x, screen.y, screen.width, screen.height, screen.radius);
  context.stroke();
  context.globalAlpha = 1;
}

function drawCopy(
  context: CanvasRenderingContext2D,
  { appName, category, description, targetAudience }: PromoFormValues,
  tokens: (typeof styleTokens)[StyleName],
) {
  context.fillStyle = tokens.accent;
  roundRect(context, 92, 112, 172, 42, 21);
  context.globalAlpha = 0.16;
  context.fill();
  context.globalAlpha = 1;

  context.fillStyle = tokens.accent;
  context.font = "700 24px Inter, Arial, sans-serif";
  context.fillText(category || "Mobile App", 116, 140);

  context.fillStyle = tokens.text;
  context.font = "800 78px Inter, Arial, sans-serif";
  wrapText(context, appName || "Your App", 88, 250, 420, 82, 3);

  context.fillStyle = tokens.muted;
  context.font = "500 28px Inter, Arial, sans-serif";
  wrapText(context, description || "Premium app experience for modern teams.", 92, 514, 420, 40, 4);

  context.fillStyle = tokens.accent;
  context.font = "800 25px Inter, Arial, sans-serif";
  context.fillText("Built for", 92, 746);

  context.fillStyle = tokens.text;
  context.font = "700 31px Inter, Arial, sans-serif";
  wrapText(context, targetAudience || "early adopters", 92, 794, 430, 38, 2);

  context.fillStyle = tokens.ctaBg;
  context.globalAlpha = 0.9;
  roundRect(context, 92, 900, 236, 58, 29);
  context.fill();
  context.globalAlpha = 1;
  context.fillStyle = tokens.ctaText;
  context.font = "800 22px Inter, Arial, sans-serif";
  context.fillText("Launch now", 135, 936);
}
