document.getElementById('valorForm').onsubmit = async function(event) {
    event.preventDefault();

    const valorOriginal = parseFloat(document.getElementById('valor').value);
    const dataOriginal = document.getElementById('data').value;

    if (!valorOriginal || !dataOriginal) {
        alert('Preencha todos os campos!');
        return;
    }

    const historico = await carregarHistoricoIPCA();
    const valorAtualizado = calcularValorAtualizado(valorOriginal, dataOriginal, historico);
    
    document.getElementById('valorAtualizado').innerText = `Valor atualizado: R$ ${valorAtualizado.toFixed(2)}`;
    document.getElementById('resultado').style.display = 'block';

    desenharGrafico(historico, valorOriginal, dataOriginal);
};

async function carregarHistoricoIPCA() {
    const cacheKey = 'historicoIPCA_percentual';

    // Limpa cache sempre pra garantir dados frescos
    localStorage.removeItem(cacheKey);

    const url = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json'; // IPCA variação percentual mensal

    try {
        const resposta = await fetch(url);
        if (!resposta.ok) {
            console.error('Erro ao buscar dados do Banco Central:', resposta.status);
            alert('Erro ao buscar dados do Banco Central. Tente novamente mais tarde.');
            return {};
        }

        const dados = await resposta.json();

        const historico = {};
        dados.forEach(item => {
            const [dia, mes, ano] = item.data.split('/');
            const chave = `${ano}-${mes}`;
            historico[chave] = parseFloat(item.valor) / 100; // Converte % em fator (ex: 0.5% = 0.005)
        });

        console.log('Histórico percentual carregado com sucesso:', historico);
        localStorage.setItem(cacheKey, JSON.stringify(historico));
        return historico;
    } catch (erro) {
        console.error('Erro ao buscar histórico:', erro);
        alert('Erro ao carregar histórico do Banco Central.');
        return {};
    }
}

function calcularValorAtualizado(valorOriginal, dataOriginal, historico) {
    const datas = Object.keys(historico).sort();

    // Encontra a primeira data válida igual ou maior à escolhida
    const dataInicial = datas.find(data => data >= dataOriginal);

    if (!dataInicial) {
        alert('Não encontramos uma data válida no histórico para essa data ou posterior.');
        return valorOriginal;
    }

    let valorCorrigido = valorOriginal;

    // Multiplica o valor original pelas variações mensais acumuladas
    let aplicarCorrecao = false;

    for (const data of datas) {
        if (data === dataInicial) aplicarCorrecao = true;

        if (aplicarCorrecao) {
            const fator = 1 + (historico[data] || 0);
            valorCorrigido *= fator;
        }
    }

    return valorCorrigido;
}

let graficoAtual = null;  // Variável global para guardar o gráfico atual

function desenharGrafico(historico, valorOriginal, dataOriginal) {
    const ctx = document.getElementById('grafico').getContext('2d');

    if (graficoAtual) {
        graficoAtual.destroy();  // Destrói o gráfico anterior, se existir
    }

    const datas = Object.keys(historico).sort();

    const dataInicial = datas.find(data => data >= dataOriginal);

    if (!dataInicial) {
        alert('Não há dados para a data inicial escolhida.');
        return;
    }

    const labels = [];
    const valoresCorrigidos = [];
    let valorCorrigido = valorOriginal;
    let aplicarCorrecao = false;

    for (const data of datas) {
        if (data === dataInicial) aplicarCorrecao = true;

        if (aplicarCorrecao) {
            const fator = 1 + (historico[data] || 0);
            valorCorrigido *= fator;

            labels.push(data);
            valoresCorrigidos.push(valorCorrigido.toFixed(2));
        }
    }

    graficoAtual = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Valor Corrigido (R$)',
                data: valoresCorrigidos,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: false }
            }
        }
    });
}



