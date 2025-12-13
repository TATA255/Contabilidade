// =========================================================================
// CONFIGURAÇÃO DA APLICAÇÃO E VARIÁVEIS GLOBAIS
// =========================================================================

// 🛑 URL DA SUA API PRINCIPAL (LOGIN/CADASTRO/DADOS) - VERIFIQUE ESTA URL!
// Use A MESMA URL que você implementou no Apps Script.
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbz4REQwilJ_PUyPvU7LaKwHRQ-H9uxO1GwZQiGTp2AXFKstcY7WhwP63Y9Ts9rWYO_2/exec'; 

// VARIÁVEIS GLOBAIS (Elementos DOM)
const loginDiv = document.getElementById('login');
const cadastroDiv = document.getElementById('cadastrar');
const alertaElement = document.getElementById('alerta-mensagem');
const loginBtn = document.getElementById('btn-login');
const cadastroBtn = document.getElementById('btn-cadastro');

// Variáveis de estado
let loggedInUserEmail = ''; // Mantenha isso para controle de sessão/dados

// =========================================================================
// FUNÇÕES DE UTILIDADE E UI
// =========================================================================

function mudarParaLogin(){
    if (loginDiv) loginDiv.classList.remove("sumir");
    if (cadastroDiv) cadastroDiv.classList.add("sumir");
    esconderAlerta();
}

function mudarParaCadastro(){
    if (loginDiv) loginDiv.classList.add("sumir");
    if (cadastroDiv) cadastroDiv.classList.remove("sumir");
    esconderAlerta();
}

function exibirAlerta(mensagem, tipo) {
    if (!alertaElement) return;

    alertaElement.textContent = mensagem;
    // Classes de estilo (você deve definir 'alerta-sucesso', 'alerta-erro', 'alerta-info', 'alerta-escondido' no seu CSS)
    alertaElement.className = ''; 
    alertaElement.classList.add(tipo === 'sucesso' ? 'alerta-sucesso' : 
                                tipo === 'erro' ? 'alerta-erro' : 
                                'alerta-info');
    alertaElement.classList.remove('alerta-escondido');
}

function esconderAlerta() {
    if (alertaElement) alertaElement.classList.add('alerta-escondido');
}

// Função para alternar visibilidade da senha (exemplo, requer os IDs 'toggle-...')
function setupToggleSenha(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    
    if (input && button) {
        button.addEventListener('click', () => {
            if (input.type === 'password') {
                input.type = 'text';
                button.textContent = '🔒'; 
            } else {
                input.type = 'password';
                button.textContent = '👁'; 
            }
        });
    }
}


// =========================================================================
// FUNÇÃO DE COMUNICAÇÃO UNIFICADA (fetch com FormData - ANTI-CORS)
// =========================================================================

async function sendDataToAppsScript(action, payload) {
    if (WEB_APP_URL.includes('COLE A URL')) {
        return { sucesso: false, mensagem: "ERRO CRÍTICO: Insira a URL do Apps Script na constante WEB_APP_URL." };
    }
    
    const formData = new FormData();
    formData.append('action', action); 

    for (const key in payload) {
        if (Object.hasOwnProperty.call(payload, key)) {
             formData.append(key, payload[key]);
        }
    }
    
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: formData, 
            // O modo 'cors' é implícito aqui, mas o FormData garante que seja uma requisição "simples"
        });
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`);
        }
        
        // A API Apps Script sempre retorna um JSON
        return await response.json();

    } catch (error) {
        console.error("Erro na comunicação com o Apps Script:", error);
        return { sucesso: false, mensagem: `Erro de rede ou API: ${error.message}` };
    }
}

// =========================================================================
// FUNÇÕES DE EVENTO (HANDLE LOGIN E CADASTRO)
// =========================================================================

async function handleLogin() {
    esconderAlerta();
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;

    if (!email || !senha) {
        return exibirAlerta('Preencha e-mail e senha para login.', 'erro');
    }

    exibirAlerta('Verificando credenciais...', 'alerta-info');
    
    const payload = { email, senha }; 
    const resultado = await sendDataToAppsScript('login', payload); 

    if (resultado.sucesso) {
        exibirAlerta(`Login efetuado! Bem-vindo(a), ${resultado.nome}. Nível: ${resultado.nivel}`, 'sucesso');
        // Ação pós-login (Ex: Armazenar token, redirecionar para dashboard)
        loggedInUserEmail = email; 
        console.log("Usuário logado:", loggedInUserEmail);
        // Exemplo: window.location.href = 'dashboard.html';
    } else {
        exibirAlerta(resultado.mensagem, 'erro');
    }
}

async function handleCadastro() {
    esconderAlerta();
    const nome = document.getElementById('cadastro-nome').value;
    const email = document.getElementById('cadastro-email').value;
    const senha = document.getElementById('cadastro-senha').value;
    const confirmaSenha = document.getElementById('cadastro-confirma-senha').value;
    const nivel = document.getElementById('cadastro-nivel').value;

    if (!nome || !email || !senha || !confirmaSenha || !nivel) {
        return exibirAlerta('Preencha todos os campos do cadastro.', 'erro');
    }
    
    if (senha !== confirmaSenha) {
        return exibirAlerta('A senha e a confirmação de senha não coincidem.', 'erro');
    }

    exibirAlerta('Enviando dados para cadastro...', 'alerta-info');

    const payload = { nome, email, senha, nivel }; 
    const resultado = await sendDataToAppsScript('cadastrar', payload); 

    if (resultado.sucesso) {
        exibirAlerta(`Sucesso! ${resultado.mensagem}. Faça login para continuar.`, 'sucesso');
        
        // Limpa e muda para login
        document.getElementById('cadastro-nome').value = '';
        document.getElementById('cadastro-email').value = '';
        document.getElementById('cadastro-senha').value = '';
        document.getElementById('cadastro-confirma-senha').value = '';
        mudarParaLogin();
    } else {
        exibirAlerta(resultado.mensagem, 'erro');
    }
}


// =========================================================================
// INICIALIZAÇÃO
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Liga os botões
    if (loginBtn) loginBtn.addEventListener('click', handleLogin);
    if (cadastroBtn) cadastroBtn.addEventListener('click', handleCadastro);
    
    // Liga os toggles de senha (se existirem no seu HTML)
    setupToggleSenha('login-senha', 'toggle-login-senha');
    setupToggleSenha('cadastro-senha', 'toggle-cad-senha');
    setupToggleSenha('cadastro-confirma-senha', 'toggle-cad-confirma');
    
    // Liga os botões de alternar entre login/cadastro
    document.getElementById('link-cadastro')?.addEventListener('click', mudarParaCadastro);
    document.getElementById('link-login')?.addEventListener('click', mudarParaLogin);

    // Garante que a tela de login/cadastro inicial correta esteja visível
    mudarParaLogin();
});