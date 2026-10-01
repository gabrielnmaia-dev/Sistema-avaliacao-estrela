// (scripts.js) — camada de comportamento: estrelas, agrupamento e busca.
//
// se o JS falhar, a pagina  continua
// mostrando todos os gatos. Por isso o HTML ja vem com a lista
// completa e o agrupamento e a busca sao uma camada por cima,
// nao a base.

const CHAVE = 'gato:nota';

document.querySelectorAll('.estrelas').forEach((campo) => {
    const labels = [...campo.querySelectorAll('label')];
    const gato = campo.dataset.gatoId;

    // O HTML vai de 5 estrelas para 1 e o flex usa row-reverse,
    // entao a ultima label do DOM e a primeira da tela.
    // --atraso conta de tras pra frente pra acender da esquerda
    // pra direita: a label do fim (estrela 1) recebe 0ms.
    labels.forEach((label, i) => {
        label.style.setProperty('--atraso', (labels.length - 1 - i) * 35 + 'ms');
    });

    // 1. cascata no hover
    // pointerover/out fazem bubbling, ao contrario de enter/leave,
    // entao o listener pode ficar no fieldset e nao em cada label.
    campo.addEventListener('pointerover', (ev) => {
        const alvo = ev.target.closest('label');
        if (!alvo) return;

        // A label esta no DOM em ordem inversa, entao as estrelas
        // que acendem sao as que vem DEPOIS dela no DOM.
        const from = labels.indexOf(alvo);
        labels.forEach((label, i) => {
            label.classList.toggle('ativa', i >= from);
        });
    });

    // relatedTarget e o elemento para onde o ponteiro foi. Se ele
    // continua dentro do fieldset, o hover nao terminou.
    campo.addEventListener('pointerout', (ev) => {
        if (campo.contains(ev.relatedTarget)) return;
        labels.forEach((label) => label.classList.remove('ativa'));
    });

    campo.addEventListener('change', (ev) => {
        // 2. o pulso
        labels.forEach((label) => label.classList.add('confirmada'));
        setTimeout(() => {
            labels.forEach((label) => label.classList.remove('confirmada'));
        }, 420);

        // 3. guarda a nota
        try {
            localStorage.setItem(`${CHAVE}:${gato}`, ev.target.value);
        } catch {}
    });

    // 4. devolve a nota salva quando a pagina abre.
    // Busca por valor em vez de por seletor: um dado antigo ou
    // adulterado no localStorage nao vira CSS invalido.
    try {
        const nota = localStorage.getItem(`${CHAVE}:${gato}`);
        const salvo = [...campo.querySelectorAll('input')].find((i) => i.value === nota);
        if (salvo) salvo.checked = true;
    } catch {}
});



//(2) agrupar por familia de status


// A ordem das secoes na tela: 4xx primeiro (o erro que voce
// causou), 3xx depois (nao e erro, so e um desvio para outro
// endereco), 5xx em seguida (o servidor quebrou) e 2xx por
// ultimo (ainda nao existe nenhum gato que deu certo).
// A ordem nao sai do HTML, porque la os gatos estao na ordem em
// que foram cadastrados e nao por familia.
const ORDEM = ['4xx', '3xx', '5xx', '2xx'];

const ROTULOS = {
    '2xx': 'sucesso',
    '3xx': 'redirecionamento',
    '4xx': 'erro do cliente',
    '5xx': 'erro do servidor',
};

// Tira o acento e deixa minusculo, assim "avaliacao" acha
// "avaliação". Sem isso so apareceria o que foi digitado igual.
function semAcento(texto) {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}


const lista = document.getElementById('lista');
const gradeAntiga = lista.querySelector('.grade');

// A ultima celula da grade nao e um gato: e o aviso "mais gatos em
// breve". Ela vai junto e fecha a ultima secao, no mesmo lugar de
// antes: canto inferior direito.
const aviso = gradeAntiga.querySelector('.celula-vazia');

