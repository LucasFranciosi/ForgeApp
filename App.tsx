import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import { C } from './src/theme';
import { AgendaItem, Machine, NotificationItem, ScreenKey, WorkOrder } from './src/types';
import { INITIAL_NOTIFICATIONS, INITIAL_OS, MACHINES } from './src/mock';
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { OSScreen } from './src/screens/OSScreen';
import { MachinesScreen } from './src/screens/MachinesScreen';
import { AgendaScreen } from './src/screens/AgendaScreen';
import { TelemetryScreen } from './src/screens/TelemetryScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { StructureScreen } from './src/screens/StructureScreen';
import { PreventivesScreen } from './src/screens/PreventivesScreen';
import { DocumentsScreen } from './src/screens/DocumentsScreen';
import { FindingsScreen } from './src/screens/FindingsScreen';
import { BottomNav, DrawerHandle, Header, SidePanel } from './src/components/AppChrome';
import { AIPanel } from './src/components/AIPanel';
import { CloseOSSheet, CreateOSSheet } from './src/components/Forms';
import { createForgeServices } from './src/core/application/createForgeServices';
import { DomainRuleViolation } from './src/core/domain/WorkOrder';
import { fromWorkOrderView, priorityToDomain, toWorkOrderView, typeToDomain } from './src/presentation/workOrders';
import { componentSnapshot, machineSnapshot, machineView } from './src/presentation/machines';
import { DailyPerformance } from './src/core/application/PerformanceService';
import { PlantSnapshot, SectorSnapshot } from './src/core/domain/Structure';
import { PreventiveExecutionSnapshot, PreventivePlanSnapshot } from './src/core/domain/Preventive';
import { FindingSnapshot } from './src/core/domain/Finding';
import { TechnicalDocumentSnapshot } from './src/core/domain/TechnicalDocument';
import { LocalModelSnapshot } from './src/core/domain/LocalModel';
import { ThreeDModelSnapshot } from './src/core/domain/ThreeDModel';
import { MachineDowntimeSnapshot } from './src/core/domain/Operations';

const pageMeta: Record<ScreenKey, { crumb: string; title: string }> = {
  home: { crumb: 'PLANTA / UNIDADE SP', title: 'Hoje' },
  machines: { crumb: 'ATIVOS / MÁQUINAS', title: 'Máquinas & componentes' },
  os: { crumb: 'MANUTENÇÃO / OPERAÇÃO', title: 'Ordens de serviço' },
  agenda: { crumb: 'MANUTENÇÃO / AGENDA', title: 'Agenda técnica' },
  telemetry: { crumb: 'MÁQUINA / TELEMETRIA', title: 'Telemetria detalhada' },
  notifications: { crumb: 'ALERTAS / NOTIFICAÇÕES', title: 'Notificações' },
  structure: { crumb: 'CADASTRO / ESTRUTURA', title: 'Estrutura da planta' },
  preventives: { crumb: 'MANUTENÇÃO / PREVENTIVAS', title: 'Preventivas' },
  documents: { crumb: 'TÉCNICA / DOCUMENTOS', title: 'Documentos locais' },
  findings: { crumb: 'MANUTENÇÃO / FINDINGS', title: 'Anomalias e findings' },
};

