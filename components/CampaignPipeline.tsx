"use client";

import { useEffect, useState } from "react";
import { AppSetupForm } from "@/components/AppSetupForm";
import { AutopilotCalendarGallery } from "@/components/AutopilotCalendarGallery";
import { AutopilotStrategyPreview } from "@/components/AutopilotStrategyPreview";
import { GenerationBanner } from "@/components/GenerationBanner";
import { GenerationOverlay } from "@/components/GenerationOverlay";
import { PromoForceNav, type WorkflowTab } from "@/components/PromoForceNav";
import { SetupPreviewPanel, type SetupDraft } from "@/components/SetupPreviewPanel";
import { SocialPackGallery } from "@/components/SocialPackGallery";
import { SocialStrategyPreview } from "@/components/SocialStrategyPreview";
import { StoreSetGallery } from "@/components/StoreSetGallery";
import { StrategyPreview } from "@/components/StrategyPreview";
import { StrategyWorkflowSidebar } from "@/components/StrategyWorkflowSidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useCampaignPipeline } from "@/hooks/useCampaignPipeline";
import { stripFormQueryParamsFromUrl } from "@/lib/cleanBrowserUrl";
import type { AppProfile } from "@/lib/campaignTypes";

const PLANNING_STEPS = [
  "Analyzing application structure...",
  "Scanning design keywords and themes...",
  "Building conversion-focused marketing strategy...",
  "Planning screenshot assignments and backgrounds...",
  "Preparing editable strategy brief...",
];

