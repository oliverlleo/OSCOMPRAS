/**
 * firebase-config.js
 * * Configuração do Firebase para o Sistema de Controle de Compras e Recebimento
 * Este arquivo é responsável por inicializar a conexão com o Firebase
 */

console.log('firebase-config.js carregado');

// Configuração do Firebase fornecida
const firebaseConfig = {
  apiKey: "AIzaSyC2Zi40wsyBoTeXb2syXvrogTb56lAVjk0", // Substitua pela sua API Key real, se diferente
  authDomain: "pcp-2e388.firebaseapp.com",
  databaseURL: "https://pcp-2e388-default-rtdb.firebaseio.com",
  projectId: "pcp-2e388",
  storageBucket: "pcp-2e388.appspot.com", // Corrigido de firebasestorage.app para appspot.com
  messagingSenderId: "725540904176",
  appId: "1:725540904176:web:5b60009763c36bb12d7635",
  measurementId: "G-G4S09PBEFB"
};

try {
  console.log('Inicializando Firebase...');
  
  // Inicializar o Firebase somente se ainda não foi inicializado
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase inicializado com sucesso');
  } else {
    firebase.app(); // Obter a instância padrão se já inicializada
    console.log('Firebase já estava inicializado.');
  }
  
  // Referência ao banco de dados
  const database = firebase.database();
  console.log('Referência ao banco de dados Firebase criada.');
  
  // Exportar as referências para uso em outros arquivos, garantindo que estejam no escopo global.
  // É crucial que window.dbRef seja definido aqui para que outros scripts possam acessá-lo.
  if (database) {
    window.dbRef = {
      clientes: database.ref('clientes'),
      projetos: database.ref('projetos')
      // Adicione outras referências globais conforme necessário
    };
    console.log('window.dbRef criado e disponível globalmente:', window.dbRef);
  } else {
    console.error('Falha ao obter referência do banco de dados Firebase.');
  }

  // Teste de conexão e acesso aos dados
  const connectedRef = database.ref(".info/connected");
  connectedRef.on("value", (snap) => {
    if (snap.val() === true) {
      console.log("Conectado ao Firebase Realtime Database.");
      // Testar leitura de 'clientes' após conectar
      if (window.dbRef && window.dbRef.clientes) {
        window.dbRef.clientes.once('value')
          .then(snapshot => {
            console.log('Teste de acesso aos clientes (após conexão):', snapshot.exists(), snapshot.val() ? Object.keys(snapshot.val()).length : 0, 'clientes.');
          })
          .catch(error => {
            console.error('Erro no teste de acesso aos clientes (após conexão):', error);
          });
      }
    } else {
      console.log("Desconectado do Firebase Realtime Database.");
    }
  });

} catch (error) {
  console.error('Erro crítico ao inicializar Firebase:', error);
  // Tentar mostrar uma notificação mais robusta se global.js já estiver carregado
  if (typeof mostrarNotificacao === 'function') {
    mostrarNotificacao('Erro crítico ao conectar ao banco de dados. Recarregue a página.', 'danger', 10000);
  } else {
    alert('Erro crítico ao conectar ao banco de dados. Por favor, recarregue a página.');
  }
}
