import type { RRFile, RRFileImage, RRFileAudio } from "./state";
import * as z from "zod";

export const isAllowedFiletypes = z.enum(["all", "audio", "image"]);

export type AllowedFileTypes = z.infer<typeof isAllowedFiletypes>;

export type AllowedFileTypesToObject<T extends AllowedFileTypes> =
  T extends "all"
    ? RRFile
    : T extends "image"
    ? RRFileImage
    : T extends "audio"
    ? RRFileAudio
    : never;
