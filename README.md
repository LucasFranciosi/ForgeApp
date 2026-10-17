# FORGE Mobile — React Native / Expo

Protótipo funcional mobile do FORGE, convertido do HTML/React para React Native.

## Stack

- Expo SDK 57
- React Native 0.86
- React 19.2
- TypeScript
- `@expo/vector-icons`
- `expo-image-picker`
- `react-native-svg`
- `react-native-webview`

O modelo 3D é propositalmente isolado em uma WebView que carrega `model-viewer` + GLB. O restante do aplicativo é React Native nativo.

## Funcionalidades do protótipo

- Login sempre bem-sucedido.
- Home orientada a prioridades.
- OS abertas e priorizadas.
- Criação de OS com atualização do estado em memória e notificação imediata.
- Encerramento de OS somente com:
  - foto;
  - assinatura desenhada no aparelho.
- Criação de agenda.
- Agenda:
  - hoje;
  - painel semanal;
  - mês com todas as máquinas no mesmo calendário.
- Área própria de máquinas.
- Detalhe técnico da máquina.
- Modelo 3D.
- Componentes agrupados por sistema.
- Documentos dentro da máquina.
- Notificações somente pelo sino.
- Telemetria detalhada.
- IA técnica no footer.
- Drawer lateral aberto apenas por gesto de arrastar da borda direita para a esquerda.
- Drawer com quick actions e múltiplos gráficos/análises.

## Requisitos locais

Para Expo SDK 57, use Node.js 22.13 ou superior.

Instale:
- Node.js
- Android Studio
- Android SDK
- ADB / Platform Tools

No celular Android:
1. Ative `Opções do desenvolvedor`.
2. Ative `Depuração USB`.
3. Conecte por USB.
4. Aceite a chave RSA quando o Android solicitar.

Confirme:

```bash
adb devices
```

O aparelho deve aparecer como `device`.

## Instalação

Na pasta do projeto:

```bash
npm install
```

Para garantir versões nativas compatíveis com o SDK do Expo, você também pode executar:

```bash
npx expo install --fix
```

## Primeira execução no celular físico

```bash
npm run android:device
```

Equivale a:

```bash
npx expo run:android --device
```

Na primeira execução, o Expo gera automaticamente a pasta nativa `android/`, compila o debug build e instala no aparelho.

## Abrir no Android Studio

Depois da primeira execução ou após:

```bash
npx expo prebuild
```

abra a pasta:

```text
forge-react-native/android
```

no Android Studio.

A partir daí você pode usar:
- Logcat;
- debugger Android;
- profiler;
- inspeção de rede;
- build Gradle;
- execução direta no dispositivo.

Para o código JavaScript/TypeScript, mantenha o Metro ativo:

```bash
npm start
```

ou:

```bash
npx expo start --dev-client
```

## Modelo 3D

O protótipo usa uma URL pública somente para validar a interação.

Arquivo:

```text
src/components/ThreeDViewer.tsx
```

Arquitetura prevista:

```text
React Native
   ↓
Technical3DViewer
   ↓
WebView isolada
   ↓
model-viewer / Three.js
   ↓
GLB
```

Posteriormente o `src` do GLB virá do cache/file storage local e o viewer enviará `ComponentId` de volta ao React Native via `postMessage`.

## Estrutura

```text
forge-react-native/
├── App.tsx
├── app.json
├── package.json
├── tsconfig.json
└── src/
    ├── theme.ts
    ├── types.ts
    ├── mock.ts
    ├── components/
    │   ├── AIPanel.tsx
    │   ├── AppChrome.tsx
    │   ├── Charts.tsx
    │   ├── Forms.tsx
    │   ├── SignaturePad.tsx
    │   └── ThreeDViewer.tsx
    └── screens/
        ├── AgendaScreen.tsx
        ├── HomeScreen.tsx
        ├── LoginScreen.tsx
        ├── MachinesScreen.tsx
        ├── NotificationsScreen.tsx
        ├── OSScreen.tsx
        └── TelemetryScreen.tsx
```

## Núcleo offline (em evolução)

Além da interface do protótipo, o projeto agora possui um núcleo independente de React Native em `src/core`:

```text
domain/          agregados, invariantes e cálculo de performance
application/     casos de uso, transação e controle otimista de versão
infrastructure/  SQLite local e repositórios
```

O banco `forge.db` é criado localmente pelo `expo-sqlite`. A primeira migração já inclui:

- `workOrder` e `workOrderAction` com constraints de estado;
- `domainHistory`, gravado na mesma transação da OS;
- `BEGIN IMMEDIATE` para mutações críticas;
- atualização condicional por `version`, que rejeita last-write-wins silencioso.

`WorkOrderService` é a porta de entrada para criar, agendar, iniciar, pausar, retomar, concluir e cancelar OS. A camada de apresentação não executa SQL.

O protótipo visual existente ainda usa sua coleção de demonstração em memória. A próxima entrega deve migrar as telas para `WorkOrderService` e introduzir as migrations de planta, setor, máquina, componentes, preventivas, paradas e documentos — sem introduzir chamadas HTTP no core operacional.

## Arquitetura alvo

```text
UI React Native
      ↓
Application / Stores
      ↓
SQLite local
      ↓
Sync / Outbox
      ↓
API .NET
      ↓
SQL Server + File Storage + Ollama
```

O próximo passo não deve ser aumentar o mock. Deve ser criar:
- entidades SQLite;
- repositórios;
- Outbox;
- cliente HTTP;
- autenticação;
- sincronização;
- API real.
