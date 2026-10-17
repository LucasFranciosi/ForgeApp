export type ScreenKey =
  | 'home'
  | 'machines'
  | 'os'
  | 'agenda'
  | 'telemetry'
  | 'notifications'
  | 'structure'
  | 'preventives'
  | 'documents'
  | 'findings';

export type Priority = 'Crítica' | 'Alta' | 'Média' | 'Baixa';
export type WorkOrderStatus =
  | 'Aberta'
  | 'Planejada'
  | 'Em execução'
  | 'Pronta para encerrar'
  | 'Encerrada';

export type WorkOrder = {
  id: string;
  machineId: string;
  title: string;
  type: 'Corretiva' | 'Preventiva' | 'Inspeção';
  priority: Priority;
  status: WorkOrderStatus;
  specialty: string;
  duration: string;
  description: string;
  progress: number;
  /** Persisted aggregate metadata. The UI never mutates these values directly. */
  version?: number;
  domainStatus?: 'open' | 'scheduled' | 'inProgress' | 'paused' | 'completed' | 'cancelled';
  scheduledAt?: string;
};

export type AgendaItem = {
  id: string;
  machineId: string;
  date: string;
  time: string;
  duration: string;
  title: string;
  team: string;
  kind: 'Preventiva' | 'Inspeção' | 'Parada técnica' | 'Corretiva';
  priority: Priority;
};

export type ComponentItem = {
  id: string;
  name: string;
  system: 'Acionamento' | 'Hidráulico' | 'Elétrica & sensores';
  detail: string;
  warning?: string;
  specs: [string, string, string];
  version?: number;
};

export type Machine = {
  id: string;
  name: string;
  type: string;
  line: string;
  area: string;
  state: 'Operando' | 'Atenção' | 'Parada';
  downtime: string;
  preventive: string;
  docs: string;
  components: ComponentItem[];
  version?: number;
};

export type NotificationItem = {
  id: string;
  title: string;
  detail: string;
  target?: ScreenKey;
  machineId?: string;
};
