/**
 * firebase-config.js
 * 
 * Configuração do Firebase para o Sistema de Controle de Compras e Recebimento
 * Este arquivo é responsável por inicializar a conexão com o Firebase
 * 
 * Utilizado por:
 * - Todos os arquivos JS que precisam acessar o Firebase
 */

console.log('firebase-config.js carregado');

// Configuração do Firebase fornecida
const firebaseConfig = {
  apiKey: "AIzaSyC2Zi40wsyBoTeXb2syXvrogTb56lAVjk0",
  authDomain: "pcp-2e388.firebaseapp.com",
  databaseURL: "https://pcp-2e388-default-rtdb.firebaseio.com",
  projectId: "pcp-2e388",
  storageBucket: "pcp-2e388.firebasestorage.app",
  messagingSenderId: "725540904176",
  appId: "1:725540904176:web:5b60009763c36bb12d7635",
  measurementId: "G-G4S09PBEFB"
};

try {
  console.log('Inicializando Firebase...');
  
  // Inicializar o Firebase
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase inicializado com sucesso');
  } else {
    console.log('Firebase já estava inicializado');
  }
  
  // Referência ao banco de dados
  const database = firebase.database();
  console.log('Referência ao banco de dados criada');
  
  // Exportar as referências para uso em outros arquivos
  // Usando window para garantir escopo global
  window.dbRef = {
    clientes: database.ref('clientes'),
    projetos: database.ref('projetos')
  };
  
  console.log('dbRef criado e disponível globalmente:', window.dbRef);
  
  // Teste de acesso direto aos clientes
  database.ref('clientes').once('value')
    .then(snapshot => {
      console.log('Teste de acesso aos clientes:', snapshot.exists(), snapshot.val() ? Object.keys(snapshot.val()).length : 0);
    })
    .catch(error => {
      console.error('Erro no teste de acesso aos clientes:', error);
    });
  
  // Variável para controlar o estado de conexão
  let conexaoEstabelecida = false;
  
  // Teste de conexão com tratamento melhorado
  database.ref('.info/connected').on('value', function(snap) {
    if (snap.val() === true) {
      console.log('Conectado ao Firebase com sucesso');
      conexaoEstabelecida = true;
    } else {
      // Só exibe mensagem de desconexão se já esteve conectado anteriormente
      // Isso evita mensagens de desconexão durante a inicialização
      if (conexaoEstabelecida) {
        console.warn('Desconexão temporária do Firebase - tentando reconectar...');
      } else {
        console.log('Estabelecendo conexão inicial com Firebase...');
      }
    }
  });
  
  // Adiciona um listener para quando a página for fechada ou recarregada
  window.addEventListener('beforeunload', function() {
    // Desconecta do Firebase de forma limpa
    database.goOffline();
    console.log('Desconexão limpa do Firebase realizada');
  });
  
} catch (error) {
  console.error('Erro ao inicializar Firebase:', error);
  alert('Erro ao conectar ao banco de dados. Por favor, recarregue a página.');
}
