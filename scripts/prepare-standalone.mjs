import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const webDir = path.join(rootDir, 'apps', 'web');
const webNextDir = path.join(webDir, '.next');
const webStandaloneDir = path.join(webNextDir, 'standalone');
const webStaticDir = path.join(webNextDir, 'static');
const webPublicDir = path.join(webDir, 'public');

const rootNextDir = path.join(rootDir, '.next');
const rootStandaloneDir = path.join(rootNextDir, 'standalone');
const rootStaticDir = path.join(rootNextDir, 'static');

if (!fs.existsSync(webStandaloneDir)) {
  console.error('Error: apps/web/.next/standalone does not exist. Did next build run with output: "standalone"?');
  process.exit(1);
}

// 1. Clean temporary caches in apps/web/.next to keep workspace size small (<250MB)
fs.rmSync(path.join(webNextDir, 'cache'), { recursive: true, force: true });
fs.rmSync(path.join(webNextDir, 'dev'), { recursive: true, force: true });

// 2. Prepare root .next directory expected by AI Studio control-plane-api
fs.rmSync(rootNextDir, { recursive: true, force: true });
fs.mkdirSync(rootNextDir, { recursive: true });

// Copy standalone (excluding .bun symlinked node_modules) and static to root .next/standalone and .next/static
fs.rmSync( path.join(webStandaloneDir, 'node_modules'), { recursive: true, force: true });
fs.rmSync( path.join(webStandaloneDir, 'apps', 'web', 'node_modules'), { recursive: true, force: true });
fs.cpSync(webStandaloneDir, rootStandaloneDir, { recursive: true });
fs.cpSync(webStaticDir, rootStaticDir, { recursive: true });

// 3. Also copy static and public into .next/standalone/apps/web/ where apps/web/server.js chdirs
const standaloneWebDir = path.join(rootStandaloneDir, 'apps', 'web');
fs.cpSync(webStaticDir, path.join(standaloneWebDir, '.next', 'static'), { recursive: true, dereference: true });
if (fs.existsSync(webPublicDir)) {
  fs.cpSync(webPublicDir, path.join(standaloneWebDir, 'public'), { recursive: true, dereference: true });
}

// 4. Copy firebase-applet-config.json into standalone root and standalone/apps/web
const firebaseConfigPath = path.join(rootDir, 'firebase-applet-config.json');
if (fs.existsSync(firebaseConfigPath)) {
  fs.copyFileSync(firebaseConfigPath, path.join(rootStandaloneDir, 'firebase-applet-config.json'));
  fs.copyFileSync(firebaseConfigPath, path.join(standaloneWebDir, 'firebase-applet-config.json'));
}

// 5. Simplify standalone/apps/web/package.json so npm in Cloud Run doesn't try to resolve workspace:* deps
const standaloneWebPkgPath = path.join(standaloneWebDir, 'package.json');
fs.writeFileSync(
  standaloneWebPkgPath,
  JSON.stringify(
    {
      name: '@veris/web',
      version: '0.0.0',
      private: true,
      type: 'module',
    },
    null,
    2,
  ) + '\n',
);

// 6. Create root server.js inside .next/standalone/server.js that launches ./apps/web/server.js
const rootServerJs = `process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0';
process.env.PORT = process.env.PORT || '8080';
await import('./apps/web/server.js');
`;
fs.writeFileSync(path.join(rootStandaloneDir, 'server.js'), rootServerJs, 'utf8');

// 7. Remove duplicate apps/web/.next/standalone to save disk space
fs.rmSync(webStandaloneDir, { recursive: true, force: true });

console.log('Prepared root .next/standalone and .next/static for Cloud Run deployment.');
