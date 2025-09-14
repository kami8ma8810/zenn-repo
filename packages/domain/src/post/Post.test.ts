import { describe, it, expect } from 'vitest';
import { Post } from './Post';
import { PostId, UserId } from '../shared/ids';

describe('Post', () => {
  describe('create', () => {
    it('正常に投稿を作成できる', () => {
      const post = Post.create({
        id: PostId('post-1'),
        authorId: UserId('user-1'),
        text: 'テスト投稿',
        imageUrl: null,
        now: new Date('2024-01-01'),
      });

      expect(post.id).toBe('post-1');
      expect(post.authorId).toBe('user-1');
      expect(post.text).toBe('テスト投稿');
      expect(post.imageUrl).toBeNull();
      expect(post.likeCount).toBe(0);
    });

    it('テキストが空でも画像があれば投稿できる', () => {
      const post = Post.create({
        id: PostId('post-1'),
        authorId: UserId('user-1'),
        text: '',
        imageUrl: 'https://example.com/image.jpg',
        now: new Date('2024-01-01'),
      });

      expect(post.text).toBe('');
      expect(post.imageUrl).toBe('https://example.com/image.jpg');
    });

    it('テキストも画像もない場合はエラー', () => {
      expect(() => {
        Post.create({
          id: PostId('post-1'),
          authorId: UserId('user-1'),
          text: '',
          imageUrl: null,
          now: new Date('2024-01-01'),
        });
      }).toThrow('投稿内容または画像のどちらかは必須です');
    });

    it('300文字を超えるテキストはエラー', () => {
      const longText = 'あ'.repeat(301);
      
      expect(() => {
        Post.create({
          id: PostId('post-1'),
          authorId: UserId('user-1'),
          text: longText,
          imageUrl: null,
          now: new Date('2024-01-01'),
        });
      }).toThrow('本文は300文字以内にしてください');
    });
  });

  describe('edit', () => {
    it('作成者は投稿を編集できる', () => {
      const now = new Date('2024-01-01');
      const post = Post.create({
        id: PostId('post-1'),
        authorId: UserId('user-1'),
        text: '元のテキスト',
        imageUrl: null,
        now,
      });

      const editTime = new Date('2024-01-02');
      post.edit(UserId('user-1'), { text: '編集後のテキスト' }, editTime);

      expect(post.text).toBe('編集後のテキスト');
      expect(post.updatedAt).toEqual(editTime);
    });

    it('作成者以外は編集できない', () => {
      const post = Post.create({
        id: PostId('post-1'),
        authorId: UserId('user-1'),
        text: 'テスト',
        imageUrl: null,
        now: new Date('2024-01-01'),
      });

      expect(() => {
        post.edit(UserId('user-2'), { text: '編集' }, new Date());
      }).toThrow('投稿の編集は作成者のみ可能です');
    });
  });

  describe('applyLikeCountDelta', () => {
    it('いいね数を増やせる', () => {
      const post = Post.create({
        id: PostId('post-1'),
        authorId: UserId('user-1'),
        text: 'テスト',
        imageUrl: null,
        now: new Date('2024-01-01'),
      });

      post.applyLikeCountDelta(1);
      expect(post.likeCount).toBe(1);

      post.applyLikeCountDelta(1);
      expect(post.likeCount).toBe(2);
    });

    it('いいね数を減らせる', () => {
      const post = Post.reconstruct(
        PostId('post-1'),
        UserId('user-1'),
        'テスト',
        null,
        new Date('2024-01-01'),
        new Date('2024-01-01'),
        5
      );

      post.applyLikeCountDelta(-1);
      expect(post.likeCount).toBe(4);
    });

    it('いいね数は0未満にならない', () => {
      const post = Post.create({
        id: PostId('post-1'),
        authorId: UserId('user-1'),
        text: 'テスト',
        imageUrl: null,
        now: new Date('2024-01-01'),
      });

      post.applyLikeCountDelta(-1);
      expect(post.likeCount).toBe(0);
    });
  });
});