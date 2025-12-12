// ====================================================================
// CONFIGURAÇÃO: COLOQUE A URL DO SEU APPS SCRIPT AQUI
// ====================================================================
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbz4REQwilJ_PUyPvU7LaKwHRQ-H9uxO1GwZQiGTp2AXFKstcY7WhwP63Y9Ts9rWYO_2/exec'; 
// Exemplo: 'https://script.google.com/macros/s/AKfyc.../exec'

// ====================================================================
// FUNÇÕES AUXILIARES DE INTERFACE
// ====================================================================

function mudarParaLogin(){
    document.getElementById("login").classList.remove("sumir");
    document.getElementById("cadastrar").classList.add("sumir");
    esconderAlerta();
}

function mudarParaCadastro(){
    document.getElementById("login").classList.add("sumir");
    document.getElementById("cadastrar").classList.remove("sumir");
    esconderAlerta();
}

function exibirAlerta(mensagem, tipo) {
    const alerta = document.getElementById('alerta-mensagem');
    alerta.textContent = mensagem;
    alerta.className = '';
    alerta.classList.add(tipo === 'sucesso' ? 'alerta-sucesso' : 'alerta-erro');
    alerta.classList.remove('alerta-escondido');
}

function esconderAlerta() {
    document.getElementById('alerta-mensagem').classList.add('alerta-escondido');
}

// ====================================================================
// FUNÇÃO DE COMUNICAÇÃO COM A API APPS SCRIPT (fetch)
// ====================================================================

/**
 * Envia dados para o Apps Script usando a função doPost.
 * @param {string} action - Ação a ser executada ('cadastrar' ou 'login').
 * @param {object} payload - Os dados a serem enviados.
 */
async function sendDataToAppsScript(action, payload) {
    if (WEB_APP_URL.includes('COLE A URL')) {
        return { sucesso: false, mensagem: "ERRO: Insira a URL do Apps Script na constante WEB_APP_URL." };
    }
    
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'cors', // Necessário para desenvolvimento local
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action, payload }) 
        });
        
        if (!response.ok) {
            // Se a resposta HTTP não for 200 (OK), houve um erro na requisição
            throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`);
        }
        
        // O Apps Script retorna JSON
        return await response.json();

    } catch (error) {
        console.error("Erro na comunicação com o Apps Script:", error);
        // Este é o erro que o CORS causava (ou um erro de rede real)
        return { sucesso: false, mensagem: `Erro de rede ou API: ${error.message}. Se estiver no VS Code, verifique as configurações de CORS.` };
    }
}

// ====================================================================
// FUNÇÕES DE EVENTO (HANDLE LOGIN E CADASTRO)
// ====================================================================

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
        exibirAlerta(`Sucesso! ${resultado.mensagem}`, 'sucesso');
        // Limpa e muda para login
        document.getElementById('cadastro-nome').value = '';
        document.getElementById('cadastro-email').value = '';
        document.getElementById('cadastro-senha').value = '';
        document.getElementById('cadastro-confirma-senha').value = '';
        document.getElementById('cadastro-nivel').value = ''; 
        mudarParaLogin();
    } else {
        exibirAlerta(resultado.mensagem, 'erro');
    }
}

// ====================================================================
// INICIALIZAÇÃO
// ====================================================================

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-login').addEventListener('click', handleLogin);
    document.getElementById('btn-cadastro').addEventListener('click', handleCadastro);
    
    // Função para alternar visibilidade da senha
    const toggleSenha = (inputId, buttonId) => {
        const input = document.getElementById(inputId);
        const button = document.getElementById(buttonId);
        
        button.addEventListener('click', () => {
            if (input.type === 'password') {
                input.type = 'text';
                button.textContent = '🔒';
            } else {
                input.type = 'password';
                button.textContent = '👁';
            }
        });
    };

    toggleSenha('login-senha', 'toggle-login-senha');
    toggleSenha('cadastro-senha', 'toggle-cad-senha');
    toggleSenha('cadastro-confirma-senha', 'toggle-cad-confirma');
});