import { useCallback, useState } from "react";
import { AllowedFileTypes, AllowedFileTypesToObject } from "../shared/files";
import { RRAsset, RRCharacter, RRFileImage } from "../shared/state";
import { fittingTokenSize } from "../shared/util";

export function fileUrl(file: RRFileImage) {
  return _fileUrl(file.filename);
}

function _fileUrl(filename: string) {
  return `/api/files/${encodeURIComponent(filename)}`;
}

export function assetUrl(a: RRAsset) {
  return a.external ? a.filenameOrUrl : _fileUrl(a.filenameOrUrl);
}

export function tokenImageUrl(
  token: {
    tokenImage: NonNullable<RRCharacter["tokenImage"]>;
    tokenBorderColor: RRCharacter["tokenBorderColor"];
  },
  size: number
) {
  return `/api/token-image/${encodeURIComponent(
    token.tokenImage.filename
  )}/${encodeURIComponent(
    fittingTokenSize(size)
  )}?borderColor=${encodeURIComponent(token.tokenBorderColor)}`;
}

export async function generateRandomToken(): Promise<RRFileImage> {
  const result = await fetch(`/api/random-token`, {
    method: "POST",
  });

  if (result.status === 200) {
    return (await result.json()) as RRFileImage;
  }
  throw new Error("something went wrong");
}

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(
    async <T extends AllowedFileTypes>(
      fileList: FileList | null | undefined,
      allowedFileTypes: T
    ): Promise<Array<AllowedFileTypesToObject<T>>> => {
      setIsUploading(true);

      try {
        if (fileList === null || fileList === undefined) {
          return [];
        }
        return await uploadFiles(fileList, allowedFileTypes);
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  return [isUploading, upload] as const;
}

export async function askAndUploadImages(
  multiple: boolean = false
): Promise<RRFileImage[] | null> {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = multiple;

  const fileList = await new Promise<FileList | null>((resolve) => {
    input.addEventListener("change", (e) => {
      resolve(input.files);
    });
    input.click();
  });

  if (fileList === null) {
    return null;
  }

  return uploadFiles(fileList, "image");
}

const fileListToArray = (fileList: FileList) => {
  const files: File[] = [];
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList.item(i);
    if (file) {
      files.push(file);
    }
  }

  return files;
};

export async function uploadFiles<T extends AllowedFileTypes>(
  fileList: FileList | File[],
  allowedFileTypes: T
): Promise<Array<AllowedFileTypesToObject<T>>> {
  const files =
    fileList instanceof FileList ? fileListToArray(fileList) : fileList;
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  formData.set("allowedFileTypes", allowedFileTypes);

  const result = await fetch(`/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (result.status === 200) {
    return (await result.json()) as Array<AllowedFileTypesToObject<T>>;
  }
  console.error(result);
  throw new Error("something went wrong");
}
