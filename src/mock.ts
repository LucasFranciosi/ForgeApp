import { AgendaItem, Machine, NotificationItem, WorkOrder } from './types';

const commonComponents = [
  {
    id: 'motor',
    name: 'Motor principal',
    system: 'Acionamento' as const,
    detail: 'WEG W22 • 7,5 kW • 380 V',
    specs: ['7,5 kW', '380 V', '312h'] as [string, string, string],
  },
  {
    id: 'acoplamento',
    name: 'Acoplamento',
    system: 'Acionamento' as const,
    detail: 'Vibração acima do padrão',
    warning: '2,1 mm/s',
    specs: ['2,1 mm/s', 'Atual', 'Crítico'] as [string, string, string],
  },
  {
    id: 'inversor',
    name: 'Inversor',
    system: 'Acionamento' as const,
    detail: 'SINAMICS • revisão atual',
    specs: ['7,5 kW', '380 V', 'Atual'] as [string, string, string],
  },
  {
    id: 'redutor',
    name: 'Redutor',
    system: 'Acionamento' as const,
    detail: 'Revisado há 42 dias',
    specs: ['15:1', 'Atual', '958h'] as [string, string, string],
  },
  {
    id: 'bomba',
    name: 'Bomba hidráulica',
    system: 'Hidráulico' as const,
    detail: 'Pressão nominal 180 bar',
    specs: ['180 bar', '32 L/min', '420h'] as [string, string, string],
  },
  {
    id: 'cilindro',
    name: 'Cilindro principal',
    system: 'Hidráulico' as const,
    detail: 'Curso 420 mm',
    specs: ['420 mm', '180 bar', '610h'] as [string, string, string],
  },
  {
    id: 'valvula',
    name: 'Válvula proporcional',
    system: 'Hidráulico' as const,
    detail: 'Controle proporcional de pressão',
    specs: ['24 VDC', '0–10 V', '760h'] as [string, string, string],
  },
  {
    id: 'filtro',
    name: 'Filtro hidráulico',
    system: 'Hidráulico' as const,
    detail: 'Troca prevista em 110h',
    specs: ['10 µm', 'Atual', '110h'] as [string, string, string],
  },
  {
    id: 'painel',
    name: 'Painel elétrico',
    system: 'Elétrica & sensores' as const,
    detail: 'Diagrama elétrico revisão 04',
    specs: ['380 V', 'Rev. 04', 'Atual'] as [string, string, string],
  },
  {
    id: 'sensor-posicao',
    name: 'Sensor de posição',
    system: 'Elétrica & sensores' as const,
    detail: 'Indutivo • 24 VDC',
    specs: ['24 VDC', 'Indutivo', 'Atual'] as [string, string, string],
  },
  {
    id: 'sensor-pressao',
    name: 'Sensor de pressão',
    system: 'Elétrica & sensores' as const,
    detail: '0–250 bar • 4–20 mA',
    specs: ['0–250 bar', '4–20 mA', 'Atual'] as [string, string, string],
  },
  {
    id: 'rele',
    name: 'Relé de segurança',
    system: 'Elétrica & sensores' as const,
    detail: 'Monitoramento ativo • PL e',
    specs: ['24 VDC', 'PL e', 'Atual'] as [string, string, string],
  },
];

export const MACHINES: Machine[] = [
  { id: 'PH-04', name: 'PH-04', type: 'Prensa hidráulica', line: 'Linha de Prensas', area: 'Conformação', state: 'Atenção', downtime: '4h02', preventive: '312h', docs: '98%', components: commonComponents },
  { id: 'CNC-05', name: 'CNC-05', type: 'Centro de usinagem', line: 'Usinagem', area: 'Usinagem CNC', state: 'Parada', downtime: '2h00', preventive: '1d', docs: '100%', components: commonComponents.map(c => ({ ...c, warning: undefined })) },
  { id: 'EST-03', name: 'EST-03', type: 'Esteira de expedição', line: 'Expedição', area: 'Logística', state: 'Operando', downtime: '32m', preventive: '18d', docs: '96%', components: commonComponents.map(c => ({ ...c, warning: undefined })) },
  { id: 'PH-06', name: 'PH-06', type: 'Prensa hidráulica', line: 'Linha de Prensas', area: 'Conformação', state: 'Operando', downtime: '18m', preventive: '9d', docs: '100%', components: commonComponents.map(c => ({ ...c, warning: undefined })) },
  { id: 'CNC-02', name: 'CNC-02', type: 'Centro de usinagem', line: 'Usinagem', area: 'Usinagem CNC', state: 'Operando', downtime: '12m', preventive: '21d', docs: '100%', components: commonComponents.map(c => ({ ...c, warning: undefined })) },
  { id: 'PH-01', name: 'PH-01', type: 'Prensa hidráulica', line: 'Linha de Prensas', area: 'Conformação', state: 'Operando', downtime: '8m', preventive: '17d', docs: '94%', components: commonComponents.map(c => ({ ...c, warning: undefined })) },
  { id: 'EMP-01', name: 'EMP-01', type: 'Empacotadora', line: 'Expedição', area: 'Logística', state: 'Operando', downtime: '0m', preventive: '26d', docs: '92%', components: commonComponents.map(c => ({ ...c, warning: undefined })) },
  { id: 'CNC-08', name: 'CNC-08', type: 'Centro de usinagem', line: 'Usinagem', area: 'Usinagem CNC', state: 'Operando', downtime: '5m', preventive: '30d', docs: '100%', components: commonComponents.map(c => ({ ...c, warning: undefined })) },
];

