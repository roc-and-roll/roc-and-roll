import { encode } from "blurhash";
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

export async function assertFFmpegIsInstalled() {
  let _version;
  try {
    _version = await execute("ffmpeg", ["-version"]);
  } catch (err) {
    console.error(
      "It looks like `ffmpeg`, which is needed to normalize the loudness of audio files, is not currently installed on this machine. It can likely be installed by running `sudo apt install ffmpeg`."
    );
    throw err;
  }

  // TODO: Should we require a specific version?
  // if (!version.startsWith("ffmpeg version 4.")) {
  //   throw new Error(
  //     `ffmpeg is installed, but has the wrong version. Please install version 4.x (got ${version}).`
  //   );
  // }
}

export async function assertFFmpegNormalizeIsInstalled() {
  let version;
  try {
    version = await execute("ffmpeg-normalize", ["--version"]);
  } catch (err) {
    console.error(
      "It looks like `ffmpeg-normalize` (https://github.com/slhck/ffmpeg-normalize), which is needed to normalize the loudness of audio files, is not currently installed on this machine. It can be installed by running `pip3 install ffmpeg-normalize`."
    );
    throw err;
  }

  if (!version.startsWith("ffmpeg-normalize v1.")) {
    throw new Error(
      `ffmpeg-normalize is installed, but has the wrong version. Please install version v1.x (got ${version}).`
    );
  }
}

export async function normalizeLoudnessAndConvertToMP3(
  inputPath: string,
  outputPath: string
) {
  if (!outputPath.endsWith(".mp3")) {
    throw new Error(`The output path must end with .mp3, got: ${outputPath}`);
  }

  await execute("ffmpeg-normalize", [
    inputPath,
    "-c:a",
    "libmp3lame",
    "-ar",
    "44100",
    "-f",
    "-o",
    outputPath,
  ]);
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

export function isMimeTypeImage(mimeType: MimeType) {
  return mimeType.startsWith("image/");
}

export function isMimeTypeAudio(mimeType: MimeType) {
  return mimeType.startsWith("audio/");
}

export function isMimeTypeVideo(mimeType: MimeType) {
  return mimeType.startsWith("video/");
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
