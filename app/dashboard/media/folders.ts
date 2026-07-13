// โฟลเดอร์มาตรฐานของ Media Library (§25.3)
export const MEDIA_FOLDERS = [
  { key: "court-images", label: "รูปสนาม" },
  { key: "branch-images", label: "รูปสาขา" },
  { key: "member-profiles", label: "รูปโปรไฟล์สมาชิก" },
  { key: "logo", label: "โลโก้" },
  { key: "slips", label: "สลิป" },
  { key: "receipts", label: "ใบเสร็จ" },
  { key: "documents", label: "เอกสาร" },
] as const;

export type MediaFolderKey = (typeof MEDIA_FOLDERS)[number]["key"];

export const MEDIA_BUCKET = "tenant-media";

export function isValidFolder(k: string): k is MediaFolderKey {
  return MEDIA_FOLDERS.some((f) => f.key === k);
}
