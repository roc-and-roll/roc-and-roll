import type { RRFile, RRFileImage, RRFileAudio } from "./state";
import * as t from "typanion";

export const isAllowedFiletypes = t.isEnum(["all", "audio", "image"]);

export type AllowedFileTypes = t.InferType<typeof isAllowedFiletypes>;

export type AllowedFileTypesToObject<T extends AllowedFileTypes> =
  T extends "all"
    ? RRFile
    : T extends "image"
    ? RRFileImage
    : T extends "audio"
    ? RRFileAudio
    : never;
