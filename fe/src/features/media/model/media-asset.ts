export type MediaAsset = {
  id: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  width: number;
  height: number;
  createdAt: string;
};

export type BulkDeleteMediaResult = {
  deleted: string[];
};
