import path from "path";
import fs from "fs";
import { encode } from "blurhash"; //cspell: disable-line
import { spawn } from "child_process";
import fileType, { MimeType } from "file-type";
import sharp from "sharp";
import { clamp } from "../shared/util";

export async function getMimeType(path: string) {
  return (await fileType.fromFile(path))?.mime;
}

export async function assertFFprobeIsInstalled() {
  let _version;
  try {
    _version = await execute("ffprobe", ["-version"]);
  } catch (err) {
    console.error(
      "It looks like `ffprobe`, which is needed to measure the length of audio files, is not currently installed on this machine. `ffprobe` is part of `ffmpeg` and can likely be installed by running `sudo apt install ffmpeg`."
    );
    throw err;
  }

  // TODO: Should we require a specific version?
  // if (!version.startsWith("ffprobe version 4.")) {
  //   throw new Error(
  //     `ffprobe is installed, but has the wrong version. Please install version 4.x (got ${version}).`
  //   );
  // }
}

export async function getAudioDuration(path: string) {
  const result = await execute("ffprobe", [
    "-i",
    path,
    "-show_entries",
    "format=duration",
    "-v",
    "quiet",
    "-of",
    "csv=p=0",
  ]);

  const duration = parseFloat(result.trim()) * 1000;
  if (duration <= 0 || isNaN(duration) || duration === Infinity) {
    throw new Error(`The measured duration was invalid (${duration})`);
  }
  return duration;
}

async function execute(command: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const childProcess = spawn(command, args);

    const result: Buffer[] = [];
    childProcess.stdout.on("data", (data: Buffer | string) =>
      result.push(Buffer.from(data))
    );

    childProcess.stderr.on("data", (data: Buffer | string) =>
      console.error(Buffer.from(data).toString("utf-8"))
    );

    childProcess.on("error", (err) => reject(err));

    childProcess.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(result).toString("utf-8"));
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

export async function tileImage(
  uploadedFilesDir: string,
  uploadedFilesCacheDir: string,
  fileName: string
) {
  const inputPath = path.join(uploadedFilesDir, fileName);
  const outputPath = path.join(uploadedFilesCacheDir, fileName);
  await sharp(inputPath)
    .toFormat("jpeg")
    .tile({ depth: "one" })
    .toFile(outputPath + ".dz");
  await fs.promises.rm(outputPath + ".dzi");
  await fs.promises.rename(outputPath + "_files", outputPath + "-tiles");
}

export function isMimeTypeImage(mimeType: MimeType) {
  return mimeType.startsWith("image/");
}

export function isMimeTypeAudio(mimeType: MimeType) {
  return mimeType.startsWith("audio/");
}

export function isMimeTypeVideo(mimeType: MimeType) {
  return mimeType.startsWith("video/");
}

export async function calculateBlurHash(filePath: string) {
  const { pixels, width, height } = await new Promise<{
    pixels: Buffer;
    width: number;
    height: number;
  }>((resolve, reject) => {
    sharp(filePath)
      .raw()
      .ensureAlpha()
      .resize(128, 128, { fit: "inside" })
      .toBuffer((err: Error | undefined, pixels, info) => {
        if (err) {
          reject(err);
        } else {
          resolve({ pixels, width: info.width, height: info.height });
        }
      });
  });

  const aspectRatio = width / height;

  try {
    return encode(
      new Uint8ClampedArray(pixels),
      width,
      height,
      clamp(1, Math.round(4 * aspectRatio), 9),
      clamp(1, Math.round(4 / aspectRatio), 9)
    );
  } catch (err) {
    console.error(`Could not calculate blurHash of ${filePath}`);
    console.error(err);
    throw err;
  }
}