// Cria uma secao por familia e joga os cards dela dentro.
for (const familia of ORDEM) {
    // Os cards de uma familia carregam a classe f-4xx, f-5xx...
    const cards = gradeAntiga.querySelectorAll('.resposta.f-' + familia);

    // Familia sem gato nao abre secao.
    if (cards.length === 0) continue;

    const secao = document.createElement('section');
    secao.className = 'secao';
    secao.dataset.familia = familia;

    // innerHTML porque o texto vem do proprio HTML, nao de entrada
    // de usuario: nao ha como isso virar injecao de codigo aqui.
    secao.innerHTML = `
        <header class="secao-topo">
            <h2 class="secao-titulo">
                <span class="familia">${familia}</span>
                <span class="familia-nome">${ROTULOS[familia]}</span>
            </h2>
            <span class="familia-total" aria-live="polite"></span>
        </header>
        <div class="row g-0 grade"></div>`;

    // appendChild em um no que ja esta no DOM **move** o no, nao o
    // copia. O card nao e recriado, entao a nota marcada e a animacao
    // em andamento continuam intactas.
    const grade = secao.querySelector('.grade');
    for (const card of cards) {
        grade.appendChild(card.parentElement);
    }

    // aria-label nomeia a secao para o leitor de tela. Sem isso ela
    // existe no DOM mas nao aparece como um bloco com nome.
    secao.setAttribute('aria-label', familia + ' - ' + ROTULOS[familia]);

    lista.appendChild(secao);
}

// O aviso fecha a ultima secao e a grade antiga sai da tela.
lista.querySelector('.secao:last-child .grade').appendChild(aviso);
gradeAntiga.remove();


//(3) busca
 

const busca = document.getElementById('busca');
const campo = document.getElementById('busca-campo');
const semResultado = document.getElementById('sem-resultado');

// O campo so aparece depois que o filtro esta instalado. O
// `[hidden] { display: none !important }` do reboot do Bootstrap
// ganha de qualquer `display` do nosso CSS, entao o atributo manda.
busca.hidden = false;

function atualizar() {
    // Termo vazio casa com qualquer texto (`includes('')` e true),
    // entao nao existe um caso separado de "voltar a mostrar tudo":
    // e o mesmo caminho com a string vazia.
    const termo = semAcento(campo.value.trim());

    let visiveis = 0;

    // Um laço pelos cards da tela. Cada um decide se aparece.
    for (const card of document.querySelectorAll('.resposta')) {
        // A celula e a div que cerca o card: e nela que mora a
        // classe `escondido` e e ela que some quando nao achou.
        const celula = card.parentElement;

        // A secao e o bloco que agrupa os cards de uma familia.
        const familia = celula.closest('.secao').dataset.familia;

        // Codigo, motivo, descricao e o nome da familia: digitar
        // "4xx" ou "cliente" traz a secao inteira.
        const texto = semAcento(
            familia + ' ' +
            ROTULOS[familia] + ' ' +
            card.querySelector('.codigo').textContent + ' ' +
            card.querySelector('.frase').textContent + ' ' +
            card.querySelector('.descricao').textContent
        );

        const achou = texto.includes(termo);

        // Esconder por classe, e nao removendo o no: o card volta
        // instantaneo e o grid nao perde a posicao de nada.
        celula.classList.toggle('escondido', !achou);

        if (achou) visiveis++;
    }

    // Depois conta e ajusta cada titulo de secao. A classe `celula`
    // marca os cards no HTML, e neles que a classe `escondido` fica.
    for (const secao of document.querySelectorAll('.secao')) {
        const visiveisNaSecao = secao.querySelectorAll('.celula:not(.escondido)').length;

        // Titulo sem card nenhum e ruido: a secao inteira some.
        secao.hidden = visiveisNaSecao === 0;
        secao.querySelector('.familia-total').textContent =
            visiveisNaSecao === 1 ? '1 gato' : visiveisNaSecao + ' gatos';
    }

    semResultado.hidden = visiveis > 0;
}

// `input` e nao `keyup`: cobre colar, arrastar e o botao de limpar
// do navegador, que nenhum dos dois pegaria.
campo.addEventListener('input', atualizar);

// Atalhos: "/" para focar (padrao de busca em ferramenta de
// terminal) e "Esc" para limpar. O "/" so vale fora de um campo,
// senao a pessoa nao consegue digitar a barra.
document.addEventListener('keydown', (ev) => {
    const digitando = ev.target.tagName === 'INPUT'
        || ev.target.tagName === 'TEXTAREA';

    if (ev.key === '/' && !digitando) {
        ev.preventDefault(); // sem isso "/" seria digitado no campo
        campo.focus();
    }

    if (ev.key === 'Escape' && ev.target === campo) {
        campo.value = '';
        atualizar();
    }
});

atualizar();