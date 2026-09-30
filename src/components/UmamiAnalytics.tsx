'use client';

import Script from 'next/script';

interface UmamiAnalyticsProps {
  scriptUrl?: string;
  websiteId?: string;
}

export function UmamiAnalytics({ scriptUrl, websiteId }: UmamiAnalyticsProps) {
  if (!scriptUrl || !websiteId) return null;

  const base = scriptUrl.replace(/\/+$/, '');

  return (
    <Script
      src={`${base}/script.js`}
      data-website-id={websiteId}
      strategy="afterInteractive"
      defer
    />
  );
}
