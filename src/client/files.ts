import { useCallback, useState } from "react";
import { RRFile } from "../shared/state";
import { apiHost } from "./util";

export function fileUrl(file: RRFile) {
  return `${apiHost()}/files/${encodeURIComponent(file.filename)}`;
}

export function tokenImageUrl(file: RRFile, size: number, zoom: number = 1) {
  return `${apiHost()}/token-image/${encodeURIComponent(
    file.filename
  )}/${encodeURIComponent(size)}/${encodeURIComponent(zoom)}`;
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

export async function askAndUploadFiles(multiple: boolean = false) {
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
  return uploadFiles(fileList);
}

async function uploadFiles(fileList: FileList) {
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
