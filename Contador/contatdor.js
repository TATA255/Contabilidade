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
const btnBuscarDadosEmpresa = document.getElementById('btn-buscar-dados-empresas')
const dadosResumoDiv = document.getElementById('dados-resumo-autonomo');
const tituloPeriodo = document.getElementById('titulo-periodo');
const btnVerDetalhes = document.getElementById('btn-ver-detalhes');
const alertaElement = document.getElementById('alerta-mensagem');
let meuGrafico = null; // Para podermos destruir e recriar o gráfico
let graficoReceita = null;
let graficoRBT12 = null;

// =========================================================================
// FUNÇÕES DE UTILIDADE E UI
// =========================================================================


function sair(){
    window.location.href = "/index.html";
}


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
    btnVerDetalhes.style.display = 'none';

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
            valor: dados.RENDIMENTO - dados.DEDUÇÕES 
        },
        { 
            key: 'IMPOSTO', label: 'Imposto Devido', 
            icon: 'fas fa-file-invoice-dollar', class: 'card-imposto', 
            valor: dados.IMPOSTO 
        },
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
    renderizarGrafico(dados.DADOS_GRAFICO);
    const btnPdf = document.getElementById('btn-gerar-pdf');
    if (btnPdf) btnPdf.style.display = 'block';
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

    const btnPdf = document.getElementById('btn-gerar-pdf');
    if (btnPdf) {
        btnPdf.addEventListener('click', gerarPDF);
    }
    // 3. Inicializa: Mostra o painel AUTONOMOS e carrega a lista
    alternarPainel('AUTONOMOS');
    carregarListaAutonomos(); 
});

function renderizarGrafico(dadosMensais) {
    const ctx = document.getElementById('graficoAutonomo').getContext('2d');
    const container = document.getElementById('container-grafico');
    
    if (container) container.style.display = 'block';
    if (meuGrafico) meuGrafico.destroy(); // Limpa o gráfico anterior

    const labels = dadosMensais.map(d => d.mes);
    const valores = dadosMensais.map(d => d.rendimento);

    meuGrafico = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Rendimento Mensal',
                data: valores,
                fill: true, // Cria o efeito de área
                backgroundColor: 'rgba(52, 152, 219, 0.2)', // Azul claro transparente
                borderColor: '#3498db', // Azul do card
                borderWidth: 3,
                tension: 0.4, // Curva suave
                pointBackgroundColor: '#3498db',
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toLocaleString('pt-BR');
                        }
                    }
                }
            }
        }
    });
}

async function gerarPDF() {
    const { jsPDF } = window.jspdf;
    const elemento = document.querySelector('.dashboard-dados'); // Captura a área dos cards e gráfico
    const btnPdf = document.getElementById('btn-gerar-pdf');

    // Esconde o botão momentaneamente para não sair no PDF
    btnPdf.style.visibility = 'hidden';

    try {
        // 1. Transforma o HTML/Canvas em uma imagem
        const canvas = await html2canvas(elemento, {
            scale: 2, // Aumenta a qualidade
            useCORS: true,
            logging: false,
            backgroundColor: "#f4f7f9" // Mesma cor de fundo do seu body
        });

        const imgData = canvas.toDataURL('image/png');
        
        // 2. Configura o PDF (A4)
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        // 3. Adiciona título e imagem
        pdf.setFontSize(16);
        pdf.text("Relatório de Rendimentos - Autônomo", 15, 15);
        pdf.addImage(imgData, 'PNG', 0, 25, pdfWidth, pdfHeight);

        // 4. Salva o arquivo
        const nomeArquivo = `Relatorio_${selectAutonomo.value}_${inputDataInicial.value}.pdf`;
        pdf.save(nomeArquivo);

    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        alert("Erro ao gerar o PDF. Verifique o console.");
    } finally {
        btnPdf.style.visibility = 'visible';
    }
}

