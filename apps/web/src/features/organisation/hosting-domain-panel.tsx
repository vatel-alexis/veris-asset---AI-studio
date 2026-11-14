'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

interface DnsRecordItem {
  type: string;
  host: string;
  value: string;
  ttl: string;
  purpose: string;
}

interface HostingConfigResponse {
  projectId: string;
  firestoreDatabaseId: string;
  backendId: string;
  region: string;
  rootDir: string;
  customDomain: string;
  wwwDomain: string;
  defaultAppHostingUrl: string;
  cloudRunPreviewUrl: string;
  domainStatus: string;
  sslCertificateStatus: string;
  lastVerifiedAt: string;
  runConfig: {
    minInstances: number;
    maxInstances: number;
    concurrency: number;
    cpu: number;
    memoryMiB: number;
  };
  dnsRecords: DnsRecordItem[];
  authorizedAuthDomains: string[];
}

export function HostingDomainPanel() {
  const locale = useLocale();
  const isFr = locale.startsWith('fr');
  const queryClient = useQueryClient();
  const [domainInput, setDomainInput] = useState('veris-assets.com');
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null);

  const hostingQuery = useQuery<HostingConfigResponse>({
    queryKey: ['platform-hosting'],
    queryFn: async () => {
      const res = await fetch('/api/v1/platform/hosting', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load hosting configuration');
      return (await res.json()) as HostingConfigResponse;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (customDomain: string) => {
      const res = await fetch('/api/v1/platform/hosting/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ customDomain }),
      });
      if (!res.ok) throw new Error('Verification failed');
      return (await res.json()) as {
        ok: boolean;
        customDomain: string;
        domainStatus: string;
        lastVerifiedAt: string;
        collectionsSynced: number;
      };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform-hosting'] });
    },
  });

  if (hostingQuery.isLoading || !hostingQuery.data) {
    return <Skeleton className="h-64 w-full" />;
  }

  const data = hostingQuery.data;
  const isVerified = data.domainStatus === 'ACTIVE_SSL_PROVISIONED';

  const handleCopy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedRecord(label);
      setTimeout(() => setCopiedRecord(null), 2000);
    } catch {
      setCopiedRecord(null);
    }
  };

  return (
    <section
      aria-labelledby="hosting-domain-heading"
      className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div className="flex flex-col gap-1">
          <h2 id="hosting-domain-heading" className="font-heading text-lg font-semibold">
            {isFr
              ? 'Hébergement Cloud (Firebase App Hosting) & Domaine personnalisé'
              : 'Cloud Hosting (Firebase App Hosting) & Custom Domain'}
          </h2>
          <p className="text-sm text-muted">
            {isFr
              ? 'Déploiement continu serverless (scale-to-zero) relié à Cloud Firestore et au domaine cible veris-assets.com.'
              : 'Serverless continuous deployment (scale-to-zero) linked to Cloud Firestore and target domain veris-assets.com.'}
          </p>
        </div>
        <span className="inline-flex items-center rounded-md border border-border bg-canvas px-3 py-1 font-mono text-xs font-medium text-foreground">
          {isVerified
            ? isFr
              ? 'SSL ACTIF · DOMAINE VÉRIFIÉ'
              : 'SSL ACTIVE · DOMAIN VERIFIED'
            : isFr
              ? 'PRÊT POUR BASCULE DNS'
              : 'READY FOR DNS CUTOVER'}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-canvas p-3">
          <span className="text-xs text-muted">
            {isFr ? 'Projet Firebase / GCP' : 'Firebase / GCP Project'}
          </span>
          <span className="font-mono text-sm font-medium text-foreground">{data.projectId}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-canvas p-3">
          <span className="text-xs text-muted">
            {isFr ? 'Base Cloud Firestore' : 'Cloud Firestore Database'}
          </span>
          <span className="truncate font-mono text-xs font-medium text-foreground" title={data.firestoreDatabaseId}>
            {data.firestoreDatabaseId}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-canvas p-3">
          <span className="text-xs text-muted">
            {isFr ? 'Backend App Hosting & Région' : 'App Hosting Backend & Region'}
          </span>
          <span className="font-mono text-sm font-medium text-foreground">
            {data.backendId} ({data.region})
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-canvas p-3">
          <span className="text-xs text-muted">
            {isFr ? 'Dimensionnement Cloud Run' : 'Cloud Run Scaling'}
          </span>
          <span className="font-mono text-sm font-medium text-foreground">
            {data.runConfig.minInstances}–{data.runConfig.maxInstances} instances ·{' '}
            {data.runConfig.memoryMiB} MiB
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-heading text-sm font-semibold">
          {isFr
            ? `Enregistrements DNS à configurer chez votre registrar pour ${data.customDomain}`
            : `DNS records to configure at your registrar for ${data.customDomain}`}
        </h3>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-canvas text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">{isFr ? 'Hôte / Nom' : 'Host / Name'}</th>
                <th className="px-3 py-2 font-medium">{isFr ? 'Valeur cible' : 'Target Value'}</th>
                <th className="px-3 py-2 font-medium">TTL</th>
                <th className="px-3 py-2 font-medium">{isFr ? 'Rôle' : 'Purpose'}</th>
                <th className="px-3 py-2 font-medium">{isFr ? 'Action' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.dnsRecords.map((record) => {
                const key = `${record.type}-${record.host}`;
                return (
                  <tr key={key}>
                    <td className="px-3 py-2.5 font-mono text-xs font-semibold">{record.type}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{record.host}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{record.value}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted">{record.ttl}</td>
                    <td className="px-3 py-2.5 text-xs text-muted">{record.purpose}</td>
                    <td className="px-3 py-2.5">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void handleCopy(key, record.value)}
                      >
                        {copiedRecord === key
                          ? isFr
                            ? 'Copié'
                            : 'Copied'
                          : isFr
                            ? 'Copier'
                            : 'Copy'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-canvas p-4">
        <h3 className="font-heading text-sm font-semibold">
          {isFr
            ? 'Domaines autorisés Firebase Authentication (Google Sign-In OAuth)'
            : 'Authorized Firebase Authentication Domains (Google Sign-In OAuth)'}
        </h3>
        <div className="flex flex-wrap gap-2">
          {data.authorizedAuthDomains.map((dom) => (
            <span
              key={dom}
              className="rounded border border-border bg-surface px-2.5 py-1 font-mono text-xs text-foreground"
            >
              {dom}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 border-t border-border pt-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="custom-domain-input" className="text-xs font-medium text-muted">
              {isFr ? 'Domaine personnalisé cible' : 'Target custom domain'}
            </label>
            <Input
              id="custom-domain-input"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              className="w-64 font-mono text-sm"
            />
          </div>
          <Button
            type="button"
            disabled={verifyMutation.isPending}
            onClick={() => verifyMutation.mutate(domainInput)}
          >
            {verifyMutation.isPending
              ? isFr
                ? 'Vérification en cours…'
                : 'Verifying…'
              : isFr
                ? 'Vérifier la configuration DNS & Firestore'
                : 'Verify DNS & Firestore Configuration'}
          </Button>
        </div>

        <div className="flex flex-col items-end gap-1 text-xs text-muted">
          {verifyMutation.isSuccess ? (
            <p role="status" className="font-medium text-success">
              {isFr
                ? `Domaine ${verifyMutation.data.customDomain} vérifié et synchronisé avec Firestore (${verifyMutation.data.collectionsSynced} collections actives).`
                : `Domain ${verifyMutation.data.customDomain} verified and synced with Firestore (${verifyMutation.data.collectionsSynced} active collections).`}
            </p>
          ) : null}
          <span>
            {isFr ? 'Dernière vérification : ' : 'Last verified: '}
            <span className="font-mono">{data.lastVerifiedAt.slice(0, 19).replace('T', ' ')} UTC</span>
          </span>
        </div>
      </div>
    </section>
  );
}
