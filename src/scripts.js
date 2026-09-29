// (scripts.js) — camada de comportamento: estrelas, agrupamento e busca.
//
// O style.css sozinho ja entrega o estado marcado (`:checked ~ label`)
// e a fonte; aqui mora so o que o CSS nao consegue fazer: ler o
// ponteiro, animar a cascata, guardar a nota entre visitas, reordenar
// os cards por familia e filtrar a lista.
//
// Regra da casa: se o JS falhar, a pagina tem que continuar
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


/* ==========================================================
   (2) agrupar por familia de status
   ========================================================== */

// Ordem de leitura: 4xx e o erro que voce causou, 3xx nem e erro
// (e um desvio para outro endereco) e 5xx e o servidor quebrando.
// 2xx vem no fim porque ainda nao existe nenhum gato que deu certo.
// A ordem nao sai do HTML, porque la os gatos estao na ordem em que
// foram cadastrados e nao por familia.
const ORDEM = ['4xx', '3xx', '5xx', '2xx'];

const ROTULOS = {
    '2xx': 'sucesso',
    '3xx': 'redirecionamento',
    '4xx': 'erro do cliente',
    '5xx': 'erro do servidor',
};

// A familia vem do codigo: o primeiro digito do 510 e 5. A classe
// `f-5xx` do card daria a mesma resposta, mas ela existe so pra
// pintar; o numero do status e a fonte da verdade.
const familiaDe = (art) => `${art.querySelector('.codigo').textContent.trim()[0]}xx`;

// "avaliacao" e "avaliacao" com acento precisam dar a mesma busca.
// NFD quebra o acento em um caractere proprio (U+0300..U+036F) e o
// filtro apaga esses caracteres; sem isso o usuario so acha o que
// digitou exatamente igual.
const semAcento = (txt) => txt.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();


const lista = document.getElementById('lista');
const gradeAntiga = lista.querySelector('.grade');

// A ultima celula da grade nao e um gato: e o aviso "mais gatos em
// breve". Ela sai junto e fecha a ultima secao, no mesmo lugar de
// antes: canto inferior direito.
const aviso = gradeAntiga.querySelector('.celula-vazia');

// Cada card vira um registro com tres coisas: a celula (e ela que
// some quando a busca nao acha), a familia (e por ela que se
// agrupa) e o texto que a busca compara. O texto e montado uma vez
// so, porque a busca roda a cada tecla digitada.
const cartoes = [...gradeAntiga.querySelectorAll('.resposta')].map((art) => {
    const familia = familiaDe(art);
    return {
        celula: art.parentElement,
        familia,
        // Codigo, motivo, descricao e o nome da familia: digitar
        // "4xx" ou "cliente" traz a secao inteira.
        texto: semAcento([
            familia,
            ROTULOS[familia],
            art.querySelector('.codigo').textContent,
            art.querySelector('.frase').textContent,
            art.querySelector('.descricao').textContent,
        ].join(' ')),
    };
});

// Mapa por familia, ja nascendo na ordem em que as secoes vao
// aparecer. `new Map` preserva a ordem de insercao, e por isso
// da para percorrer sem object.keys().
const grupos = new Map(ORDEM.map((f) => [f, []]));
cartoes.forEach((c) => grupos.get(c.familia).push(c.celula));

// So para poder atualizar a contagem de cada titulo na busca.
const secoes = new Map();

ORDEM.forEach((familia) => {
    const celulas = grupos.get(familia);
    if (!celulas.length) return; // familia sem gato nao abre secao

    const secao = document.createElement('section');
    secao.className = 'secao';
    secao.dataset.familia = familia;

    // innerHTML porque o texto vem do proprio HTML, nao de entrada
    // de usuario: nao ha como isso virar injecao de codigo aqui.
    secao.innerHTML = `
        <header class="secao-topo">
            <h2 class="secao-titulo" id="titulo-${familia}">
                <span class="familia">${familia}</span>
                <span class="familia-nome">${ROTULOS[familia]}</span>
            </h2>
            <span class="familia-total" aria-live="polite"></span>
        </header>
        <div class="row g-0 grade"></div>`;

    // aria-labelledby sem nome proprio nao cria landmark: sem isso a
    // secao existe no DOM mas nao aparece para o leitor de tela.
    secao.setAttribute('aria-labelledby', `titulo-${familia}`);

    // appendChild em um no que ja esta no DOM **move** o no, nao o
    // copia. O card nao e recriado, entao a nota marcada e a animacao
    // em andamento continuam intactas.
    const grade = secao.querySelector('.grade');
    celulas.forEach((celula) => grade.appendChild(celula));

    lista.appendChild(secao);
    secoes.set(familia, secao);
});

lista.querySelector('.secao:last-child .grade').appendChild(aviso);
gradeAntiga.remove();


/* ==========================================================
   (3) busca
   ========================================================== */

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

    // A contagem sai do proprio filtro, e nao de contar no DOM
    // depois: assim o numero mostrado nunca pode divergir do que
    // esta visivel.
    const porFamilia = new Map();
    let visiveis = 0;

    cartoes.forEach((c) => {
        const achou = c.texto.includes(termo);

        // Esconder por classe, e nao removendo o no: o card volta
        // instantaneo e o grid nao perde a posicao de nada.
        c.celula.classList.toggle('escondido', !achou);

        if (achou) {
            porFamilia.set(c.familia, (porFamilia.get(c.familia) || 0) + 1);
            visiveis++;
        }
    });

    secoes.forEach((secao, familia) => {
        const n = porFamilia.get(familia) || 0;

        // Titulo sem card nenhum e ruido: a secao inteira some.
        secao.hidden = n === 0;
        secao.querySelector('.familia-total').textContent = n === 1 ? '1 gato' : `${n} gatos`;
    });

    semResultado.hidden = visiveis > 0;
}

// `input` e nao `keyup`: cobre colar, arrastar e o botao de limpar
// do navegador, que nenhum dos dois pegaria.
campo.addEventListener('input', atualizar);

// Atalhos: "/" para focar (padrao de busca em ferramenta de
// terminal) e "Esc" para limpar. O "/" so vale fora de um campo,
// senao a pessoa nao consegue digitar a barra.
document.addEventListener('keydown', (ev) => {
    // ev.target nem sempre e um Element: um keydown disparado no
    // proprio document chega aqui sem closest, e um throw nesse
    // listener derrubaria o resto da pagina.
    const alvo = ev.target;
    const digitando = alvo instanceof Element
        && alvo.closest('input, textarea, [contenteditable]');

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
