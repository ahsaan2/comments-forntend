export interface Author {
  id: number;
  name: string;
  avatar?: string;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: Author;
  canEdit: boolean;
  canDelete: boolean;
}

export interface Comment {
  id: number;
  postId: number;
  parentId: number | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: Author;
  canEdit: boolean;
  canDelete: boolean;
  children?: Comment[];
}