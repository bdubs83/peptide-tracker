import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

const blobToBase64 = async (blob: Blob) => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

const downloadBlobInBrowser = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export async function exportFile(filename: string, blob: Blob) {
  if (!Capacitor.isNativePlatform()) {
    downloadBlobInBrowser(filename, blob);
    return "Download started.";
  }

  const result = await Filesystem.writeFile({
    path: filename,
    data: await blobToBase64(blob),
    directory: Directory.Cache,
    recursive: true,
  });

  await Share.share({
    title: filename,
    text: filename,
    url: result.uri,
    dialogTitle: "Save or share file",
  });

  return "Save/share options opened.";
}

export function textToBlob(contents: string, mimeType: string) {
  return new Blob([contents], { type: mimeType });
}
