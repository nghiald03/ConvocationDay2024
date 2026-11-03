export type MediaAsset = {
  id: string;
  originalName: string;
  path: string;
  /** Link ai cũng mở được; null nếu tệp không thuộc thư viện dùng chung. */
  publicUrl: string | null;
  size: number;
  mimeType: string;
  width: number;
  height: number;
  createdAt: string;
};

export type BulkDeleteMediaResult = {
  deleted: string[];
};