export function CampaignPipeline() {
  const [workspaceProfile, setWorkspaceProfile] = useState<AppProfile | null>(null);
  const [planningStep, setPlanningStep] = useState(0);
  const [setupDraft, setSetupDraft] = useState<SetupDraft | null>(null);

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
    regeneratingSlideNumber,
    usageRefreshKey,
    createStrategy,
    generateCampaign,
    cancelGeneration,
    resetCampaign,
    goBackToSetup,
    goToStrategy,
    goToGallery,
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

  const activeTab: WorkflowTab = step === "setup" ? "setup" : step === "strategy" ? "strategy" : "export";
  const canAccessStrategy = Boolean(storeStrategy || socialStrategy || autopilotStrategy);
  const canAccessExport = Boolean(
    generatedSlides.length || generatedSocialAssets.length || generatedCalendarPosts.length,
  );

  const phaseLabel = isStore ? "Phase 1" : isSocial ? "Phase 2" : isAutopilot ? "Phase 3" : "Phase 4";
  const strategyTitle = isStore
    ? "Store Strategy"
    : isSocial
      ? "Social Strategy"
      : isAutopilot
        ? "Autopilot Calendar"
        : "Growth";
  const galleryTitle = isStore ? "Store Set" : isSocial ? "Social Pack" : isAutopilot ? "Content Calendar" : "Export";

  const sidebarCopy =
    step === "gallery"
      ? "Rate post performance after publishing — AI uses this feedback in your next campaign."
      : isAutopilot
        ? "AI planned your calendar with A/B caption variants. Pick variants, edit, then generate."
        : isSocial
          ? "Test caption variant A vs B before generating images."
          : "AI proposed the plan below. Edit, then generate.";

  const handleTabChange = (tab: WorkflowTab) => {
    if (tab === "setup") {
      if (step === "setup") return;
      goBackToSetup();
      return;
    }
    if (tab === "strategy") {
      goToStrategy();
      return;
    }
    goToGallery();
  };

  useEffect(() => {
    stripFormQueryParamsFromUrl();
  }, []);

  useEffect(() => {
    if (!isPlanning) {
      setPlanningStep(0);
      return;
    }

    setPlanningStep(0);
    const interval = window.setInterval(() => {
      setPlanningStep((current) => Math.min(current + 1, PLANNING_STEPS.length - 1));
    }, 900);

    return () => window.clearInterval(interval);
  }, [isPlanning]);

  return (
    <ThemeProvider>
      <div className="pf-app">
        <div className="pf-bg-blob pf-bg-blob-teal" aria-hidden="true" />
        <div className="pf-bg-blob pf-bg-blob-violet" aria-hidden="true" />
        <div className="pf-bg-blob pf-bg-blob-gold" aria-hidden="true" />

        <PromoForceNav
          key={usageRefreshKey}
          currentProfile={activeProfile}
          activeTab={activeTab}
          canAccessStrategy={canAccessStrategy}
          canAccessExport={canAccessExport}
          onTabChange={handleTabChange}
          onLoadApp={(loadedProfile) => {
            setWorkspaceProfile(loadedProfile);
            if (step !== "setup") {
              resetCampaign();
            }
          }}
        />

        {isGenerating && !isPlanning ? (
          <div className="pf-banner-wrap">
            <GenerationBanner progressLabel={progressLabel} onCancel={cancelGeneration} />
          </div>
        ) : null}

        <div className="pf-workspace">
          {step === "setup" ? (
            <div className="pf-setup-layout">
              <AppSetupForm
                errorMessage={errorMessage}
                isBusy={isPlanning}
                initialScreenshots={screenshots}
                onDraftChange={setSetupDraft}
                onSubmit={createStrategy}
                submitLabel={isPlanning ? "Planning Strategy..." : "Generate Campaign Strategy"}
                workspaceProfile={workspaceProfile}
              />
              <SetupPreviewPanel draft={setupDraft} isPlanning={isPlanning} />
            </div>
          ) : null}

          {step === "strategy" ? (
            <div className="pf-strategy-layout">
              <StrategyWorkflowSidebar
                mode="strategy"
                strategyTitle={strategyTitle}
                phaseLabel={phaseLabel}
                sidebarCopy={sidebarCopy}
                appProfile={profile}
                screenshotCount={screenshotPreviews.length}
                hasEdits={hasEdits}
                errorMessage={errorMessage}
                screenshotPreviews={screenshotPreviews}
                onNewCampaign={resetCampaign}
                onNavigate={handleTabChange}
              />
              <div className="pf-strategy-main pf-strategy-main-full">
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
              </div>
            </div>
          ) : null}

          {step === "gallery" ? (
            <div className="pf-strategy-layout pf-export-layout">
              <StrategyWorkflowSidebar
                mode="export"
                strategyTitle={galleryTitle}
                phaseLabel="Phase 4 · Export"
                sidebarCopy={sidebarCopy}
                appProfile={profile}
                screenshotCount={screenshotPreviews.length}
                errorMessage={errorMessage}
                screenshotPreviews={screenshotPreviews}
                onNewCampaign={resetCampaign}
                onNavigate={handleTabChange}
              />
              <div className="pf-strategy-main pf-export-main">
                <header className="pf-strategy-header">
                  <div>
                    <span className="pf-export-eyebrow">Phase 4 Export Set</span>
                    <h1>{galleryTitle}</h1>
                    <p>Review generated assets, download individually, or export as a bundle.</p>
                  </div>
                </header>

                {isStore ? (
                  <StoreSetGallery
                    slides={generatedSlides}
                    progressLabel={progressLabel}
                    partialPreviewUrl={partialPreviewUrl}
                    regeneratingSlideNumber={regeneratingSlideNumber}
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
              </div>
            </div>
          ) : null}
        </div>

        <footer className="pf-footer">
          <span>© 2026 PromoForce Campaign Assistant</span>
          <div className="pf-footer-links">
            <a href="/pricing">Pricing</a>
            <a href="/insights">Insights</a>
            <a href="/onboarding">Onboarding</a>
          </div>
        </footer>

        <GenerationOverlay
          open={isPlanning}
          steps={PLANNING_STEPS}
          activeStep={Math.min(planningStep, PLANNING_STEPS.length - 1)}
        />
      </div>
    </ThemeProvider>
  );
}
