import { ChangeEvent, FormEvent, RefObject, useState } from "react";
import { buildClientPrompt } from "@/lib/buildPrompt";
import { drawBackground, drawCopy, drawPhoneMockup, fitImageCover, styleTokens } from "@/lib/canvasUtils";
import type { PromoFormValues } from "@/lib/types";

type UploadedImage = {
  file: File;
  image: HTMLImageElement;
  url: string;
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

export function usePromoGenerator(canvasRef: RefObject<HTMLCanvasElement | null>) {
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

  return {
    values,
    uploadedImage,
    prompt,
    generatedImageUrl,
    isGenerating,
    errorMessage,
    updateValue,
    handleScreenshotChange,
    handleSubmit,
  };
}
