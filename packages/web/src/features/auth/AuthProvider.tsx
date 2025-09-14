import { createContext, useEffect, useState, type ReactNode } from 'react';
import { FirebaseAuthAdapter, type AuthUser } from '@infrastructure/index';
import { FirestoreUserRepository } from '@infrastructure/index';
import { User, UserId } from '@domain/index';

export interface AuthContextValue {
  user: AuthUser | null;
  domainUser: User | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [domainUser, setDomainUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const authAdapter = new FirebaseAuthAdapter();
  const userRepository = new FirestoreUserRepository();

  useEffect(() => {
    const unsubscribe = authAdapter.onAuthStateChanged(async (authUser) => {
      setUser(authUser);
      
      if (authUser) {
        // ドメインユーザーを取得または作成
        const userId = UserId(authUser.uid);
        let existingUser = await userRepository.findById(userId);
        
        if (!existingUser) {
          // 新規ユーザーの場合は作成
          const newUser = User.create({
            id: userId,
            displayName: authUser.displayName || 'Anonymous',
            photoURL: authUser.photoURL,
            email: authUser.email || '',
            now: new Date()
          });
          await userRepository.save(newUser);
          existingUser = newUser;
        }
        
        setDomainUser(existingUser);
      } else {
        setDomainUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      await authAdapter.signInWithGoogle();
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await authAdapter.signOut();
      setUser(null);
      setDomainUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, domainUser, signInWithGoogle, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
}