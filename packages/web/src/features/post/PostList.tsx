import { Post } from '@domain/post/Post';
import { PostItem } from './PostItem';

interface PostListProps {
  posts: Post[];
  onLike?: (postId: string) => Promise<void>;
}

export function PostList({ posts, onLike }: PostListProps) {
  if (posts.length === 0) {
    return (
      <div className="post-list-empty">
        <p>まだ投稿がありません</p>
      </div>
    );
  }

  return (
    <div className="post-list">
      {posts.map((post) => (
        <PostItem
          key={post.id as string}
          post={post}
          onLike={onLike}
        />
      ))}
    </div>
  );
}