export const INITIAL_OS: WorkOrder[] = [
  { id: 'OS-1042', machineId: 'PH-04', title: 'Corretiva no acoplamento', type: 'Corretiva', priority: 'Crítica', status: 'Aberta', specialty: 'Mecânica', duration: '4h', description: 'Vibração acima do padrão no conjunto de acionamento.', progress: 20 },
  { id: 'OS-1041', machineId: 'CNC-05', title: 'Inspeção do eixo principal', type: 'Inspeção', priority: 'Alta', status: 'Planejada', specialty: 'Mecânica', duration: '2h', description: 'Inspeção planejada durante janela técnica.', progress: 48 },
  { id: 'OS-1038', machineId: 'PH-06', title: 'Inspeção hidráulica', type: 'Preventiva', priority: 'Média', status: 'Planejada', specialty: 'Hidráulica', duration: '1h30', description: 'Inspeção agrupada à parada planejada.', progress: 62 },
  { id: 'OS-1031', machineId: 'EST-03', title: 'Ajuste de sensor', type: 'Corretiva', priority: 'Baixa', status: 'Pronta para encerrar', specialty: 'Eletrônica', duration: '32m', description: 'Intervenção executada, aguardando evidência.', progress: 92 },
];

export const INITIAL_AGENDA: AgendaItem[] = [
  { id: 'AG-1', machineId: 'PH-04', date: '2026-09-12', time: '08:30', duration: '4h', title: 'Preventiva do acionamento', team: 'Mecânica 2', kind: 'Preventiva', priority: 'Crítica' },
  { id: 'AG-2', machineId: 'CNC-05', date: '2026-09-13', time: '09:00', duration: '2h', title: 'Inspeção do eixo', team: 'Mecânica 1', kind: 'Inspeção', priority: 'Alta' },
  { id: 'AG-3', machineId: 'EST-03', date: '2026-09-13', time: '13:00', duration: '45m', title: 'Encerramento técnico', team: 'Eletrônica 1', kind: 'Corretiva', priority: 'Baixa' },
  { id: 'AG-4', machineId: 'PH-06', date: '2026-09-16', time: '10:30', duration: '1h30', title: 'Inspeção hidráulica', team: 'Hidráulica 2', kind: 'Preventiva', priority: 'Média' },
  { id: 'AG-5', machineId: 'EMP-01', date: '2026-09-03', time: '14:00', duration: '1h', title: 'Verificação de sensores', team: 'Eletrônica 1', kind: 'Inspeção', priority: 'Baixa' },
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  { id: 'N-1', title: 'OS crítica criada para PH-04', detail: 'Corretiva do acoplamento registrada e notificada imediatamente.', target: 'os', machineId: 'PH-04' },
  { id: 'N-2', title: 'Encerramento pendente na EST-03', detail: 'Foto e assinatura são obrigatórias para fechar a intervenção.', target: 'os', machineId: 'EST-03' },
  { id: 'N-3', title: 'Pendência documental na PH-04', detail: 'Diagrama de automação ausente para a configuração atual.', target: 'machines', machineId: 'PH-04' },
  { id: 'N-4', title: 'Preventiva da CNC-05 entra em janela amanhã', detail: 'Equipe e parada já reservadas.', target: 'agenda', machineId: 'CNC-05' },
  { id: 'N-5', title: 'Vibração acima do limite', detail: 'PH-04 registrou 2,1 mm/s no conjunto de acionamento.', target: 'telemetry', machineId: 'PH-04' },
  { id: 'N-6', title: 'Documento traduzido', detail: 'Manual do inversor possui tradução PT-BR disponível.', target: 'machines', machineId: 'PH-04' },
];
