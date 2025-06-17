import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'js-zip';

export async function POST(request: NextRequest) {
  try {
    const { images } = await request.json();
    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'Images array is required' }, { status: 400 });
    }

    const zip = new JSZip();
    const downloadPromises = images.map(async (image) => {
      try {
        const response = await fetch(image.url);
        if (!response.ok) throw new Error(`Failed to fetch ${image.url}`);
        const blob = await response.blob();
        zip.file(image.filename, blob);
      } catch (error) {
        console.error(`Failed to download ${image.url}:`, error);
      }
    });

    await Promise.all(downloadPromises);
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    return new NextResponse(zipBlob, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="images.zip"',
      },
    });
  } catch (error) {
    console.error('Download failed:', error);
    return NextResponse.json({ error: 'Failed to create zip file' }, { status: 500 });
  }
} 