# Garimpo MTG

Aplicação web para explorar coleções de Magic: The Gathering, consultar cartas, descobrir uma carta por sorteio e guardar favoritas no próprio navegador.

- [Aplicação no GitHub Pages](https://jotavictorcds.github.io/garimpo-mtg/)
- [Repositório](https://github.com/JotaVictorcds/garimpo-mtg)
- Integrante — João Victor Rodrigues de Oliveira
- Framework CSS — Bootstrap 5.3.8, com grid, formulários, botões e alertas.
- Tecnologia — HTML, CSS e JavaScript. As requisições usam `fetch`.

## Como usar

1. Abra a aplicação e escolha uma coleção. A página começa em *Kamigawa: Neon Dynasty*.
2. Selecione cor, tipo ou raridade e clique em **Filtrar**. Use **Carregar mais cartas** se houver outras páginas.
3. Clique em uma carta para abrir sua ficha. Você também pode digitar um nome, como `Lightning Bolt`, ou clicar em **Sortear carta** para descobrir uma carta com os filtros selecionados.
4. Clique na estrela para salvar ou remover uma carta. Os favoritos ficam no armazenamento local do navegador.

Para rodar localmente, abra `index.html` no navegador. Se o navegador restringir a origem de arquivos locais, execute `python -m http.server 8000` na pasta do projeto e abra `http://localhost:8000`. É necessário acesso à internet para carregar a API e as imagens das cartas.

## API e endpoints

Fonte única de dados — [Scryfall](https://scryfall.com/docs/api).

| Método | URL | Uso na interface |
| --- | --- | --- |
| GET | `https://api.scryfall.com/sets` | Preenche as coleções do seletor. |
| GET | `https://api.scryfall.com/cards/search?q=…` | Exibe as cartas que correspondem aos filtros. `next_page` carrega outra página do mesmo endpoint. |
| GET | `https://api.scryfall.com/cards/named?fuzzy=…` | Consulta uma carta pelo nome e abre sua ficha. |
| GET | `https://api.scryfall.com/cards/random?q=…` | Sorteia uma carta que atende aos filtros atuais e abre sua ficha. |

## Organização

- `index.html` contém a estrutura semântica, formulários e ficha de inspeção.
- `css/estilo.css` define o tema e complementa os componentes do Bootstrap.
- `js/app.js` faz as requisições, renderiza as cartas e gerencia os favoritos.
- `img/emperatriz.jpg` é a arte de *The Wandering Emperor*, de Tommy Arnold, via Scryfall.

O Garimpo MTG é um projeto acadêmico independente. Magic: The Gathering e suas ilustrações pertencem aos respectivos titulares.
