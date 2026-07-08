# GPRH

Prototipo jogavel de uma simulacao procedural de gestao de RH. O projeto combina uma engine em Node.js com uma interface web em Phaser para gerar empresas, funcionarios, metricas de clima, demandas e consequencias de acoes do RH.

## Como jogar

Instale as dependencias:

```bash
npm ci --prefix ui-phaser
```

Inicie o jogo:

```bash
npm --prefix ui-phaser start
```

Abra no navegador:

```text
http://127.0.0.1:4180
```

Essa e a interface principal do jogo. A UI simples existe como uma tela tecnica alternativa para testes.

## Estrutura

- `core/`: utilitarios compartilhados.
- `data/`: catalogos e dados de apoio.
- `game/`: loops principais, snapshots e persistencia.
- `generators/`: geracao procedural de empresa, setores, relacoes e funcionarios.
- `knowledge/`: percepcao, sinais visiveis e informacao imperfeita.
- `rh/`: acoes, energia, demandas e aprovacoes do RH.
- `simulation/`: simulacoes de clima, financas, compliance, carga e eventos.
- `reports/`: relatorios de avaliacao e acompanhamento.
- `tests/`: testes automatizados em Node.js.
- `ui-simple/`: interface HTML simples.
- `ui-phaser/`: interface jogavel em Phaser.

## Requisitos

- Node.js 20 ou superior.
- npm.

## Instalacao para desenvolvimento

```bash
npm ci --prefix ui-phaser
```

## Rodar a UI Phaser

```bash
npm --prefix ui-phaser start
```

Depois acesse:

```text
http://127.0.0.1:4180
```

## Rodar a UI simples

```bash
node ui-simple/server.js
```

Depois acesse:

```text
http://127.0.0.1:4173
```

## Testes

```bash
node tests/runAllTests.js
```

Ou, depois de instalar as dependencias da UI Phaser:

```bash
npm --prefix ui-phaser test
```


