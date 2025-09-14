import { useState, FormEvent } from 'react';
import { CreatePost } from '@application/usecases/CreatePost';
import { FirestorePostRepository } from '@infrastructure/firebase/FirestorePostRepository';
import { FirebaseStorageAdapter } from '@infrastructure/firebase/FirebaseStorageAdapter';
import { useAuth } from '../auth/useAuth';

export function CreatePostForm() {
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('ログインが必要です');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const postRepository = new FirestorePostRepository();
      const storageAdapter = new FirebaseStorageAdapter();
      const createPost = new CreatePost(postRepository, storageAdapter);
      
      await createPost.execute({
        authorId: user.uid,
        text,
        imageFile
      });
      
      // フォームをクリア
      setText('');
      setImageFile(null);
      
      // ファイル入力もクリア
      const fileInput = document.getElementById('image-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '投稿に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 5MB以下のチェック
      if (file.size > 5 * 1024 * 1024) {
        setError('画像は5MB以下にしてください');
        return;
      }
      setImageFile(file);
      setError(null);
    }
  };

  return (
    <div className="create-post-form">
      <h3>新しい投稿</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="いま何してる？"
            maxLength={300}
            rows={4}
            disabled={isSubmitting}
          />
          <div className="char-count">{text.length} / 300</div>
        </div>
        
        <div className="form-group">
          <input
            id="image-input"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            disabled={isSubmitting}
          />
          {imageFile && (
            <div className="image-preview">
              選択中: {imageFile.name}
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  const fileInput = document.getElementById('image-input') as HTMLInputElement;
                  if (fileInput) fileInput.value = '';
                }}
              >
                削除
              </button>
            </div>
          )}
        </div>
        
        {error && <div className="error">{error}</div>}
        
        <button
          type="submit"
          disabled={!user || isSubmitting || (!text.trim() && !imageFile)}
        >
          {isSubmitting ? '投稿中...' : '投稿する'}
        </button>
      </form>
    </div>
  );
}