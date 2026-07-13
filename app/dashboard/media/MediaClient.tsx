"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Upload, Trash2, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MEDIA_FOLDERS, type MediaFolderKey } from "./folders";
import { uploadMedia, deleteMedia, type MediaState } from "./actions";

type MediaFile = {
  name: string;
  path: string;
  size: number;
  url: string | null;
};

function isImage(name: string): boolean {
  return /\.(jpe?g|png|webp|gif|svg)$/i.test(name);
}
function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function MediaClient({
  folder,
  files,
  usedBytes,
}: {
  folder: MediaFolderKey;
  files: MediaFile[];
  usedBytes: number;
}) {
  const [state, action, pending] = useActionState<MediaState, FormData>(
    uploadMedia,
    {},
  );

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-display-md font-semibold text-ink">
            คลังสื่อ
          </h1>
          <p className="text-body-sm text-ink-soft">
            ใช้พื้นที่ในหมวดนี้ {mb(usedBytes)} · {files.length} ไฟล์
          </p>
        </div>
      </div>

      {/* แท็บหมวด */}
      <div className="flex flex-wrap gap-2">
        {MEDIA_FOLDERS.map((f) => (
          <Link
            key={f.key}
            href={`/dashboard/media?folder=${f.key}`}
            className={
              f.key === folder
                ? "rounded-full bg-brand px-4 py-1.5 text-body-sm font-medium text-white"
                : "rounded-full bg-surface px-4 py-1.5 text-body-sm font-medium text-ink-soft shadow-sm hover:text-brand"
            }
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* อัปโหลด */}
      <form action={action} className="card-floating flex flex-wrap items-center gap-3 p-5">
        <input type="hidden" name="folder" value={folder} />
        <input
          type="file"
          name="file"
          required
          className="flex-1 text-body-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-brand-soft file:px-4 file:py-1.5 file:text-brand"
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <Upload aria-hidden className="h-4 w-4" />
          )}
          อัปโหลด
        </Button>
        {state.error && <p className="w-full text-body-sm text-danger">{state.error}</p>}
        {state.success && (
          <p className="w-full text-body-sm text-success">อัปโหลดสำเร็จ</p>
        )}
      </form>

      {/* รายการไฟล์ */}
      {files.length === 0 ? (
        <div className="card-floating p-8 text-center text-body-sm text-ink-soft">
          ยังไม่มีไฟล์ในหมวดนี้
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {files.map((f) => (
            <div key={f.path} className="card-floating flex flex-col gap-2 p-3">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-sm bg-brand-soft/40">
                {isImage(f.name) && f.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.url}
                    alt={f.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FileText aria-hidden className="h-10 w-10 text-ink-soft" />
                )}
              </div>
              <p className="truncate text-body-sm text-ink" title={f.name}>
                {f.name}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-mono-sm text-ink-soft">{mb(f.size)}</span>
                <form action={deleteMedia}>
                  <input type="hidden" name="path" value={f.path} />
                  <button
                    type="submit"
                    aria-label="ลบไฟล์"
                    className="rounded-full p-1.5 text-ink-soft transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 aria-hidden className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
