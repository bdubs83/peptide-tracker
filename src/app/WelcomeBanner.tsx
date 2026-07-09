import React from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import { Button } from "../components/Button";
import { putAppSetting } from "../db/appSettings";
import type { AppSetting } from "../db/schema";
import { skoolReferralUrl, welcomeNotesSeenVersionKey, welcomeNotesVersion, welcomeUpdateNotes } from "./welcomeNotes";

type WelcomeBannerProps = {
  settings: AppSetting[] | undefined;
};

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ settings }) => {
  const [dismissed, setDismissed] = React.useState(false);
  const seenVersion = settings?.find((setting) => setting.key === welcomeNotesSeenVersionKey)?.value;
  const shouldShow = settings !== undefined && !dismissed && seenVersion !== welcomeNotesVersion;

  const handleDismiss = async () => {
    setDismissed(true);
    await putAppSetting(welcomeNotesSeenVersionKey, welcomeNotesVersion);
  };

  if (!shouldShow) return null;

  return (
    <div className="welcome-banner-overlay" role="dialog" aria-modal="true" aria-labelledby="welcome-banner-title">
      <div className="welcome-banner-panel">
        <div className="welcome-banner-heading">
          <div className="welcome-banner-icon" aria-hidden="true">
            <Sparkles size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 id="welcome-banner-title">Welcome to Inner Circle</h2>
            <p>Peptide tracking tools without the paywall.</p>
          </div>
        </div>

        <div className="welcome-banner-section">
          <h3>Free tools that actually help</h3>
          <p>
            Track schedules, stock, reminders, reports, calculators, and progress without paying for
            features most apps lock behind subscriptions.
          </p>
        </div>

        <div className="welcome-banner-section">
          <h3>Trusted sourcing community</h3>
          <p>
            Looking for wholesale peptide sources with COAs? Reta Unfiltered Skool is a trusted
            community for vetted resources.
          </p>
          <a
            href={skoolReferralUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary welcome-banner-link"
          >
            Open Reta Unfiltered Skool
            <ExternalLink size={15} />
          </a>
        </div>

        <div className="welcome-banner-section">
          <h3>What's new</h3>
          <ul className="welcome-banner-updates">
            {welcomeUpdateNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>

        <div className="welcome-banner-actions">
          <Button variant="primary" fullWidth onClick={handleDismiss}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};
