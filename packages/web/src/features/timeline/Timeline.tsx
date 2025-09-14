import { useState, useEffect } from 'react';
import { Post } from '@domain/post/Post';
import { GetTimeline } from '@application/usecases/GetTimeline';
import { FirestorePostRepository } from '@infrastructure/firebase/FirestorePostRepository';
import { FirestoreFollowRepository } from '@infrastructure/firebase/FirestoreFollowRepository';
import { PostList } from '../post/PostList';
import { useAuth } from '../auth/useAuth';

export function Timeline() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const loadTimeline = async () => {
    if (!user) {
      setPosts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const postRepository = new FirestorePostRepository();
      const followRepository = new FirestoreFollowRepository();
      const getTimeline = new GetTimeline(postRepository, followRepository);
      
      const result = await getTimeline.execute({
        userId: user.uid,
        limit: 50
      });
      
      setPosts(result.posts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'タイムラインの読み込みに失敗しました');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimeline();
  }, [user]);

  const handleRefresh = () => {
    loadTimeline();
  };

  if (loading) {
    return <div className="timeline-loading">読み込み中...</div>;
  }

  if (error) {
    return (
      <div className="timeline-error">
        <p>エラー: {error}</p>
        <button onClick={handleRefresh}>再読み込み</button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="timeline-login-required">
        <p>タイムラインを見るにはログインしてください</p>
      </div>
    );
  }

  return (
    <div className="timeline">
      <div className="timeline-header">
        <h2>タイムライン</h2>
        <button onClick={handleRefresh} className="refresh-button">
          更新
        </button>
      </div>
      <PostList posts={posts} />
    </div>
  );
}