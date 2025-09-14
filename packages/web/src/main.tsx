import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// TODO: 第5章でアプリケーションを実装します
function App() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>DDD × Firebase × React SNS</h1>
      <p>各章のブランチに切り替えて学習を進めてください。</p>
      <ul>
        <li>chapter-1-domain-basics: ドメインモデルの基礎</li>
        <li>chapter-2-entities-vo: エンティティと値オブジェクト</li>
        <li>chapter-3-aggregates: 集約パターン</li>
        <li>chapter-4-repository: リポジトリパターン</li>
        <li>chapter-5-application-service: アプリケーションサービス</li>
        <li>chapter-6-strategic-design: 戦略的設計（完成版）</li>
      </ul>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);