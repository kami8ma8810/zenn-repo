// 第2章：基本的な値オブジェクト

// Email値オブジェクト
export class Email {
  private readonly value: string;
  
  constructor(value: string) {
    if (!this.isValid(value)) {
      throw new Error(`不正なメールアドレス: ${value}`);
    }
    this.value = value.toLowerCase();
  }
  
  private isValid(value: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value);
  }
  
  toString(): string {
    return this.value;
  }
  
  equals(other: Email): boolean {
    return this.value === other.value;
  }
}

// PostContent値オブジェクト
export class PostContent {
  constructor(
    readonly text: string,
    readonly imageUrl: string | null
  ) {
    const trimmedText = text.trim();
    
    if (trimmedText.length === 0 && !imageUrl) {
      throw new Error('投稿には本文または画像が必要です');
    }
    
    if (trimmedText.length > 300) {
      throw new Error('投稿は300文字以内にしてください');
    }
    
    this.text = trimmedText;
  }
  
  equals(other: PostContent): boolean {
    return this.text === other.text && 
           this.imageUrl === other.imageUrl;
  }
}