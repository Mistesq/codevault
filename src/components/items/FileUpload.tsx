"use client";

import { useRef, useState } from "react";
import { File as FileIcon, Loader2, UploadCloud, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/dashboard-data";
import {
  acceptAttribute,
  UPLOAD_CONSTRAINTS,
  validateUpload,
} from "@/lib/validations/file";
import type { UploadKind } from "@/lib/validations/file";

/** The uploaded file's stored metadata, lifted to the parent form. */
export interface UploadedFile {
  fileUrl: string;
  fileName: string;
  fileSize: number;
}

/**
 * Drag-and-drop file picker that uploads to /api/upload (via XHR for progress)
 * and reports the stored metadata to the parent. Shows an image preview for
 * images and a name/size row for files. Validates client-side first for fast
 * feedback (the server re-validates). One file at a time.
 */
export function FileUpload({
  kind,
  value,
  onChange,
  onUploadingChange,
}: {
  kind: UploadKind;
  value: UploadedFile | null;
  onChange: (value: UploadedFile | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Preview URL for the selected image (object URL until the upload returns).
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const constraints = UPLOAD_CONSTRAINTS[kind];

  function setUploadingState(next: boolean) {
    setUploading(next);
    onUploadingChange?.(next);
  }

  function startUpload(file: File) {
    setError(null);

    const result = validateUpload(kind, file.name, file.type, file.size);
    if (!result.ok) {
      setError(result.error ?? "Invalid file.");
      return;
    }

    if (kind === "image") {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
    }

    const formData = new FormData();
    formData.append("kind", kind);
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    setUploadingState(true);
    setProgress(0);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      setUploadingState(false);
      xhrRef.current = null;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as UploadedFile;
          onChange(data);
          // The stored public URL takes over the preview; drop the object URL.
          clearPreview();
        } catch {
          setError("Upload failed. Please try again.");
        }
      } else {
        let message = "Upload failed. Please try again.";
        try {
          const data = JSON.parse(xhr.responseText) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          // keep the default message
        }
        setError(message);
        clearPreview();
      }
    });

    xhr.addEventListener("error", () => {
      setUploadingState(false);
      xhrRef.current = null;
      setError("Upload failed. Please try again.");
      clearPreview();
    });

    xhr.open("POST", "/api/upload");
    xhr.send(formData);
  }

  function clearPreview() {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) startUpload(file);
  }

  function handleRemove() {
    xhrRef.current?.abort();
    xhrRef.current = null;
    setUploadingState(false);
    setProgress(0);
    setError(null);
    clearPreview();
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const displayUrl = value && kind === "image" ? value.fileUrl : previewUrl;

  // Uploaded state: show the preview/file info with a remove control.
  if (value && !uploading) {
    return (
      <div className="rounded-md border border-border p-3">
        <div className="flex items-center gap-3">
          {kind === "image" && displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayUrl}
              alt={value.fileName}
              className="size-14 shrink-0 rounded object-cover"
            />
          ) : (
            <span className="flex size-14 shrink-0 items-center justify-center rounded bg-muted">
              <FileIcon className="size-6 text-muted-foreground" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{value.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(value.fileSize)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Remove file"
            onClick={handleRemove}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!uploading) handleFiles(e.dataTransfer.files);
        }}
        disabled={uploading}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border p-6 text-center transition-colors",
          dragOver && "border-primary bg-primary/5",
          !uploading && "cursor-pointer hover:bg-accent/50",
          uploading && "cursor-default",
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <div className="w-full max-w-xs space-y-1.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Uploading… {progress}%
              </p>
            </div>
          </>
        ) : (
          <>
            <UploadCloud className="size-6 text-muted-foreground" />
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                Drop {kind === "image" ? "an image" : "a file"} here, or{" "}
                <span className="text-primary">browse</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {constraints.extensions.map((e) => `.${e}`).join(", ")} · up to{" "}
                {Math.round(constraints.maxSize / (1024 * 1024))} MB
              </p>
            </div>
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={acceptAttribute(kind)}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
