import React, { useRef } from "react";
import { useState } from "react";
import { RRFile } from "../../shared/state";
import { fileUrl, useFileUpload } from "../files";

export function UploadFileExample() {
  const [files, setFiles] = useState<RRFile[]>([]);

  const fileInput = useRef<HTMLInputElement>(null);
  const [isUploading, upload] = useFileUpload();

  const doUpload = async () => {
    const uploadedFiles = await upload(fileInput.current?.files);
    setFiles((oldFiles) => [...oldFiles, ...uploadedFiles]);
  };

  return (
    <>
      <input type="file" multiple ref={fileInput} disabled={isUploading} />
      <button onClick={doUpload} disabled={isUploading}>
        upload
      </button>
      <ul>
        {files.map((file) => (
          <li key={file.filename}>
            {file.originalFilename}
            <br />
            <img src={fileUrl(file)} />
          </li>
        ))}
      </ul>
    </>
  );
}
