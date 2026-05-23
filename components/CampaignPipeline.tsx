"use client";

import { useState } from "react";
import { AppSetupForm } from "@/components/AppSetupForm";
import { AutopilotCalendarGallery } from "@/components/AutopilotCalendarGallery";
import { AutopilotStrategyPreview } from "@/components/AutopilotStrategyPreview";
import { GrowthToolbar } from "@/components/GrowthToolbar";
import { SocialPackGallery } from "@/components/SocialPackGallery";
import { SocialStrategyPreview } from "@/components/SocialStrategyPreview";
import { StoreSetGallery } from "@/components/StoreSetGallery";
import { StrategyPreview } from "@/components/StrategyPreview";
import { GenerationBanner } from "@/components/GenerationBanner";
import { useCampaignPipeline } from "@/hooks/useCampaignPipeline";
import type { AppProfile } from "@/lib/campaignTypes";

export function CampaignPipeline() {
  const [workspaceProfile, setWorkspaceProfile] = useState<AppProfile | null>(null);

  const {
    step,
    campaignType,
    profile,
    screenshots,
    storeStrategy,
    socialStrategy,
    autopilotStrategy,
    screenshotPreviews,
    hasEdits,
    generatedSlides,
    generatedSocialAssets,
    generatedCalendarPosts,
    errorMessage,
    isPlanning,
    isGenerating,
    progressLabel,
    partialPreviewUrl,
    usageRefreshKey,
    createStrategy,
    generateCampaign,
    cancelGeneration,
    resetCampaign,
    goBackToSetup,
    setStoreStrategy,
    setSocialStrategy,
    setAutopilotStrategy,
    resetStrategyToAi,
    regenerateStoreSlide,
    selectSlideVariant,
  } = useCampaignPipeline();

  const isStore = campaignType === "app_store";
  const isSocial = campaignType === "social_launch";
  const isAutopilot = campaignType === "marketing_autopilot";
  const activeProfile = profile || workspaceProfile;

  const phaseLabel = isStore ? "1" : isSocial ? "2" : isAutopilot ? "3" : "4";
  const strategyTitle = isStore
    ? "Store Strategy"
    : isSocial
      ? "Social Strategy"
      : isAutopilot
        ? "Autopilot Calendar"
        : "Growth";
  const galleryTitle = isStore ? "Store Set" : isSocial ? "Social Pack" : isAutopilot ? "Content Calendar" : "Export";

  return (
    <>
      <GrowthToolbar
        key={usageRefreshKey}
        currentProfile={activeProfile}
        onLoadApp={(loadedProfile) => {
          setWorkspaceProfile(loadedProfile);
          if (step !== "setup") {
            resetCampaign();
          }
        }}
      />

      {isGenerating ? (
        <GenerationBanner progressLabel={progressLabel} onCancel={cancelGeneration} />
      ) : null}

      <section className="workspace" aria-label="PromoForce Campaign Pipeline">
        {step === "setup" ? (
          <AppSetupForm
            errorMessage={errorMessage}
            isBusy={isPlanning}
            initialScreenshots={screenshots}
            onSubmit={createStrategy}
            submitLabel={isPlanning ? "Planning Strategy..." : "Generate Strategy"}
            workspaceProfile={workspaceProfile}
          />
        ) : null}

        {step === "strategy" ? (
          <>
            <aside className="panel input-panel strategy-sidebar">
              <div className="brand-row">
                <div className="brand-mark">PF</div>
                <div>
                  <p className="eyebrow">Phase {phaseLabel}</p>
                  <h1>{strategyTitle}</h1>
                </div>
              </div>
              <p className="sidebar-copy">
                {isAutopilot
                  ? "AI planned your calendar with A/B caption variants. Pick variants, edit, then generate."
                  : isSocial
                    ? "Test caption variant A vs B before generating images."
                    : "AI proposed the plan below. Edit, then generate."}
              </p>
              {hasEdits ? <p className="edit-indicator">You have edits to the AI plan.</p> : null}
              {screenshotPreviews.length ? (
                <div className="uploaded-screens-strip">
                  <span className="uploaded-screens-label">Uploaded screens ({screenshotPreviews.length})</span>
                  <div className="screenshot-grid screenshot-grid-compact">
                    {screenshotPreviews.map((preview) => (
                      <figure key={preview.index} className="screenshot-thumb">
                        <img src={preview.previewUrl} alt={`Uploaded screen ${preview.index + 1}`} />
                        <figcaption>Screen {preview.index + 1}</figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              ) : null}
              {errorMessage ? <p className="error-message">{errorMessage}</p> : null}
            </aside>
            {isStore ? (
              <StrategyPreview
                strategy={storeStrategy}
                appProfile={profile}
                screenshotPreviews={screenshotPreviews}
                hasEdits={hasEdits}
                isGenerating={isGenerating}
                onStrategyChange={setStoreStrategy}
                onResetStrategy={resetStrategyToAi}
                onGenerate={generateCampaign}
                onBack={goBackToSetup}
                onCancel={cancelGeneration}
              />
            ) : isSocial ? (
              <SocialStrategyPreview
                strategy={socialStrategy}
                screenshotPreviews={screenshotPreviews}
                hasEdits={hasEdits}
                isGenerating={isGenerating}
                onStrategyChange={setSocialStrategy}
                onResetStrategy={resetStrategyToAi}
                onGenerate={generateCampaign}
                onBack={goBackToSetup}
                onCancel={cancelGeneration}
              />
            ) : (
              <AutopilotStrategyPreview
                strategy={autopilotStrategy}
                screenshotPreviews={screenshotPreviews}
                hasEdits={hasEdits}
                isGenerating={isGenerating}
                onStrategyChange={setAutopilotStrategy}
                onResetStrategy={resetStrategyToAi}
                onGenerate={generateCampaign}
                onBack={goBackToSetup}
                onCancel={cancelGeneration}
              />
            )}
          </>
        ) : null}

        {step === "gallery" ? (
          <>
            <aside className="panel input-panel strategy-sidebar">
              <div className="brand-row">
                <div className="brand-mark">PF</div>
                <div>
                  <p className="eyebrow">Phase 4 · Export</p>
                  <h1>{galleryTitle}</h1>
                </div>
              </div>
              <p className="sidebar-copy">
                Rate post performance after publishing — AI uses this feedback in your next campaign.
              </p>
              {errorMessage ? <p className="error-message">{errorMessage}</p> : null}
            </aside>
            {isStore ? (
              <StoreSetGallery
                slides={generatedSlides}
                progressLabel={progressLabel}
                partialPreviewUrl={partialPreviewUrl}
                isGenerating={isGenerating}
                onRestart={resetCampaign}
                onCancel={cancelGeneration}
                onRegenerateSlide={regenerateStoreSlide}
                onSelectVariant={selectSlideVariant}
              />
            ) : isSocial ? (
              <SocialPackGallery
                appName={profile?.appName || ""}
                assets={generatedSocialAssets}
                progressLabel={progressLabel}
                partialPreviewUrl={partialPreviewUrl}
                isGenerating={isGenerating}
                onRestart={resetCampaign}
                onCancel={cancelGeneration}
              />
            ) : (
              <AutopilotCalendarGallery
                appName={profile?.appName || ""}
                strategy={autopilotStrategy}
                posts={generatedCalendarPosts}
                progressLabel={progressLabel}
                partialPreviewUrl={partialPreviewUrl}
                isGenerating={isGenerating}
                onRestart={resetCampaign}
                onCancel={cancelGeneration}
              />
            )}
          </>
        ) : null}

        {step === "setup" ? (
          <section className="preview-panel">
            <div className="empty-state standalone-empty">
              <span>Growth</span>
              <p>
                A/B captions, performance feedback, workspace apps, and usage limits — built into every social and
                autopilot campaign.
              </p>
            </div>
          </section>
        ) : null}
      </section>
    </>
  );
}
