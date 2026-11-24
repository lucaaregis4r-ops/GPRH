# RH procedural — JS data expandido

Este pacote expande os arquivos `js/data` mantendo os nomes dos exports originais:

- `ECONOMIC_PROFILES` e `COMPANY_SIZES`
- `FIRST_NAMES` e `LAST_NAMES`
- `OCCUPATION_CATALOG`
- `SCENARIOS`, `getScenarioById`, `listScenarios`
- `PSYCHOSOCIAL_RISK_EVENTS` e `REPORT_STATUS`

## O que mudou

- Perfis econômicos: de 3 para 12.
- Tamanhos de empresa: de 3 para 6.
- Nomes: de 20 primeiros nomes para 154; sobrenomes de 16 para 95.
- Ocupações: de 12 para 50, com tarefas, riscos organizacionais, treinamentos e interações frequentes.
- Cenários: de 1 para 10.
- Eventos psicossociais/compliance: de 7 para 26.

## Risco de quebrar o jogo

A versão foi pensada para ser compatível, mas a segurança depende de como a engine usa esses dados.

Baixo risco:
- substituir `nomes.js`;
- aumentar arrays mantendo exports iguais;
- adicionar campos extras que a engine ignora.

Risco médio:
- novos `scenario.id` e `engineConfig.arquetipo`, se a engine tiver `switch/case` apenas para `crescimento_desorganizado`;
- novos `COMPANY_SIZES.id`, se a UI tiver opções fixas;
- novos campos numéricos se alguma validação exigir schema exato.

Antes de substituir tudo, rode:

```bash
node validateDataShape.js
```

Depois, procure no projeto por:

```bash
grep -R "crescimento_desorganizado\|pequena\|media\|grande_local\|setorAfinidade\|salaryBand\|OCCUPATION_CATALOG" .
```

Se houver lógica rígida nesses termos, o Codex deve trocar para leitura dinâmica dos catálogos.
