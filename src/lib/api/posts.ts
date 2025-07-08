import { Post } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const getPosts = async (): Promise<Post[]> => {
  const response = await fetch(`${API_URL}/posts`);
  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }
  return response.json();
};