export default function App() {
  const [logged, setLogged] = useState(false);
  const [screen, setScreen] = useState<ScreenKey>('home');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [telemetryMachineId, setTelemetryMachineId] = useState('PH-04');

  const [orders, setOrders] = useState<WorkOrder[]>(INITIAL_OS);
  const [machines, setMachines] = useState<Machine[]>(MACHINES);
  const [dailyPerformance, setDailyPerformance] = useState<Record<string, DailyPerformance>>({});
  const [telemetryReadings,setTelemetryReadings]=useState<Record<string, import('./src/core/domain/Schedule').TelemetryReadingSnapshot[]>>({});
  const [plants, setPlants] = useState<PlantSnapshot[]>([]);
  const [sectors, setSectors] = useState<SectorSnapshot[]>([]);
  const [preventivePlans, setPreventivePlans] = useState<PreventivePlanSnapshot[]>([]);
  const [preventiveExecutions, setPreventiveExecutions] = useState<PreventiveExecutionSnapshot[]>([]);
  const [findings, setFindings] = useState<FindingSnapshot[]>([]);
  const [documents, setDocuments] = useState<TechnicalDocumentSnapshot[]>([]);
  const [localModels, setLocalModels] = useState<LocalModelSnapshot[]>([]);
  const [threeDModels, setThreeDModels] = useState<Record<string, ThreeDModelSnapshot | null>>({});
  const [machineDowntimes, setMachineDowntimes] = useState<Record<string, MachineDowntimeSnapshot[]>>({});
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const [drawer, setDrawer] = useState(false);
  const [ai, setAI] = useState(false);
  const [createOS, setCreateOS] = useState(false);
  const [closeOrder, setCloseOrder] = useState<WorkOrder | null>(null);
  const services = useMemo(createForgeServices, []);

  useEffect(() => {
    if (!logged) return;
    let active = true;
    void (async () => {
      try {
        await services.workOrders.seed(INITIAL_OS.map(fromWorkOrderView));
        const stored = await services.workOrders.list();
        if (active) setOrders(stored.map(toWorkOrderView));
      } catch (error) {
        if (active) Alert.alert('Banco local indisponível', error instanceof Error ? error.message : 'Não foi possível carregar as OS locais.');
      }
    })();
    return () => { active = false; };
  }, [logged, services]);

  const refreshStructure = async () => { setPlants(await services.structure.plants()); setSectors(await services.structure.sectors()); };
  useEffect(() => {
    if (!logged) return;
    void (async () => {
      const timestamp = new Date().toISOString();
      try {
        await services.structure.seed({ id:'plant-demo',name:'Unidade SP',status:'active',createdAt:timestamp,updatedAt:timestamp,version:1 }, ['Conformação','Usinagem CNC','Expedição'].map((name,index)=>({id:`sector-demo-${index}`,plantId:'plant-demo',name,sortOrder:index,status:'active' as const,createdAt:timestamp,updatedAt:timestamp,version:1})));
        await refreshStructure();
      } catch (error) { Alert.alert('Estrutura indisponível', error instanceof Error ? error.message : 'Não foi possível carregar a estrutura local.'); }
    })();
  }, [logged, services]);

  const refreshMachines = async (): Promise<Machine[]> => {
    const stored = await services.machines.list();
    const views = await Promise.all(stored.map(async machine => machineView(machine, await services.machines.components(machine.id))));
    setMachines(views);
    return views;
  };
  const refreshPreventives = async () => { setPreventivePlans(await services.preventives.plans()); setPreventiveExecutions(await services.preventives.executions()); };
  const refreshFindings = async () => setFindings(await services.findings.list());
  const refreshDocuments = async () => { const stored = await services.documents.list(); await services.documents.audit(stored); setDocuments(await services.documents.list()); };
  useEffect(() => {
    if (!logged) return;
    let active = true;
    void (async () => {
      try {
        await services.machines.seed(MACHINES.map(machineSnapshot), MACHINES.flatMap(machine => machine.components.map(component => componentSnapshot(machine.id, component))));
        const views = await refreshMachines();
        const date = new Date().toISOString().slice(0, 10);
        const results = await Promise.all(views.map(async machine => {
          const timestamp = new Date().toISOString();
          await services.performance.setSchedule({ id: `${machine.id}:default-schedule`, machineId: machine.id, effectiveFrom: '2026-01-01', minutes: [960,960,960,960,960,480,0], createdAt: timestamp, updatedAt: timestamp, version: 1 });
          return services.performance.calculateDay(machine.id, date);
        }));
        if (active) setDailyPerformance(Object.fromEntries(results.map(result => [result.machineId, result])));
      } catch (error) { if (active) Alert.alert('Cadastro local indisponível', error instanceof Error ? error.message : 'Não foi possível carregar as máquinas.'); }
    })();
    return () => { active = false; };
  }, [logged, services]);
  useEffect(() => { if (logged) void refreshPreventives(); }, [logged, services]);
  useEffect(() => { if (logged) void refreshFindings(); }, [logged, services]);
  useEffect(() => { if (logged) void refreshDocuments(); }, [logged, services]);
  useEffect(() => {
    if (!logged) return;
    void (async () => {
      const existing = await services.localModels.list();
      if (!existing.length) {
        const now = new Date().toISOString();
        await Promise.all(([
          ['llm', 'LLM técnico'], ['embedding', 'Embeddings locais'], ['whisper', 'Transcrição local'], ['vision', 'Visão técnica'],
        ] as const).map(([type, name]) => services.localModels.save({ id: `model-${type}`, name, type, sizeBytes: 0, status: 'absent', updatedAt: now, version: 1 })));
      }
      setLocalModels(await services.localModels.list());
    })();
  }, [logged, services]);

  const activeMachine = selectedMachine ?? machines[0] ?? MACHINES[0];
  const meta = pageMeta[screen];
  const agenda = useMemo<AgendaItem[]>(() => {
    const orderItems = orders.filter(order => order.domainStatus === 'scheduled' && order.scheduledAt).map(order => {
      const at = new Date(order.scheduledAt!);
      return { id: `os-${order.id}`, machineId: order.machineId, date: at.toISOString().slice(0, 10), time: at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), duration: order.duration, title: order.title, team: order.specialty, kind: order.type, priority: order.priority };
    });
    const preventiveItems = preventiveExecutions.filter(item => ['scheduled', 'inProgress', 'paused'].includes(item.status)).map(item => {
      const at = new Date(item.scheduledAt); const plan = preventivePlans.find(candidate => candidate.id === item.planId);
      return { id: `preventive-${item.id}`, machineId: item.machineId, date: at.toISOString().slice(0, 10), time: at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), duration: 'Preventiva', title: plan?.name ?? 'Preventiva programada', team: 'Manutenção', kind: 'Preventiva' as const, priority: 'Média' as const };
    });
    return [...orderItems, ...preventiveItems].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  }, [orders, preventiveExecutions, preventivePlans]);

  const openMachine = (id: string) => {
    setSelectedMachine(machines.find(m => m.id === id) ?? machines[0] ?? MACHINES[0]);
    setScreen('machines');
  };

  const createWorkOrder = async (order: WorkOrder) => {
    try {
      const created = await services.workOrders.create({
        id: order.id, machineId: order.machineId, code: order.id, title: order.title, description: order.description,
        type: typeToDomain[order.type], discipline: 'mixed', priority: priorityToDomain[order.priority], requiresPhoto: false, requiresSignature: false,
      });
      const view = toWorkOrderView(created);
      setOrders(prev => [view, ...prev]);
    setNotifications(prev => [
      {
        id: `N-${Date.now()}`, title: `Nova OS ${order.type.toLowerCase()} • ${order.machineId}`, detail: `${order.priority} • ${order.description}`,
        target: 'os',
        machineId: order.machineId,
      },
      ...prev,
    ]);
      Alert.alert('OS criada', 'A ordem foi gravada localmente e entrou na fila operacional.');
    } catch (error) { Alert.alert('Não foi possível criar a OS', error instanceof Error ? error.message : 'Erro local desconhecido.'); }
  };

  const closeWorkOrder = async (id: string, evidence: { photo: boolean; signature: boolean }) => {
    const order = orders.find(o => o.id === id);
    if (!order?.version) { Alert.alert('Aguarde', 'A OS ainda está sendo carregada do banco local.'); return false; }
    try {
      const completed = await services.workOrders.transition(id, order.version, 'complete', evidence);
      const view = toWorkOrderView(completed);
      setOrders(prev => prev.map(o => o.id === id ? view : o));
    if (order) {
      setNotifications(prev => [
        {
          id: `N-${Date.now()}`,
          title: `OS encerrada • ${order.machineId}`,
          detail: `${order.id} encerrada com foto e assinatura.`,
          target: 'os',
          machineId: order.machineId,
        },
        ...prev,
      ]);
    }
      Alert.alert('OS encerrada', 'Evidências, fechamento e histórico foram gravados localmente.');
      return true;
    } catch (error) {
      const message = error instanceof DomainRuleViolation || error instanceof Error ? error.message : 'Erro local desconhecido.';
      Alert.alert('Encerramento bloqueado', message);
      return false;
    }
  };

  const openNotification = (item: NotificationItem) => {
    if (item.target === 'machines' && item.machineId) {
      openMachine(item.machineId);
      return;
    }
    if (item.target === 'telemetry') {
      setTelemetryMachineId(item.machineId ?? 'PH-04');
      setScreen('telemetry');
      return;
    }
    setScreen(item.target ?? 'home');
  };

  if (!logged) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#F4F6F9" />
        <LoginScreen onLogin={() => setLogged(true)} />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBFD" />
      <View style={styles.root}>
        <Header
          crumb={meta.crumb}
          title={meta.title}
          notificationCount={notifications.length}
          onNotifications={() => setScreen('notifications')}
          onMore={() => setDrawer(true)}
        />

        <View style={styles.body}>
          {screen === 'home' && (
            <HomeScreen
              orders={orders}
              onOS={() => setScreen('os')}
              onMachine={openMachine}
              onAgenda={() => setScreen('agenda')}
              onCloseOS={setCloseOrder}
            />
          )}
          {screen === 'os' && (
            <OSScreen
              orders={orders} onMachine={openMachine} onClose={setCloseOrder}
              onTransition={async (order, action) => {
                if (!order.version) { Alert.alert('Aguarde', 'OS ainda sendo carregada.'); return false; }
                try { const next = await services.workOrders.transition(order.id, order.version, action, { scheduledAt: new Date().toISOString(), reason: 'Atualização operacional' }); setOrders(current => current.map(item => item.id === order.id ? toWorkOrderView(next) : item)); return true; }
                catch (error) { Alert.alert('Transição bloqueada', error instanceof Error ? error.message : 'Erro local.'); return false; }
              }}
            />
          )}
          {screen === 'machines' && (
            <MachinesScreen
              machines={machines}
              selected={selectedMachine}
              onSelectMachine={machine => { setSelectedMachine(machine); if (machine) void Promise.all([services.threeDModels.audit(machine.id),services.machines.downtimes(machine.id)]).then(([model,downtimes]) => { setThreeDModels(current => ({ ...current, [machine.id]: model })); setMachineDowntimes(current => ({...current,[machine.id]:downtimes})); }); }}
              onPersistComponent={async (machineId, component) => {
                try {
                  const existing = (await services.machines.components(machineId)).find(item => item.code === component.id);
                  if (existing) await services.machines.updateComponent({ ...existing, name: component.name, description: component.detail, isCritical: !!component.warning, updatedAt: new Date().toISOString(), version: existing.version + 1 }, existing.version);
                  else await services.machines.addComponent(componentSnapshot(machineId, component));
                  await refreshMachines();
                  return true;
                } catch (error) { Alert.alert('Componente não salvo', error instanceof Error ? error.message : 'Erro local desconhecido.'); }
                return false;
              }}
              performance={dailyPerformance[activeMachine.id]}
              onTelemetry={() => {
                setTelemetryMachineId(activeMachine.id);
                setScreen('telemetry');
              }}
              onChangeOperationalStatus={async (machine, status) => {
                try {
                  await services.machines.changeOperationalStatus(machine.id, status, machine.version ?? 1, status === 'fault' ? 'Falha registrada pelo técnico.' : 'Atualização operacional pelo técnico.');
                  const updated = await refreshMachines();
                  setSelectedMachine(updated.find(item => item.id === machine.id) ?? null);
                  Alert.alert('Estado atualizado', 'A mudança operacional foi gravada no histórico local.');
                  return true;
                } catch (error) { Alert.alert('Estado não atualizado', error instanceof Error ? error.message : 'Erro local desconhecido.'); return false; }
              }}
              onPreventives={() => setScreen('preventives')}
              onDocuments={() => setScreen('documents')}
              onFindings={() => setScreen('findings')}
              onSaveTechnical={async (machine,availability,efficiency,weekdayMinutes)=>{
                if(!Number.isFinite(availability)||!Number.isFinite(efficiency)||!Number.isInteger(weekdayMinutes)){Alert.alert('Valores inválidos','Informe números válidos para SLA e jornada.');return false;}
                try{const now=new Date().toISOString();await services.sla.publish({id:`sla-${Date.now()}`,machineId:machine.id,effectiveFrom:new Date().toISOString().slice(0,10),minimumAvailabilityPercent:availability,minimumEfficiencyPercent:efficiency,createdAt:now,updatedAt:now,version:1});await services.performance.setSchedule({id:`${machine.id}:default-schedule`,machineId:machine.id,effectiveFrom:'2026-01-01',minutes:[weekdayMinutes,weekdayMinutes,weekdayMinutes,weekdayMinutes,weekdayMinutes,Math.round(weekdayMinutes/2),0],createdAt:now,updatedAt:now,version:1});const result=await services.performance.calculateDay(machine.id,new Date().toISOString().slice(0,10));setDailyPerformance(current=>({...current,[machine.id]:result}));Alert.alert('Configuração salva','Jornada e metas foram gravadas localmente.');return true;}catch(error){Alert.alert('Não foi possível salvar',error instanceof Error?error.message:'Erro local.');return false;}
              }}
              onAddException={async(machine,type,minutes)=>{try{const now=new Date();const date=now.toISOString().slice(0,10);const startsAt=`${date}T00:00:00.000Z`;const endsAt=`${date}T23:59:59.999Z`;await services.performance.addException({id:`exception-${Date.now()}`,machineId:machine.id,startsAt,endsAt,type,plannedMinutes:minutes||undefined,createdAt:now.toISOString(),updatedAt:now.toISOString()});const result=await services.performance.calculateDay(machine.id,date);setDailyPerformance(current=>({...current,[machine.id]:result}));Alert.alert('Exceção registrada','O calendário e os indicadores foram recalculados localmente.');return true;}catch(error){Alert.alert('Não foi possível registrar',error instanceof Error?error.message:'Erro local.');return false;}}}
              threeDModel={threeDModels[activeMachine.id]}
              onImportThreeD={async(machine,file)=>{try{const now=new Date().toISOString();const model=await services.threeDModels.import({id:`3d-${Date.now()}`,machineId:machine.id,localUri:file.uri,fileName:file.name,fileSize:file.size,status:'pending',createdAt:now,updatedAt:now,version:1});setThreeDModels(current=>({...current,[machine.id]:model}));Alert.alert('Modelo local associado','O arquivo foi preservado no armazenamento privado. O preview 2D segue disponível até um renderizador GLB/GLTF ser provisionado.');return true;}catch(error){Alert.alert('Modelo não importado',error instanceof Error?error.message:'Erro local.');return false;}}}
              downtimes={machineDowntimes[activeMachine.id] ?? []}
              onOpenDowntime={async(machine,type,startedAt,reason)=>{try{await services.machines.startDowntime({id:`downtime-${Date.now()}`,machineId:machine.id,type,reason,startedAt});const updated=await services.machines.downtimes(machine.id);setMachineDowntimes(current=>({...current,[machine.id]:updated}));const result=await services.performance.calculateDay(machine.id,startedAt.slice(0,10));setDailyPerformance(current=>({...current,[machine.id]:result}));Alert.alert('Parada aberta','A parada foi registrada e os indicadores locais foram atualizados.');return true;}catch(error){Alert.alert('Parada não aberta',error instanceof Error?error.message:'Erro local.');return false;}}}
              onCloseDowntime={async(downtime,endedAt)=>{try{await services.machines.finishDowntime(downtime.id,endedAt);const updated=await services.machines.downtimes(downtime.machineId);setMachineDowntimes(current=>({...current,[downtime.machineId]:updated}));const result=await services.performance.calculateDay(downtime.machineId,downtime.startedAt.slice(0,10));setDailyPerformance(current=>({...current,[downtime.machineId]:result}));Alert.alert('Parada encerrada','A duração e os indicadores foram recalculados localmente.');return true;}catch(error){Alert.alert('Parada não encerrada',error instanceof Error?error.message:'Erro local.');return false;}}}
            />
          )}
          {screen === 'agenda' && <AgendaScreen agenda={agenda} machines={machines} />}
          {screen === 'telemetry' && <TelemetryScreen machineId={telemetryMachineId} performance={dailyPerformance[telemetryMachineId]} readings={telemetryReadings[telemetryMachineId]} onRecordOperation={async(type,startedAt,endedAt,notes)=>{try { await services.performance.addOperation({id:`operation-${Date.now()}`,machineId:telemetryMachineId,type,startedAt,endedAt,notes,createdAt:new Date().toISOString()}); const date=startedAt.slice(0,10); const result=await services.performance.calculateDay(telemetryMachineId,date); setDailyPerformance(current=>({...current,[telemetryMachineId]:result})); return true;} catch(error) {Alert.alert('Período inválido',error instanceof Error?error.message:'Não foi possível gravar o período.');return false;}}} onRecordReading={async(metric,value,notes)=>{try{const now=new Date().toISOString(),id=`reading-${Date.now()}`,unit=metric==='vibration'?'mm/s':metric==='temperature'?'°C':'A';const reading={id,machineId:telemetryMachineId,metric,value,unit,measuredAt:now,notes,createdAt:now};await services.performance.recordTelemetry(reading);setTelemetryReadings(current=>({...current,[telemetryMachineId]:[reading,...(current[telemetryMachineId]??[])]}));return true;}catch(error){Alert.alert('Leitura inválida',error instanceof Error?error.message:'Não foi possível gravar.');return false;}}} />}
          {screen === 'notifications' && <NotificationsScreen notifications={notifications} onOpen={openNotification} />}
          {screen === 'structure' && <StructureScreen machines={machines} plants={plants} sectors={sectors} onMachine={openMachine} onCreate={async (kind, values) => {
            const timestamp = new Date().toISOString();
            try {
              if (kind === 'Planta') await services.structure.createPlant({ id:`plant-${Date.now()}`,name:values.name,status:'active',createdAt:timestamp,updatedAt:timestamp,version:1 });
              if (kind === 'Setor') await services.structure.createSector({ id:`sector-${Date.now()}`,plantId:values.plantId ?? '',name:values.name,sortOrder:sectors.length,status:'active',createdAt:timestamp,updatedAt:timestamp,version:1 });
              if (kind === 'Máquina') { await services.machines.create({ id:values.code ?? `machine-${Date.now()}`,plantId:values.plantId ?? 'plant-demo',sectorId:values.sectorId,sectorName:values.sector,code:values.code ?? '',name:values.name,machineType:'Máquina industrial',lifecycleStatus:'active',operationalStatus:'stopped',createdAt:timestamp,updatedAt:timestamp,version:1 }); await refreshMachines(); }
              await refreshStructure(); Alert.alert(`${kind} criado`, 'Cadastro gravado localmente.'); return true;
            } catch (error) { Alert.alert('Não foi possível salvar', error instanceof Error ? error.message : 'Erro local desconhecido.'); return false; }
          }} />}
          {screen === 'preventives' && (
            <PreventivesScreen
              machines={machines} plans={preventivePlans} executions={preventiveExecutions}
              onCreatePlan={async (name, machineId, sectionCount, actionsPerSection) => {
                try {
                  const id = `plan-${Date.now()}`; const now = new Date().toISOString();
                  await services.preventives.createPlan(
                    { id, machineId, name, frequencyType: 'months', frequencyValue: 1, status: 'active', createdAt: now, updatedAt: now, version: 1 },
                    Array.from({length:sectionCount},(_,index)=>({ id: `${id}:section:${index+1}`, planId: id, machineId, name: `Seção ${index+1} · inspeção`, discipline: 'mixed' as const, sequence: index+1, isRequired: true, estimatedMinutes: 15 })),
                    Array.from({length:sectionCount},(_,sectionIndex)=>Array.from({length:actionsPerSection},(_,actionIndex)=>({ id: `${id}:action:${sectionIndex+1}:${actionIndex+1}`, sectionId: `${id}:section:${sectionIndex+1}`, description: `Ação ${actionIndex+1} da seção ${sectionIndex+1}`, isRequired: true, sequence: actionIndex+1 }))).flat()
                  );
                  await refreshPreventives(); Alert.alert('Plano criado', 'Plano, seção e ação inicial foram gravados localmente.'); return true;
                } catch (error) { Alert.alert('Não foi possível criar', error instanceof Error ? error.message : 'Erro local.'); return false; }
              }}
              onSchedule={async plan => {
                try {
                  const now = new Date().toISOString(); const id = `exec-${Date.now()}`;
                  await services.preventives.scheduleFromPlan({ id, machineId: plan.machineId, planId: plan.id, scheduledAt: now, createdAt: now, updatedAt: now });
                  await refreshPreventives(); Alert.alert('Execução agendada', 'A preventiva foi adicionada à fila local.'); return true;
                } catch (error) { Alert.alert('Não foi possível agendar', error instanceof Error ? error.message : 'Erro local.'); return false; }
              }}
              onTransition={async (execution, action, sectionExecutionId, actionExecutionId) => {
                try {
                  const section = execution.sections[0]; const operation = await services.preventives.transition(execution.id, execution.version, action, {
                    sectionExecutionId: sectionExecutionId ?? section?.id,
                    actionExecutionId: actionExecutionId ?? section?.actions[0]?.id,
                  });
                  await refreshPreventives(); return operation;
                } catch (error) { Alert.alert('Transição bloqueada', error instanceof Error ? error.message : 'Erro local.'); return null; }
              }}
            />
          )}
          {screen === 'documents' && (
            <DocumentsScreen
              machines={machines} documents={documents}
              onAdd={async data => {
                try {
                  const now = new Date().toISOString();
                  await services.documents.ingest({ id: `doc-${Date.now()}`, machineId: data.machineId, componentId: data.componentId, discipline: data.discipline, title: data.title, documentType: data.type, localUri: data.uri, fileName: data.fileName, mimeType: data.mimeType, fileSize: data.fileSize, indexingStatus: 'pending', createdAt: now, updatedAt: now, version: 1 });
                  await refreshDocuments(); Alert.alert('Documento adicionado', 'Arquivo associado localmente e pendente de indexação.'); return true;
                } catch (error) { Alert.alert('Não foi possível salvar', error instanceof Error ? error.message : 'Erro local.'); return false; }
              }}
              onExists={uri => services.documents.exists(uri)}
              onReindex={async document => {
                try { await services.documents.mark(document.id, 'pending', document.version); await refreshDocuments(); Alert.alert('Reindexação solicitada', 'O documento voltou para a fila local.'); return true; }
                catch (error) { Alert.alert('Não foi possível reindexar', error instanceof Error ? error.message : 'Erro local.'); return false; }
              }}
            />
          )}
          {screen === 'findings' && (
            <FindingsScreen
              machines={machines} findings={findings}
              onCreate={async (title, machineId, severity, description, componentId) => {
                try { const now = new Date().toISOString(); await services.findings.create({ id: `finding-${Date.now()}`, machineId, componentId, title, description, severity, status: 'open', createdAt: now, updatedAt: now, version: 1 }); await refreshFindings(); return true; }
                catch (error) { Alert.alert('Não foi possível registrar', error instanceof Error ? error.message : 'Erro local.'); return false; }
              }}
              onTransition={async (finding, action, notes) => {
                try {
                  let workOrderId: string | undefined;
                  if (action === 'convert') { workOrderId = `OS-${Date.now()}`; await services.workOrders.create({ id: workOrderId, machineId: finding.machineId, code: workOrderId, title: `Corretiva · ${finding.title}`, description: finding.description, type: 'corrective', discipline: 'mixed', priority: finding.severity === 'critical' ? 'critical' : 'high', requiresPhoto: false, requiresSignature: false }); }
                  await services.findings.transition(finding.id, finding.version, action, { notes, workOrderId }); await refreshFindings(); return true;
                } catch (error) { Alert.alert('Transição bloqueada', error instanceof Error ? error.message : 'Erro local.'); return false; }
              }}
            />
          )}
        </View>

        <DrawerHandle onOpen={() => setDrawer(true)} />
        <BottomNav
          active={screen}
          onNavigate={next => {
            if (next === 'machines') setSelectedMachine(null);
            setScreen(next);
          }}
          onAI={() => setAI(true)}
        />

        <SidePanel
          visible={drawer}
          onClose={() => setDrawer(false)}
          onCreateOS={() => { setDrawer(false); setCreateOS(true); }}
          onCreateAgenda={() => { setDrawer(false); setScreen('agenda'); }}
          onStructure={() => { setDrawer(false); setScreen('structure'); }}
          onPreventives={() => { setDrawer(false); setScreen('preventives'); }}
          onDocuments={() => { setDrawer(false); setScreen('documents'); }}
        />
        <AIPanel visible={ai} onClose={() => setAI(false)} models={localModels} />

        <CreateOSSheet
          visible={createOS}
          machines={machines}
          onClose={() => setCreateOS(false)}
          onCreate={createWorkOrder}
        />
        <CloseOSSheet
          visible={!!closeOrder}
          order={closeOrder}
          onClose={() => setCloseOrder(null)}
          onConfirm={closeWorkOrder}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFBFD' },
  root: { flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0 },
  body: { flex: 1, paddingBottom: 98 },
});
