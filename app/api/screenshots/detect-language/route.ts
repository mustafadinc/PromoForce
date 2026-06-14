import { NextResponse } from "next/server";
import type { LocaleCode } from "@/lib/locales";
import { detectLanguageFromUiText } from "@/lib/detectScreenshotLanguage";

function getOpenAIKey() {
  return process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const locale = String(formData.get("locale") || "en").trim() as LocaleCode;
    const file = formData.get("screenshot");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "screenshot file is required." }, { status: 400 });
    }

    const apiKey = getOpenAIKey();
    if (!apiKey) {
      return NextResponse.json({
        detected: "unknown",
        confidence: "low",
        matchesLocale: true,
        locale,
        uiTextSample: "",
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/png";
    const chatModel = process.env.OPENAI_VISION_MODEL || process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: chatModel,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: 'Read visible UI text in this app screenshot. Return JSON: { "uiTextSample": "concatenate 5-15 visible UI labels/buttons", "dominantLanguage": "en|tr|de|ja|zh|pt|es|fr|other" }',
              },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64}`, detail: "low" },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({
        detected: "unknown",
        confidence: "low",
        matchesLocale: true,
        locale,
        uiTextSample: "",
      });
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = JSON.parse(payload.choices?.[0]?.message?.content || "{}") as {
      uiTextSample?: string;
      dominantLanguage?: string;
    };

    const uiTextSample = String(raw.uiTextSample || "");
    const dominant = String(raw.dominantLanguage || "other").toLowerCase();
    const detected =
      dominant === "other"
        ? detectLanguageFromUiText(uiTextSample, locale).detected
        : dominant;

    const result = detectLanguageFromUiText(uiTextSample, locale);
    const matchesLocale = detected === "unknown" || detected === locale;

    return NextResponse.json({
      ...result,
      detected: detected === "unknown" ? result.detected : (detected as LocaleCode),
      matchesLocale,
      locale,
      uiTextSample,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Language detection failed." },
      { status: 500 },
    );
  }
}
