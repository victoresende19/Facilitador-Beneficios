import React from "react";
import Chat from "./components/Chat";

export default function App() {
  return (
    <div className="app-root">
      <div className="app-shell">
        <header className="app-header">
          <div className="app-logo">🛡️</div>
          <div>
            <h1>Guardião dos Benefícios</h1>
            <p>Agente de IA para dúvidas e elegibilidade de benefícios CAIXA Futuro</p>
          </div>
        </header>

        <main className="app-main">
          <Chat />
        </main>

        <footer className="app-footer">
          <span>Agente “Facilitador Benefícios” · Victor Augusto Souza Resende</span>
        </footer>
      </div>
    </div>
  );
}
