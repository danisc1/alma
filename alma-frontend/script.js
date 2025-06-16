const API_URL = 'http://localhost:3000'; // ajuste para seu backend

function pegarToken() {
  return localStorage.getItem('token');
}

function protegerPagina() {
  const token = pegarToken();
  if (!token) {
    window.location.href = 'login.html';
  }
}

// Busca histórico de humor do paciente por id
async function buscarHistoricoHumorPaciente(pacienteId) {
  try {
    protegerPagina();

    const token = pegarToken();
    const res = await fetch(`${API_URL}/humor/paciente/${pacienteId}`, {
      headers: { Authorization: 'Bearer ' + token }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || 'Erro ao buscar histórico do paciente');

    return { sucesso: true, historico: data };
  } catch (e) {
    return { sucesso: false, erro: e.message };
  }
}

// Exemplo de uso
(async () => {
  const resultado = await buscarHistoricoHumorPaciente(2); // Id do paciente
  if (resultado.sucesso) {
    console.log('Histórico do paciente:', resultado.historico);
    // aqui você pode chamar a função para montar o gráfico com os dados
  } else {
    console.error('Erro:', resultado.erro);
  }
})();