async function buscarDadosEmpresa() {
    btnBuscarDadosEmpresa.textContent = 'Buscando...';
    btnBuscarDadosEmpresa.disabled = true; 
    const selectEmpresa = document.getElementById('select-empresa');
    const inputDataIni = document.getElementById('input-data-ini-emp');
    const inputDataFim = document.getElementById('input-data-fim-emp');
    const dashboard = document.getElementById('dashboard-empresas');
    
    // Elementos de Resumo
    const resumoFat = document.getElementById('resumo-fat-empresa');
    const resumoRbt = document.getElementById('resumo-rbt-empresa');
    const resumoImp = document.getElementById('resumo-imp-empresa'); // Novo elemento

    const nome = selectEmpresa.value;
    const dataIni = inputDataIni.value;
    const dataFim = inputDataFim.value;

    if (!nome || !dataIni || !dataFim) {
        alert("Por favor, selecione a empresa e o período.");
        return;
    }

    try {
        const res = await sendDataToAppsScript('getEmpresaDataPeriodo', { 
            nome: nome, 
            dataInicial: dataIni, 
            dataFinal: dataFim 
        });

        if (res.sucesso) {
            dashboard.style.display = 'block';
            const formatar = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            // Atualiza os 3 Cards
            resumoFat.innerText = formatar(res.dados.TOTAL_FATURAMENTO);
            resumoRbt.innerText = formatar(res.dados.ULTIMO_RBT12);
            resumoImp.innerText = formatar(res.dados.TOTAL_IMPOSTO);

            const labels = res.dados.HISTORICO.map(h => h.mes);
            
            // Renderiza os 3 Gráficos
            renderizarGraficoUnico('graficoReceitaEmpresa', 'Faturamento', labels, res.dados.HISTORICO.map(h => h.faturamento), 'bar', '#3498db');
            renderizarGraficoUnico('graficoRBTEmpresa', 'RBT12', labels, res.dados.HISTORICO.map(h => h.rbt12), 'line', '#e67e22');
            renderizarGraficoUnico('graficoImpEmpresa', 'Imposto Pago', labels, res.dados.HISTORICO.map(h => h.imposto), 'bar', '#e74c3c');

        } else {
            alert(res.mensagem);
        }
    } catch (erro) {
        console.error("Erro:", erro);
    }
    btnBuscarDadosEmpresa.textContent = 'Buscar Dados';
    btnBuscarDadosEmpresa.disabled = false; 
}

function renderizarGraficoUnico(id, label, labels, data, tipo, cor) {
    const ctx = document.getElementById(id).getContext('2d');
    if (window[id + 'Chart']) window[id + 'Chart'].destroy();

    window[id + 'Chart'] = new Chart(ctx, {
        type: tipo,
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: tipo === 'bar' ? cor : 'transparent',
                borderColor: cor,
                fill: tipo === 'line',
                tension: 0.4
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}


function renderizarGraficosEmpresa(dados) {
    const labels = dados.HISTORICO.map(h => h.mes);
    
    // 1. Gráfico de Receita (Barras)
    const ctxFat = document.getElementById('graficoReceitaEmpresa').getContext('2d');
    if (graficoReceita) graficoReceita.destroy();
    graficoReceita = new Chart(ctxFat, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Faturamento Mensal',
                data: dados.HISTORICO.map(h => h.faturamento),
                backgroundColor: '#3498db'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // 2. Gráfico de RBT12 (Linha)
    const ctxRbt = document.getElementById('graficoRBTEmpresa').getContext('2d');
    if (graficoRBT) graficoRBT.destroy();
    graficoRBT = new Chart(ctxRbt, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'RBT12',
                data: dados.HISTORICO.map(h => h.rbt12),
                borderColor: '#e67e22',
                backgroundColor: 'rgba(230, 126, 34, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    carregarListaEmpresas();
    document.getElementById('btn-buscar-empresa').addEventListener('click', buscarDadosEmpresa);
});

async function carregarListaEmpresas() {
    const select = document.getElementById('select-empresa');
    if (!select) return;

    const resultado = await sendDataToAppsScript('getEmpresasList', {});
    if (resultado.sucesso) {
        select.innerHTML = '<option value="">-- Selecione uma Empresa --</option>';
        resultado.nomes.forEach(nome => {
            const opt = document.createElement('option');
            opt.value = nome;
            opt.textContent = nome;
            select.appendChild(opt);
        });
    }
}