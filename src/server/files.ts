import { spawn } from "child_process";
import fileType from "file-type";
import sharp from "sharp";

export async function getMimeType(path: string) {
  return (await fileType.fromFile(path))?.mime;
}

export async function getAudioDuration(path: string) {
  return new Promise<number>((resolve, reject) => {
    const ffprobe = spawn("ffprobe", [
      "-i",
      path,
      "-show_entries",
      "format=duration",
      "-v",
      "quiet",
      "-of",
      "csv=p=0",
    ]);

    let result = "";
    ffprobe.stdout.on(
      "data",
      (data: Buffer) => (result += data.toString("utf-8"))
    );

    ffprobe.stderr.on("data", (data: Buffer) =>
      console.error(data.toString("utf-8"))
    );

    ffprobe.on("error", (err) => reject(err));

    ffprobe.on("close", (code) => {
      if (code === 0) {
        resolve(parseFloat(result.trim()));
      } else {
        reject(code);
      }
    });
  });
}

export async function getImageDimensions(path: string) {
  const metadata = await sharp(path).metadata();

  if (metadata.width === undefined || metadata.height === undefined) {
    throw new Error(`Could not determine image dimensions of ${path}`);
  }

  return {
    width: metadata.width,
    height: metadata.height,
  };
}

export function isMimeTypeImage(mimeType: string) {
  return mimeType.startsWith("image/");
}

export function isMimeTypeAudio(mimeType: string) {
  return mimeType.startsWith("audio/");
}
