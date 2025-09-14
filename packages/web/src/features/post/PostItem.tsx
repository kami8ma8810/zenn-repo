import { useState } from 'react';
import { Post } from '@domain/post/Post';
import { ToggleLike } from '@application/usecases/ToggleLike';
import { FirestorePostRepository } from '@infrastructure/firebase/FirestorePostRepository';
import { FirestoreLikeRepository } from '@infrastructure/firebase/FirestoreLikeRepository';
import { useAuth } from '../auth/useAuth';

interface PostItemProps {
  post: Post;
  onLike?: (postId: string) => Promise<void>;
}

export function PostItem({ post, onLike }: PostItemProps) {
  const [isLiking, setIsLiking] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const { user } = useAuth();

  const handleLike = async () => {
    if (!user || isLiking) return;
    
    setIsLiking(true);
    
    try {
      const postRepository = new FirestorePostRepository();
      const likeRepository = new FirestoreLikeRepository();
      const toggleLike = new ToggleLike(postRepository, likeRepository);
      
      const result = await toggleLike.execute({
        userId: user.uid,
        postId: post.id as string
      });
      
      // いいね数を更新
      setLikeCount(prev => result.liked ? prev + 1 : Math.max(0, prev - 1));
      
      if (onLike) {
        await onLike(post.id as string);
      }
    } catch (error) {
      console.error('いいねの切り替えに失敗しました:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'たった今';
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;
    
    return date.toLocaleDateString('ja-JP');
  };

  return (
    <article className="post-item">
      <div className="post-header">
        <span className="post-author">@{post.authorId}</span>
        <time className="post-time">{formatDate(post.createdAt)}</time>
      </div>
      
      {post.text && (
        <div className="post-content">
          <p>{post.text}</p>
        </div>
      )}
      
      {post.imageUrl && (
        <div className="post-image">
          <img src={post.imageUrl} alt="投稿画像" loading="lazy" />
        </div>
      )}
      
      <div className="post-actions">
        <button
          className={`like-button ${isLiking ? 'liking' : ''}`}
          onClick={handleLike}
          disabled={!user || isLiking}
        >
          <span className="like-icon">♡</span>
          <span className="like-count">{likeCount}</span>
        </button>
      </div>
    </article>
  );
}