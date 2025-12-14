// =========================================================================
// CONFIGURAÇÃO DA APLICAÇÃO E VARIÁVEIS GLOBAIS
// =========================================================================

// 🛑 COLOQUE A URL DA SUA IMPLEMENTAÇÃO DO APPS SCRIPT AQUI!
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbz4REQwilJ_PUyPvU7LaKwHRQ-H9uxO1GwZQiGTp2AXFKstcY7WhwP63Y9Ts9rWYO_2/exec'; 

// Variáveis DOM
const menuButtons = document.querySelectorAll('.links button');
const selectAutonomo = document.getElementById('select-autonomo');
const inputDataInicial = document.getElementById('input-data-inicial');
const inputDataFinal = document.getElementById('input-data-final');
const btnBuscarDados = document.getElementById('btn-buscar-dados');
const dadosResumoDiv = document.getElementById('dados-resumo-autonomo');
const tituloPeriodo = document.getElementById('titulo-periodo');
const btnVerDetalhes = document.getElementById('btn-ver-detalhes');
const alertaElement = document.getElementById('alerta-mensagem'); 

// =========================================================================
// FUNÇÕES DE UTILIDADE E UI
// =========================================================================

function exibirAlerta(mensagem, tipo) {
    if (alertaElement) {
        alertaElement.textContent = mensagem;
        alertaElement.className = `alerta-${tipo}`;
        alertaElement.style.display = 'block';
    }
}

function esconderAlerta() {
    if (alertaElement) {
        alertaElement.style.display = 'none';
    }
}

// =========================================================================
// FUNÇÃO DE COMUNICAÇÃO UNIFICADA (fetch com FormData - ANTI-CORS)
// =========================================================================

async function sendDataToAppsScript(action, payload) {
    if (WEB_APP_URL.includes('COLE A URL')) {
        exibirAlerta("ERRO CRÍTICO: Insira a URL do Apps Script na constante WEB_APP_URL.", 'erro');
        return { sucesso: false, mensagem: "URL da API não configurada." };
    }
    
    esconderAlerta();
    
    const formData = new FormData();
    formData.append('action', action); 

    for (const key in payload) {
        if (Object.hasOwnProperty.call(payload, key)) {
             formData.append(key, payload[key]);
        }
    }
    
    try {
        btnBuscarDados.textContent = 'Buscando...';
        btnBuscarDados.disabled = true;

        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: formData, 
        });
        
        btnBuscarDados.textContent = 'Buscar Dados';
        btnBuscarDados.disabled = false;

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();

    } catch (error) {
        btnBuscarDados.textContent = 'Buscar Dados';
        btnBuscarDados.disabled = false;
        console.error("Erro na comunicação com o Apps Script:", error);
        exibirAlerta(`Erro de rede ou API: ${error.message}`, 'erro');
        return { sucesso: false, mensagem: `Erro de rede ou API: ${error.message}` };
    }
}


// =========================================================================
// FUNÇÕES DE NAVEGAÇÃO E DADOS
// =========================================================================

/**
 * Alterna a visualização entre os painéis (AUTONOMOS, MEI, EMPRESAS)
 */
function alternarPainel(painelID) {
    document.querySelectorAll('.painel-conteudo').forEach(div => {
        div.classList.remove('ativo');
        div.style.display = 'none';
    });

    const painelAtivo = document.querySelector(`.painel-conteudo.${painelID}`);
    if (painelAtivo) {
        painelAtivo.classList.add('ativo');
        painelAtivo.style.display = 'block';
    }

    document.querySelectorAll('.links button').forEach(b => {
        b.classList.remove('active');
    });
    const botaoAtivo = document.querySelector(`.bto-${painelID.toLowerCase()}`);
    if (botaoAtivo) {
        botaoAtivo.classList.add('active');
    }
}

/**
 * Carrega a lista de nomes dos autônomos da planilha e preenche o SELECT.
 */
async function carregarListaAutonomos() {
    if (!selectAutonomo) return;

    selectAutonomo.innerHTML = '<option value="">Carregando clientes...</option>'; 

    const resultado = await sendDataToAppsScript('getAutonomosList', {}); 
    
    if (resultado.sucesso && resultado.nomes && resultado.nomes.length > 0) {
        selectAutonomo.innerHTML = '<option value="">-- Selecione um Cliente --</option>';
        resultado.nomes.forEach(nome => {
            const option = document.createElement('option');
            option.value = nome;
            option.textContent = nome;
            selectAutonomo.appendChild(option);
        });
        esconderAlerta();
    } else {
        selectAutonomo.innerHTML = '<option value="">Nenhum cliente encontrado</option>';
        exibirAlerta(resultado.mensagem, 'erro');
    }
}

