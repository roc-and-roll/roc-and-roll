import { encode } from "blurhash";
import { spawn } from "child_process";
import fileType from "file-type";
import sharp from "sharp";
import { clamp } from "../shared/util";

export async function getMimeType(path: string) {
  return (await fileType.fromFile(path))?.mime;
}

export async function assertFFprobeIsInstalled() {
  try {
    await execute("ffprobe", ["-version"]);
  } catch (err) {
    console.error(
      "It looks like `ffprobe`, which is needed to measure the length of audio files, is not currently installed on this machine. `ffprobe` is part of `ffmpeg` and can likely be installed by running `sudo apt install ffmpeg`."
    );
    throw err;
  }
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

    let result = "";
    childProcess.stdout.on(
      "data",
      (data: Buffer) => (result += data.toString("utf-8"))
    );

    childProcess.stderr.on("data", (data: Buffer) =>
      console.error(data.toString("utf-8"))
    );

    childProcess.on("error", (err) => reject(err));

    childProcess.on("close", (code) => {
      if (code === 0) {
        resolve(result);
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

export async function calculateBlurhash(filePath: string) {
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
    console.error(`Could not calculate blurhash of ${filePath}`);
    console.error(err);
    throw err;
  }
}
