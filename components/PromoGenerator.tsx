"use client";

import { useRef } from "react";
import { GeneratedPreview } from "@/components/GeneratedPreview";
import { PromoForm } from "@/components/PromoForm";
import { usePromoGenerator } from "@/hooks/usePromoGenerator";

export function PromoGenerator() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const {
    values,
    uploadedImage,
    prompt,
    generatedImageUrl,
    isGenerating,
    errorMessage,
    updateValue,
    handleScreenshotChange,
    handleSubmit,
  } = usePromoGenerator(canvasRef);

  return (
    <section className="workspace" aria-label="Marketing Pipeline Dashboard">
      <PromoForm
        errorMessage={errorMessage}
        isGenerating={isGenerating}
        onChange={updateValue}
        onScreenshotChange={handleScreenshotChange}
        onSubmit={handleSubmit}
        uploadPreviewUrl={uploadedImage?.url || ""}
        values={values}
      />

      <GeneratedPreview 
        canvasRef={canvasRef} 
        generatedImageUrl={generatedImageUrl} 
        prompt={prompt} 
      />
    </section>
  );
}
