

const REDUZIR = matchMedia('(prefers-reduced-motion: reduce)').matches;
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

    // 3. devolve a nota salva quando a pagina abre
    try {
        const nota = localStorage.getItem(`${CHAVE}:${gato}`);
        if (nota) campo.querySelector(`input[value="${nota}"]`).checked = true;
    } catch {}
});
