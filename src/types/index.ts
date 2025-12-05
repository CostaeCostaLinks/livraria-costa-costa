export interface Book {
  id: string;
  title: string;
  author: string;
  description: string | null;
  category: string;
  cover_url: string | null;
  file_url: string;
  file_type: 'pdf' | 'epub';
  created_at: string;
}

export interface ReadingProgress {
  id: string;
  user_id: string;
  book_id: string;
  progress: number;
  last_position: string | null;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  username: string | null;
  email: string;
  role: 'user' | 'admin';
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
}

export interface BookWithProgress extends Book {
  progress?: number;
  last_position?: string | null;
}
