import { createHash, randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  DEMO_COOKIE,
  getDomainBundleForFirestore,
  handleMockApiRequest,
} from '@/lib/api/mock-api';
import {
  ensureFirestoreSeeded,
  persistDomainStateToFirestore,
} from '@/lib/firebase/firestore-store';
import { uploadBufferToFirebaseStorage } from '@/lib/firebase/storage-service';

function buildMinimalPdfBuffer(title: string, checksum: string): Buffer {
  const safeTitle = title.replace(/[()\\]/g, '');
  const content = [
    '%PDF-1.4',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    `4 0 obj << /Length 140 >> stream\nBT /F1 14 Tf 50 720 Td (Veris Assets - ${safeTitle}) Tj 0 -24 Td /F1 10 Tf (SHA-256: ${checksum.slice(0, 32)}...) Tj ET\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    'xref\n0 6\n0000000000 65535 f \ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n0\n%%EOF',
  ].join('\n');
  return Buffer.from(content, 'utf-8');
}

async function handle(request: NextRequest) {
  await ensureFirestoreSeeded(getDomainBundleForFirestore());

  const pathname = request.nextUrl.pathname;

  // Stream downloadable document content for GET /api/v1/documents/download?token=...
  if (request.method === 'GET' && pathname === '/api/v1/documents/download') {
    const token = request.nextUrl.searchParams.get('token') ?? '';
    const docId = token.split(':')[0] ?? '';
    const bundle = getDomainBundleForFirestore();
    const docRecord = bundle.documents.find((d) => d.id === docId) as
      | {
          id: string;
          name?: string;
          current?: {
            fileName?: string;
            mimeType?: string;
            checksumSha256?: string;
          };
        }
      | undefined;

    const fileName = docRecord?.current?.fileName ?? 'Veris_Assets_Document.pdf';
    const mimeType = docRecord?.current?.mimeType ?? 'application/pdf';
    const checksum =
      docRecord?.current?.checksumSha256 ??
      createHash('sha256').update(fileName).digest('hex');
    const pdfBuffer = buildMinimalPdfBuffer(docRecord?.name ?? fileName, checksum);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${fileName.replace(/"/g, '')}"`,
        'X-Veris-Storage-Bucket': 'lyrical-responder-8v0ns.firebasestorage.app',
        'X-Veris-SHA256': checksum,
      },
    });
  }

  const cookieEmail = request.cookies.get(DEMO_COOKIE)?.value;
  let body: Record<string, unknown> | undefined;

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('multipart/form-data')) {
      try {
        const form = await request.formData();
        const parsed: Record<string, unknown> = {};
        for (const [key, value] of form.entries()) {
          if (typeof value === 'string') {
            parsed[key] = value;
          }
        }
        const fileEntry = form.get('file');
        if (fileEntry && typeof fileEntry === 'object' && 'arrayBuffer' in fileEntry) {
          const uploadedFile = fileEntry as File;
          const arrayBuffer = await uploadedFile.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuffer);
          const checksumSha256 = createHash('sha256').update(Buffer.from(uint8)).digest('hex');
          const documentId = randomUUID();
          const ownerType =
            typeof parsed.ownerType === 'string'
              ? parsed.ownerType
              : parsed.investorId
                ? 'INVESTOR'
                : parsed.issuanceId
                  ? 'ISSUANCE'
                  : 'TENANT';
          const confidentiality =
            typeof parsed.confidentiality === 'string'
              ? parsed.confidentiality
              : parsed.type === 'KYC_EVIDENCE'
                ? 'CONFIDENTIAL'
                : ownerType === 'TENANT'
                  ? 'INTERNAL'
                  : 'INVESTOR_VISIBLE';

          const storageMeta = await uploadBufferToFirebaseStorage({
            documentId,
            version: 1,
            fileName: uploadedFile.name || 'Document.pdf',
            mimeType: uploadedFile.type || 'application/pdf',
            bytes: uint8,
            checksumSha256,
            ownerType,
            confidentiality,
          });

          parsed.__uploadedFile = {
            documentId,
            fileName: uploadedFile.name || 'Document.pdf',
            mimeType: uploadedFile.type || 'application/pdf',
            sizeBytes: uploadedFile.size || uint8.byteLength || 1024,
            checksumSha256,
            ...storageMeta,
          };
        }
        body = parsed;
      } catch {
        body = {};
      }
    } else {
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        body = undefined;
      }
    }
  }

  const result = handleMockApiRequest(
    request.method,
    pathname,
    request.nextUrl.searchParams,
    cookieEmail ? decodeURIComponent(cookieEmail) : undefined,
    body,
  );
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    void persistDomainStateToFirestore(getDomainBundleForFirestore());
  }
  const response = NextResponse.json(result.body, { status: result.status });
  if (result.setCookie) {
    response.headers.set('Set-Cookie', result.setCookie);
  }
  return response;
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
