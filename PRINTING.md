# Impressao direta na impressora termica

Uma app web publicada na Vercel nao consegue bypassar a caixa de impressao do Windows sozinha. O browser bloqueia impressao silenciosa por seguranca.

Para o POS imprimir logo ao clicar em `Registar e imprimir`, abre a app num browser em modo quiosque com `--kiosk-printing`.

## Configuracao Windows

1. Instala o driver da impressora termica.
2. Define a impressora termica como impressora predefinida do Windows.
3. Desativa `Permitir que o Windows gira a minha impressora predefinida`.
4. Nas preferencias da impressora, escolhe papel `80mm` ou `Receipt`.
5. Se a impressora tiver guilhotina/corte, ativa `Cut after page`, `Partial cut` ou equivalente no driver.

## Atalho Chrome

Cria um atalho no ambiente de trabalho com este destino, trocando o URL pelo URL real da Vercel:

```txt
"C:\Program Files\Google\Chrome\Application\chrome.exe" --user-data-dir="%LOCALAPPDATA%\POS-Tickets-Chrome" --kiosk-printing --app="https://o-teu-projeto.vercel.app"
```

Se o Chrome estiver instalado noutro caminho, usa esse caminho.

## Atalho Microsoft Edge

```txt
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --user-data-dir="%LOCALAPPDATA%\POS-Tickets-Edge" --kiosk-printing --app="https://o-teu-projeto.vercel.app"
```

## Importante

- Abre o POS sempre por este atalho.
- Fecha janelas normais do Chrome/Edge antes de testar, porque o browser pode reutilizar uma sessao antiga sem `--kiosk-printing`.
- A primeira impressao deve sair diretamente para a impressora predefinida.
- Se continuar a aparecer a caixa de dialogo, o browser nao foi aberto pelo atalho correto ou a app esta aberta numa janela normal.

## Papel 58mm

O CSS esta preparado por defeito para papel de 80mm. Para impressoras de 58mm, troca em `app/globals.css` os valores `80mm` na area `@media print` por `58mm`, e reduz o `font-size` do `.ticket-print` para `24pt`.
