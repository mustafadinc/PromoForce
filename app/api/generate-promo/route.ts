import { NextResponse } from "next/server";
import { buildPrompt } from "@/lib/buildPrompt";
import { generatePromoImageWithProvider } from "@/lib/imageGeneration";
import { parsePromoFormData, validatePromoInput } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const values = parsePromoFormData(formData);
    const screenshot = formData.get("screenshot");
    const screenshotFile = screenshot instanceof File ? screenshot : null;
    const validationError = validatePromoInput(values, screenshotFile);

    if (validationError || !screenshotFile) {
      return NextResponse.json({ error: validationError || "Screenshot is required." }, { status: 400 });
    }

    const prompt = buildPrompt(values);
    const generated = await generatePromoImageWithProvider({
      prompt,
      screenshot: screenshotFile,
    });

    return NextResponse.json({
      ...generated,
      mode: generated.imageUrl || generated.dataUrl ? "provider" : "local-fallback",
      prompt,
    });
  } catch (error) {
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Image generation failed.",
      },
      { status: 500 },
    );
  }
}
