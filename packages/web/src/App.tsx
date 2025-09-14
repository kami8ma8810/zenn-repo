import { AuthProvider, useAuth } from './features/auth/useAuth';
import { CreatePostForm } from './features/post/CreatePostForm';
import { Timeline } from './features/timeline/Timeline';
import { initializeFirebase } from '@infrastructure/firebase/config';
import './App.css';

// Firebase初期化
initializeFirebase();

function AppContent() {
  const { user, signInWithGoogle, signOut, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🌟 Mini SNS - DDD × Firebase</h1>
        <div className="auth-section">
          {user ? (
            <div className="user-info">
              <img 
                src={user.photoURL || '/default-avatar.png'} 
                alt={user.displayName || 'User'} 
                className="user-avatar"
              />
              <span className="user-name">{user.displayName || user.email}</span>
              <button onClick={signOut} className="sign-out-button">
                ログアウト
              </button>
            </div>
          ) : (
            <button onClick={signInWithGoogle} className="sign-in-button">
              Googleでログイン
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {user ? (
          <div className="content-grid">
            <section className="post-section">
              <CreatePostForm />
            </section>
            <section className="timeline-section">
              <Timeline />
            </section>
          </div>
        ) : (
          <div className="welcome-message">
            <h2>ようこそ！ 👋</h2>
            <p>DDDとFirebaseで作る小さなSNS</p>
            <p>ログインして始めましょう</p>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Built with DDD principles 🏗️ | Powered by Firebase 🔥</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;