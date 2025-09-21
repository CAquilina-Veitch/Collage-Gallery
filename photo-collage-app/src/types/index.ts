export interface Album {
  id: string;
  name: string;
  createdAt: any;
  createdBy: string;
  sharedWith: string[];
}

export interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string;
  filename: string;
  uploadedBy: string;
  uploadedAt: any;
  inCollage: boolean;
}

export interface CollageItem {
  id: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  zIndex: number;
  mode: 'polaroid' | 'plain';
  captionText?: string;
}