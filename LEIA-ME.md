# LUPI

*Você lê, a história ganha vida.*

App da família: você lê uma história em voz alta, o LUPI escuta pelo microfone
e toca os sons na hora certa (o lobo uiva, a porta bate, o trovão ruge), com uma
trilha de fundo baixinha que abaixa sozinha quando um som toca.

Banco: projeto Supabase **lupi** (organização Lupi-Familia), separado do trabalho.

## Como o app funciona

1. **Conta da família**: entra uma vez com e-mail e senha e fica salvo no celular.
2. **Quem vai ouvir hoje?**: cada menino tem o seu perfil (nome e cor).
3. **Estante**: histórias publicadas, "Continuar lendo", favoritas (coração).
4. **Leitura**: texto grande; toque no botão redondo e comece a ler.
   - Verde = som que já tocou · Azul = próxima palavra que vai tocar.
   - "↺" recomeça os sons da história.
   - A chave "Trilha de fundo" liga e desliga a música.

## Primeira configuração (uma vez só)

### 1. Criar a conta da família no Supabase
1. supabase.com → projeto **lupi** → **Authentication** → **Users**.
2. **Add user** → **Create new user**.
3. Coloque o e-mail e uma senha, marque **Auto Confirm User** e clique em **Create user**.

### 2. Preparar o projeto no PC
Abra o terminal (PowerShell) dentro da pasta `Desktop\LUPI` e rode, um de cada vez:

```
npm install
npx expo install --fix
npx eas login        (conta lucassbh327)
npx eas whoami       (tem que mostrar lucassbh327)
npx eas init
npx eas update:configure
```

O `npx expo install --fix` acerta as versões do reconhecimento de voz e do som
para o Expo 57. Se ele perguntar algo, responda **Y**.

### 3. Subir para o GitHub
1. No GitHub, crie um repositório **privado** chamado `lupi` (sem README).
2. No terminal, na pasta LUPI:
```
git init
git add .
git commit -m "LUPI: primeira versão"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/lupi.git
git push -u origin main
```
3. No repositório: **Settings → Secrets and variables → Actions → New repository secret**
   → nome `EXPO_TOKEN`, valor: o mesmo token usado no ULVA/VITA.

## Gerar o app para o celular

GitHub → repositório `lupi` → **Actions** → **Build Android (EAS local)** →
**Run workflow** → troque o perfil para `preview` (gera um APK para instalar
direto no celular; o `playstore` gera o .aab da loja).

Quando terminar (uns 20 a 30 min), abra a execução, baixe **app-release-preview** em
*Artifacts*, descompacte e instale o `app-release.apk` no celular.

> O LUPI **não roda no Expo Go**: o reconhecimento de voz precisa do app instalado.

## Dicas para o primeiro teste
- Leia num ritmo normal, sem pressa. As palavras-gatilho não precisam ser exatas
  ("bateu à porta" também vale).
- Se o celular disser que o português não está disponível: Configurações →
  Google → Voz / Reconhecimento de fala → baixar **Português (Brasil)**.
- Abaixe um pouco o volume da mídia se os sons estiverem "atrapalhando" o microfone.

## Onde fica cada coisa

| Pasta | O que tem |
|---|---|
| `src/screens` | As telas: Login, Perfis, Estante, Leitura |
| `src/lib/frases.ts` | Como o app reconhece as palavras-gatilho |
| `src/lib/mesaDeSom.ts` | Sons, trilha de fundo e o "abaixar a trilha" |
| `src/data/api.ts` | Conversa com o Supabase |
| `src/theme/colors.ts` | Cores (por enquanto, as mesmas do ULVA) |

Pacote: `com.lucasalberto.lupi`.

---
by Lucas Alberto
