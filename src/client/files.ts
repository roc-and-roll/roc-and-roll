import { useCallback, useState } from "react";
import { RRAsset, RRFile, RRPoint } from "../shared/state";
import { fittingTokenSize } from "../shared/util";
import { apiHost } from "./util";

export function fileUrl(file: RRFile) {
  return _fileUrl(file.filename);
}

function _fileUrl(filename: string) {
  return `${apiHost()}/files/${encodeURIComponent(filename)}`;
}

export function assetUrl(a: RRAsset) {
  return a.external ? a.filenameOrUrl : _fileUrl(a.filenameOrUrl);
}

export function tokenImageUrl(file: RRFile, size: number) {
  return `${apiHost()}/token-image/${encodeURIComponent(
    file.filename
  )}/${encodeURIComponent(fittingTokenSize(size))}`;
}

export async function generateRandomToken(): Promise<RRFile> {
  const result = await fetch(`${apiHost()}/random-token`, {
    method: "POST",
  });

  if (result.status === 200) {
    return (await result.json()) as RRFile;
  }
  throw new Error("something went wrong");
}

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(async (fileList: FileList | null | undefined) => {
    setIsUploading(true);

    try {
      if (fileList === null || fileList === undefined) {
        return [];
      }
      return uploadFiles(fileList);
    } finally {
      setIsUploading(false);
    }
  }, []);

  return [isUploading, upload] as const;
}

export async function askAndUploadImages(
  multiple: boolean = false
): Promise<[RRFile, RRPoint][] | null> {
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

  const uploadedFiles = await uploadFiles(fileList);
  const sizes = await Promise.all(
    fileListToArray(fileList).map(
      (f) =>
        new Promise<RRPoint>((resolve) => {
          const url = URL.createObjectURL(f);
          const i = new Image();
          i.onload = () => {
            resolve({ x: i.width, y: i.height });
            URL.revokeObjectURL(url);
          };
          i.src = url;
        })
    )
  );

  return uploadedFiles.map((f, i) => [f, sizes[i]!]);
}

const fileListToArray = (fileList: FileList) => {
  const files: File[] = [];
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList.item(i);
    if (file) {
      files.push(file);
    }
  }

  if (files.length === 0) {
    return [];
  }

  return files;
};

async function uploadFiles(fileList: FileList) {
  const files = fileListToArray(fileList);
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const result = await fetch(`${apiHost()}/upload`, {
    method: "POST",
    body: formData,
  });

  if (result.status === 200) {
    return (await result.json()) as RRFile[];
  }
  throw new Error("something went wrong");
}