/**
 * Busca dados detalhados quando o botão é clicado.
 */
async function buscarDadosAutonomo() {
    const nomeAutonomo = selectAutonomo ? selectAutonomo.value : null;
    const dataInicial = inputDataInicial ? inputDataInicial.value : null;
    const dataFinal = inputDataFinal ? inputDataFinal.value : null;
    
    dadosResumoDiv.innerHTML = ''; // Limpa os cards anteriores
    btnVerDetalhes.style.display = 'none';

    if (!nomeAutonomo || !dataInicial || !dataFinal) {
        tituloPeriodo.textContent = 'Selecione um cliente e um período completo.';
        exibirAlerta('Por favor, selecione um cliente, o mês inicial e o mês final.', 'erro');
        return;
    }

    tituloPeriodo.textContent = `Buscando dados de ${nomeAutonomo}...`;
    esconderAlerta();
    
    const payload = { 
        nome: nomeAutonomo, 
        dataInicial: dataInicial, 
        dataFinal: dataFinal
    };

    const resultado = await sendDataToAppsScript('getAutonomoDataPeriodo', payload); 

    if (resultado.sucesso) {
        renderizarDashboard(resultado.dados, nomeAutonomo, dataInicial, dataFinal);
    } else {
        tituloPeriodo.textContent = `Erro: ${resultado.mensagem}`;
        exibirAlerta(`Falha na busca: ${resultado.mensagem}`, 'erro');
    }
}


/**
 * Renderiza os dados recebidos do Apps Script na interface com o design de cards.
 */
function renderizarDashboard(dados, nome, dataInicial, dataFinal) {
    if (!dadosResumoDiv) return;

    dadosResumoDiv.innerHTML = ''; 
    btnVerDetalhes.style.display = 'flex';

    if (Object.keys(dados).length === 0 || dados.RENDIMENTO === undefined) {
         tituloPeriodo.textContent = `Nenhum dado financeiro encontrado para ${nome} no período de ${dataInicial} a ${dataFinal}.`;
         return;
    }
    
    tituloPeriodo.textContent = `Demonstração de ${nome} (${dataInicial} a ${dataFinal})`;

    const formatarMoeda = (valor) => 
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

    // Mapeamento das chaves do Apps Script para os cards
    const cardData = [
        { 
            key: 'RENDIMENTO', label: 'Rendimentos', 
            icon: 'fas fa-money-bill-wave', class: 'card-rendimentos', 
            valor: dados.RENDIMENTO 
        },
        { 
            key: 'DEDUÇÕES', label: 'Deduções', 
            icon: 'fas fa-minus-circle', class: 'card-deducoes', 
            valor: dados.DEDUÇÕES 
        },
        { 
            key: 'BASE_DE_CALCULO', label: 'Base de Cálculo', 
            icon: 'fas fa-calculator', class: 'card-base-calculo', 
            valor: dados.BASE_DE_CALCULO 
        },
        { 
            key: 'IMPOSTO', label: 'Imposto Devido', 
            icon: 'fas fa-file-invoice-dollar', class: 'card-imposto', 
            valor: dados.IMPOSTO 
        },
        { 
            key: 'SALDO', label: 'Saldo Líquido (Aprox.)', 
            icon: 'fas fa-hand-holding-usd', class: 'card-saldo', 
            valor: dados.RENDIMENTO - dados.IMPOSTO 
        }
    ];
    
    // Cria e insere os cards no DOM
    cardData.forEach(item => {
        const card = document.createElement('div');
        card.className = `card-resumo ${item.class}`;
        card.innerHTML = `
            <div class="card-icone"><i class="${item.icon}"></i></div>
            <div class="card-texto">
                <strong>${item.label}</strong>
                <span>${formatarMoeda(item.valor)}</span>
            </div>
        `;
        dadosResumoDiv.appendChild(card);
    });
}


// =========================================================================
// INICIALIZAÇÃO
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Lógica de navegação lateral
    menuButtons.forEach(button => {
        button.addEventListener('click', function() {
            const painelID = this.getAttribute('data-painel'); 
            alternarPainel(painelID);
        });
    });

    // 2. Lógica do Dashboard Autônomo
    if (btnBuscarDados) {
        btnBuscarDados.addEventListener('click', buscarDadosAutonomo);
    }
    
    // Define a data inicial e final padrão (Mês atual)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const defaultDate = `${year}-${month}`;

    if (inputDataInicial) inputDataInicial.value = defaultDate;
    if (inputDataFinal) inputDataFinal.value = defaultDate;


    // 3. Inicializa: Mostra o painel AUTONOMOS e carrega a lista
    alternarPainel('AUTONOMOS');
    carregarListaAutonomos(); 
});