import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { ComponentItem, Machine } from '../types';
import { C } from '../theme';
import { ThreeDViewer } from '../components/ThreeDViewer';
import { DailyPerformance } from '../core/application/PerformanceService';
import * as DocumentPicker from 'expo-document-picker';
import { ThreeDModelSnapshot } from '../core/domain/ThreeDModel';
import { MachineDowntimeSnapshot } from '../core/domain/Operations';

export function MachinesScreen({
  machines,
  selected,
  onSelectMachine,
  onTelemetry,
  onPersistComponent,
  onChangeOperationalStatus,
  performance,
  onPreventives,
  onDocuments,
  onFindings,
  onSaveTechnical,
  onAddException,
  threeDModel,
  onImportThreeD,
  downtimes,
  onOpenDowntime,
  onCloseDowntime,
}: {
  machines: Machine[];
  selected: Machine | null;
  onSelectMachine: (machine: Machine | null) => void;
  onTelemetry: () => void;
  onPersistComponent: (machineId: string, component: ComponentItem) => Promise<boolean>;
  onChangeOperationalStatus: (machine: Machine, status: 'running' | 'stopped' | 'maintenance' | 'fault') => Promise<boolean>;
  performance?: DailyPerformance;
  onPreventives: () => void;
  onDocuments: () => void;
  onFindings: () => void;
  onSaveTechnical: (machine:Machine, availability:number, efficiency:number, weekdayMinutes:number)=>Promise<boolean>;
  onAddException:(machine:Machine,type:'holiday'|'factoryShutdown'|'extraShift'|'reducedShift'|'maintenanceWindow',minutes:number)=>Promise<boolean>;
  threeDModel?: ThreeDModelSnapshot | null;
  onImportThreeD: (machine: Machine, file: { uri: string; name?: string; size?: number }) => Promise<boolean>;
  downtimes: MachineDowntimeSnapshot[];
  onOpenDowntime: (machine: Machine, type: 'planned'|'unplanned', startedAt: string, reason: string) => Promise<boolean>;
  onCloseDowntime: (downtime: MachineDowntimeSnapshot, endedAt: string) => Promise<boolean>;
}) {
  const [query, setQuery] = useState('');
  const [component, setComponent] = useState<ComponentItem | null>(null);
  const [componentSets, setComponentSets] = useState<Record<string, ComponentItem[]>>({});
  const [editing, setEditing] = useState<ComponentItem | 'new' | null>(null);
  const [tab, setTab] = useState<'overview' | 'components' | 'maintenance' | 'technical'>('overview');
  const [technicalForm,setTechnicalForm]=useState(false);
  const [exceptionForm,setExceptionForm]=useState(false);
  const [downtimeForm,setDowntimeForm]=useState(false);

  const filtered = useMemo(
    () => machines.filter(m => `${m.id} ${m.type} ${m.line}`.toLowerCase().includes(query.toLowerCase())),
    [machines, query]
  );

  const visibleComponents = selected ? (componentSets[selected.id] ?? selected.components) : [];
  const saveComponent = async (draft: ComponentItem) => {
    if (!selected) return;
    if (!await onPersistComponent(selected.id, draft)) return;
    setComponentSets(current => {
      const list = current[selected.id] ?? selected.components;
      const exists = list.some(item => item.id === draft.id);
      return { ...current, [selected.id]: exists ? list.map(item => item.id === draft.id ? draft : item) : [...list, draft] };
    });
    setEditing(null);
    setComponent(draft);
  };

  if (selected) {
    return (
      <>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.back} onPress={() => onSelectMachine(null)}>
          <Icon name="arrow-left" size={18} color={C.ink} />
          <Text style={styles.backText}>Máquinas</Text>
        </Pressable>

        <View style={styles.machineInfo}>
          <View style={styles.infoTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.crumb}>{selected.line.toUpperCase()} / {selected.area.toUpperCase()}</Text>
              <Text style={styles.machineTitle}>{selected.id} · {selected.type}</Text>
              <Text style={styles.small}>Configuração vigente • revisão técnica 04</Text>
            </View>
            <View style={[styles.state, selected.state === 'Parada' && { backgroundColor: C.redSoft }, selected.state === 'Atenção' && { backgroundColor: C.accentSoft }]}>
              <Text style={[styles.stateText, selected.state === 'Parada' && { color: C.red }, selected.state === 'Atenção' && { color: '#92580A' }]}>{selected.state}</Text>
            </View>
          </View>

          <View style={styles.dataGrid}>
            <Data value={percent(performance?.efficiencyPercent)} label="Eficiência hoje" />
            <Data value={percent(performance?.availabilityPercent)} label="Disponibilidade" />
            <Data value={minutes(performance?.unplannedDowntimeMinutes)} label="Parada não plan." />
            <Pressable style={styles.data} onPress={onTelemetry}>
              <Text style={styles.dataValue}>{minutes(performance?.extraMinutes)}</Text>
              <Text style={styles.dataLabel}>Tempo extra</Text>
            </Pressable>
          </View>
          <Text style={styles.statusLabel}>Estado operacional</Text>
          <View style={styles.statusActions}>
            {([['running', 'Operando'], ['stopped', 'Parada'], ['maintenance', 'Manutenção'], ['fault', 'Falha']] as const).map(([status, label]) => (
              <Pressable key={status} style={styles.statusAction} onPress={() => void onChangeOperationalStatus(selected, status)}><Text style={styles.statusActionText}>{label}</Text></Pressable>
            ))}
          </View>
        </View>
        <View style={styles.tabs}>{([['overview','Visão geral'],['components','Componentes'],['maintenance','Manutenção'],['technical','Técnica']] as const).map(([key,label])=><Pressable key={key} onPress={()=>setTab(key)} style={[styles.tab,tab===key&&styles.tabActive]}><Text style={[styles.tabText,tab===key&&styles.tabTextActive]}>{label}</Text></Pressable>)}</View>

        {tab === 'overview' && <><View style={styles.viewer}>
          <ThreeDViewer model={threeDModel} />
          <View style={styles.viewerCaption}>
            <View><Text style={styles.viewerTitle}>Modelo mecânico 3D</Text><Text style={styles.viewerSmall}>GLB/GLTF local • preview 2D enquanto indisponível</Text></View>
            <Icon name="cube-scan" size={22} color="#D9DEE5" />
          </View>
        </View>
        <View style={styles.overviewCallout}><Icon name="lightning-bolt-outline" size={20} color="#92580A"/><View style={{flex:1}}><Text style={styles.calloutTitle}>Operação e desempenho</Text><Text style={styles.componentDetail}>Use as abas para registrar manutenção, consultar técnica e navegar na estrutura.</Text></View></View></>}

        {tab === 'components' && <><Pressable style={styles.componentAction} onPress={() => setEditing('new')}>
          <Icon name="plus-circle-outline" size={20} color="#FFF" />
          <Text style={styles.componentActionText}>Adicionar componente</Text>
        </Pressable>

        {(['Acionamento', 'Hidráulico', 'Elétrica & sensores'] as const).map(system => (
          <View key={system} style={styles.system}>
            <Text style={styles.systemTitle}>{system}</Text>
            <View style={styles.componentGrid}>
              {visibleComponents.filter(c => c.system === system).map(c => (
                <Pressable key={c.id} style={[styles.component, c.warning && styles.componentWarning]} onPress={() => setComponent(c)}>
                  <View style={styles.componentIcon}><Icon name={iconFor(c.id) as any} size={20} color="#4D535B" /></View>
                  <Text style={styles.componentTitle}>{c.name}</Text>
                  <Text style={styles.componentDetail}>{c.detail}</Text>
                  {c.warning && <Text style={styles.warning}>{c.warning}</Text>}
                </Pressable>
              ))}
            </View>
          </View>
        ))}</>}

        {tab === 'maintenance' && <View style={styles.maintenance}><Text style={styles.sectionTitle}>Manutenção da máquina</Text><MaintenanceCard icon="clipboard-check-outline" title="Preventivas" detail="Planos, seções e execuções vinculados à máquina." onPress={onPreventives}/><MaintenanceCard icon="wrench-outline" title="Ordens de serviço" detail="Acompanhe OS corretivas, preventivas e inspeções."/><MaintenanceCard icon="alert-decagram-outline" title="Findings" detail="Registre anomalias e converta para OS rastreável." onPress={onFindings}/><MaintenanceCard icon="stop-circle-outline" title="Paradas" detail={downtimes.some(item=>!item.endedAt)?'Há uma parada aberta: toque para encerrar.':'Abrir parada planejada ou não planejada.'} onPress={()=>setDowntimeForm(true)}/></View>}
        {tab === 'technical' && <><Pressable style={styles.componentAction} onPress={()=>setTechnicalForm(true)}><Icon name="tune-variant" size={20} color="#FFF"/><Text style={styles.componentActionText}>Configurar jornada e SLA</Text></Pressable><Pressable style={styles.outlineAction} onPress={()=>setExceptionForm(true)}><Icon name="calendar-alert-outline" size={19} color={C.ink}/><Text style={styles.outlineActionText}>Registrar exceção de jornada</Text></Pressable><Pressable style={styles.outlineAction} onPress={()=>void pickThreeD(selected,onImportThreeD)}><Icon name="cube-scan" size={19} color={C.ink}/><Text style={styles.outlineActionText}>{threeDModel?.status==='available'?'Substituir modelo 3D local':'Importar modelo GLB/GLTF'}</Text></Pressable><Text style={styles.sectionTitle}>Documentação técnica</Text>
        <View style={{ gap: 9 }}>
          <Doc icon="file-document-outline" title="Datasheet WEG W22" detail="PDF • PT-BR • atual" />
          <Doc icon="translate" title="Manual do inversor" detail="Original DE • tradução PT-BR" />
          <Doc icon="file-alert-outline" title="Diagrama de automação" detail="Pendente para a configuração atual" warning />
        </View>
        <Pressable style={styles.componentAction} onPress={onDocuments}><Icon name="folder-open-outline" size={20} color="#FFF"/><Text style={styles.componentActionText}>Abrir documentos locais</Text></Pressable></>}

      </ScrollView>
      <ComponentDetailModal component={component} onClose={() => setComponent(null)} onEdit={() => setEditing(component)} />
      <ComponentEditor value={editing} onClose={() => setEditing(null)} onSave={saveComponent} />
      <TechnicalForm visible={technicalForm} machine={selected} onClose={()=>setTechnicalForm(false)} onSave={async(a,b,c)=>{if(await onSaveTechnical(selected,a,b,c))setTechnicalForm(false)}}/>
      <ExceptionForm visible={exceptionForm} machine={selected} onClose={()=>setExceptionForm(false)} onSave={async(a,b)=>{if(await onAddException(selected,a,b))setExceptionForm(false)}}/>
      <DowntimeForm visible={downtimeForm} machine={selected} active={downtimes.find(item=>!item.endedAt)} onClose={()=>setDowntimeForm(false)} onOpen={async(type,startedAt,reason)=>{if(await onOpenDowntime(selected,type,startedAt,reason))setDowntimeForm(false)}} onFinish={async(downtime,endedAt)=>{if(await onCloseDowntime(downtime,endedAt))setDowntimeForm(false)}}/>
      </>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.search}>
        <Icon name="magnify" size={20} color="#FFF" />
        <TextInput value={query} onChangeText={setQuery} placeholder="Máquina, componente ou código..." placeholderTextColor="#9297A0" style={styles.searchInput} />
      </View>
      <View style={styles.grid}>
        {filtered.map(machine => (
          <Pressable key={machine.id} style={styles.machineCard} onPress={() => onSelectMachine(machine)}>
            <View style={[styles.machineDot, machine.state === 'Parada' && { backgroundColor: C.red }, machine.state === 'Atenção' && { backgroundColor: C.accent }]} />
            <View style={styles.machineIcon}><Icon name={(machine.type.includes('Prensa') ? 'cube-outline' : machine.type.includes('usinagem') ? 'cog-outline' : 'conveyor-belt') as any} size={21} color="#4D535B" /></View>
            <Text style={styles.cardMachine}>{machine.id}</Text>
            <Text style={styles.cardType}>{machine.type}</Text>
            <View style={styles.chips}>
              <Text style={styles.chip}>{machine.preventive}</Text>
              <Text style={styles.chip}>{machine.downtime} parada</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
async function pickThreeD(machine: Machine, onImport: (machine: Machine, file: { uri: string; name?: string; size?: number }) => Promise<boolean>) { try { const result = await DocumentPicker.getDocumentAsync({ type: ['model/gltf-binary', 'model/gltf+json', 'application/octet-stream'], copyToCacheDirectory: true }); if (result.canceled) return; const asset = result.assets[0]; if (!asset?.uri || !/\.(glb|gltf)$/i.test(asset.name ?? '')) { Alert.alert('Formato incompatível', 'Selecione um arquivo GLB ou GLTF.'); return; } await onImport(machine, { uri: asset.uri, name: asset.name, size: asset.size }); } catch { Alert.alert('Não foi possível importar', 'Tente selecionar o modelo novamente.'); } }
function TechnicalForm({visible,machine,onClose,onSave}:{visible:boolean;machine:Machine;onClose:()=>void;onSave:(availability:number,efficiency:number,minutes:number)=>Promise<void>}){const[availability,setAvailability]=useState('92');const[efficiency,setEfficiency]=useState('85');const[minutes,setMinutes]=useState('960');return <Modal transparent visible={visible} animationType="slide"><View style={styles.modalRoot}><Pressable style={styles.backdrop} onPress={onClose}/><View style={styles.editor}><Text style={styles.crumb}>CONFIGURAÇÃO TÉCNICA · {machine.id}</Text><Text style={styles.selectedTitle}>Jornada e SLA</Text><Text style={styles.inputLabel}>Disponibilidade mínima (%)</Text><TextInput style={styles.input} keyboardType="numeric" value={availability} onChangeText={setAvailability}/><Text style={styles.inputLabel}>Eficiência mínima (%)</Text><TextInput style={styles.input} keyboardType="numeric" value={efficiency} onChangeText={setEfficiency}/><Text style={styles.inputLabel}>Minutos planejados por dia útil</Text><TextInput style={styles.input} keyboardType="numeric" value={minutes} onChangeText={setMinutes}/><Text style={styles.small}>A jornada configurada vale de segunda a sexta; sábado recebe metade e domingo fica sem jornada.</Text><Pressable style={styles.editButton} onPress={()=>void onSave(Number(availability),Number(efficiency),Number(minutes))}><Text style={styles.editButtonText}>Salvar configuração</Text></Pressable></View></View></Modal>}
function ExceptionForm({visible,machine,onClose,onSave}:{visible:boolean;machine:Machine;onClose:()=>void;onSave:(type:'holiday'|'factoryShutdown'|'extraShift'|'reducedShift'|'maintenanceWindow',minutes:number)=>Promise<void>}){const[type,setType]=useState<'holiday'|'factoryShutdown'|'extraShift'|'reducedShift'|'maintenanceWindow'>('holiday');const[minutes,setMinutes]=useState('0');return <Modal transparent visible={visible} animationType="slide"><View style={styles.modalRoot}><Pressable style={styles.backdrop} onPress={onClose}/><View style={styles.editor}><Text style={styles.crumb}>EXCEÇÃO · {machine.id}</Text><Text style={styles.selectedTitle}>Calendário industrial</Text><View style={styles.techChips}>{(['holiday','factoryShutdown','extraShift','reducedShift','maintenanceWindow'] as const).map(item=><Pressable key={item} style={styles.techChip} onPress={()=>setType(item)}><Text style={styles.chipText}>{item}</Text></Pressable>)}</View><Text style={styles.inputLabel}>Minutos planejados (extra/reduzido)</Text><TextInput style={styles.input} keyboardType="numeric" value={minutes} onChangeText={setMinutes}/><Pressable style={styles.editButton} onPress={()=>void onSave(type,Number(minutes))}><Text style={styles.editButtonText}>Registrar para hoje</Text></Pressable></View></View></Modal>}
function DowntimeForm({visible,machine,active,onClose,onOpen,onFinish}:{visible:boolean;machine:Machine;active?:MachineDowntimeSnapshot;onClose:()=>void;onOpen:(type:'planned'|'unplanned',startedAt:string,reason:string)=>Promise<void>;onFinish:(downtime:MachineDowntimeSnapshot,endedAt:string)=>Promise<void>}){const[type,setType]=useState<'planned'|'unplanned'>('unplanned');const[reason,setReason]=useState('');const[at,setAt]=useState(new Date().toISOString().slice(0,16));return <Modal transparent visible={visible} animationType="slide"><View style={styles.modalRoot}><Pressable style={styles.backdrop} onPress={onClose}/><View style={styles.editor}><Text style={styles.crumb}>PARADA · {machine.id}</Text><Text style={styles.selectedTitle}>{active?'Encerrar parada':'Abrir parada'}</Text>{active?<><Text style={styles.small}>{active.type==='planned'?'Planejada':'Não planejada'} desde {active.startedAt}</Text><Text style={styles.inputLabel}>Fim (ISO local)</Text><TextInput style={styles.input} value={at} onChangeText={setAt}/><Pressable style={styles.editButton} onPress={()=>void onFinish(active,at)}><Text style={styles.editButtonText}>Encerrar parada</Text></Pressable></>:<><View style={styles.techChips}>{(['planned','unplanned'] as const).map(item=><Pressable key={item} style={styles.techChip} onPress={()=>setType(item)}><Text style={styles.chipText}>{item==='planned'?'Planejada':'Não planejada'}</Text></Pressable>)}</View><Text style={styles.inputLabel}>Início (ISO local)</Text><TextInput style={styles.input} value={at} onChangeText={setAt}/><Text style={styles.inputLabel}>Motivo</Text><TextInput style={styles.input} value={reason} onChangeText={setReason} placeholder="Motivo obrigatório"/><Pressable disabled={!reason.trim()} style={[styles.editButton,!reason.trim()&&{opacity:.4}]} onPress={()=>void onOpen(type,at,reason)}><Text style={styles.editButtonText}>Abrir parada</Text></Pressable></>}</View></View></Modal>}

function ComponentDetailModal({ component, onClose, onEdit }: { component: ComponentItem | null; onClose: () => void; onEdit: () => void }) {
  return <Modal visible={!!component} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalRoot}><Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.detailModal}>
        <View style={styles.modalHead}><View><Text style={styles.crumb}>COMPONENTE</Text><Text style={styles.selectedTitle}>{component?.name}</Text></View><Pressable onPress={onClose}><Icon name="close" size={22} color={C.ink} /></Pressable></View>
        <Text style={styles.small}>{component?.detail}</Text>
        <View style={styles.specGrid}>{component?.specs.map((s, i) => <Data key={i} value={s} label={['Principal', 'Elétrica / estado', 'Preventiva'][i]} />)}</View>
        <Text style={styles.docsLabel}>Documentos deste componente</Text>
        <Doc icon="file-document-outline" title="Datasheet técnico" detail="PDF • especificações e curva" />
        <Doc icon="book-open-page-variant-outline" title="Manual de manutenção" detail="PDF • procedimento revisado" />
        <Doc icon="chart-box-outline" title="Diagrama próprio" detail="PDF • ligação e referência" />
        <Pressable style={styles.editButton} onPress={onEdit}><Icon name="pencil-outline" size={18} color="#FFF" /><Text style={styles.editButtonText}>Modificar componente</Text></Pressable>
      </View>
    </View>
  </Modal>;
}

function ComponentEditor({ value, onClose, onSave }: { value: ComponentItem | 'new' | null; onClose: () => void; onSave: (item: ComponentItem) => Promise<void> }) {
  const existing = value && value !== 'new' ? value : null;
  const [name, setName] = useState('');
  const [detail, setDetail] = useState('');
  React.useEffect(() => { setName(existing?.name ?? ''); setDetail(existing?.detail ?? ''); }, [existing?.id, value]);
  const save = async () => {
    if (!name.trim()) return;
    await onSave(existing ? { ...existing, name: name.trim(), detail: detail.trim() || existing.detail } : {
      id: `component-${Date.now()}`, name: name.trim(), detail: detail.trim() || 'Componente incluído manualmente', system: 'Acionamento', specs: ['A definir', 'A definir', 'Planejar inspeção'],
    });
  };
  return <Modal visible={!!value} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalRoot}><Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.editor}><Text style={styles.crumb}>{existing ? 'MODIFICAR COMPONENTE' : 'NOVO COMPONENTE'}</Text><Text style={styles.selectedTitle}>{existing ? 'Editar dados' : 'Inserir componente'}</Text>
        <Text style={styles.inputLabel}>Nome</Text><TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Ex.: Acoplamento elástico" />
        <Text style={styles.inputLabel}>Descrição</Text><TextInput value={detail} onChangeText={setDetail} style={[styles.input, styles.textArea]} multiline placeholder="Função, estado ou observação" />
        <Pressable style={styles.editButton} onPress={save}><Text style={styles.editButtonText}>{existing ? 'Salvar alterações' : 'Inserir componente'}</Text></Pressable>
      </View>
    </View>
  </Modal>;
}

function Data({ value, label }: { value: string; label: string }) {
  return <View style={styles.data}><Text style={styles.dataValue}>{value}</Text><Text style={styles.dataLabel}>{label}</Text></View>;
}
function MaintenanceCard({icon,title,detail,onPress}:{icon:string;title:string;detail:string;onPress?:()=>void}) { return <Pressable onPress={onPress} style={styles.maintenanceCard}><View style={styles.componentIcon}><Icon name={icon as any} size={20} color="#4D535B"/></View><View style={{flex:1}}><Text style={styles.componentTitle}>{title}</Text><Text style={styles.componentDetail}>{detail}</Text></View><Icon name="chevron-right" size={20} color={C.muted}/></Pressable>; }
function percent(value?: number | null) { return value == null ? '—' : `${value.toFixed(1)}%`; }
function minutes(value?: number) { return value == null ? '—' : `${Math.round(value)} min`; }
function Doc({ icon, title, detail, warning }: { icon: string; title: string; detail: string; warning?: boolean }) {
  return (
    <Pressable style={[styles.doc, warning && { borderColor: '#F0D6A5', backgroundColor: '#FFFAF2' }]}>
      <View style={styles.docIcon}><Icon name={icon as any} size={20} color="#4D535B" /></View>
      <View style={{ flex: 1 }}><Text style={styles.docTitle}>{title}</Text><Text style={styles.docDetail}>{detail}</Text></View>
      <Icon name="chevron-right" size={20} color="#9BA0A9" />
    </Pressable>
  );
}
function iconFor(id: string) {
  if (id.includes('motor')) return 'engine-outline';
  if (id.includes('acoplamento')) return 'link-variant';
  if (id.includes('bomba')) return 'water-pump';
  if (id.includes('sensor')) return 'radar';
  if (id.includes('filtro')) return 'filter-outline';
  if (id.includes('painel')) return 'view-dashboard-outline';
  if (id.includes('rele')) return 'shield-check-outline';
  return 'cog-outline';
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingTop: 4, paddingBottom: 110 },
  search: { height: 50, flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 14, borderRadius: 18, backgroundColor: C.dark, marginBottom: 12 },
  searchInput: { flex: 1, color: '#FFF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  machineCard: { width: '48.5%', minHeight: 135, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line, borderRadius: 24, padding: 14, overflow: 'hidden' },
  machineDot: { position: 'absolute', top: 14, right: 14, width: 9, height: 9, borderRadius: 5, backgroundColor: C.green },
  machineIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#F5F7F9', alignItems: 'center', justifyContent: 'center' },
  cardMachine: { fontSize: 13, fontWeight: '800', marginTop: 14 },
  cardType: { fontSize: 10, color: C.muted, marginTop: 3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 },
  chip: { fontSize: 8, color: '#626873', backgroundColor: '#F5F7F9', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 5 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  backText: { fontSize: 11, fontWeight: '800' },
  machineInfo: { backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line, borderRadius: 26, padding: 16 },
  infoTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  crumb: { fontSize: 9, letterSpacing: 1.1, color: '#89909B', fontWeight: '800' },
  machineTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.8, marginTop: 4 },
  small: { fontSize: 9, color: C.muted, marginTop: 4 },
  state: { backgroundColor: C.greenSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 7 },
  stateText: { color: C.green, fontSize: 9, fontWeight: '800' },
  dataGrid: { flexDirection: 'row', gap: 7, marginTop: 14 },
  data: { flex: 1, minHeight: 57, backgroundColor: '#F7F8FA', borderWidth: 1, borderColor: '#EDF0F4', borderRadius: 14, padding: 8 },
  dataValue: { fontSize: 11, fontWeight: '800' },
  dataLabel: { fontSize: 7, color: C.muted, marginTop: 2 },
  statusLabel: { fontSize: 9, color: C.muted, fontWeight: '800', marginTop: 14, marginBottom: 7 },
  statusActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusAction: { borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 7, backgroundColor: '#FFF' },
  statusActionText: { fontSize: 8, fontWeight: '800', color: C.ink },
  viewer: { borderRadius: 28, overflow: 'hidden', backgroundColor: '#171B20', marginTop: 10 },
  tabs:{flexDirection:'row',gap:5,marginTop:12,overflow:'hidden'},
  tab:{paddingHorizontal:9,paddingVertical:8,borderRadius:11,backgroundColor:'#FFF',borderWidth:1,borderColor:C.line},
  tabActive:{backgroundColor:C.dark,borderColor:C.dark},tabText:{fontSize:8,fontWeight:'800',color:C.muted},tabTextActive:{color:'#FFF'},
  viewerCaption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 13 },
  componentAction: { marginTop: 10, backgroundColor: C.dark, borderRadius: 16, minHeight: 48, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  componentActionText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  outlineAction:{marginTop:8,minHeight:44,borderWidth:1,borderColor:C.line,borderRadius:15,flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center',backgroundColor:'#FFF'},outlineActionText:{fontSize:10,fontWeight:'800'},techChips:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:12},techChip:{borderWidth:1,borderColor:C.line,borderRadius:9,padding:8},chipText:{fontSize:8,color:C.muted},
  viewerTitle: { fontSize: 12, fontWeight: '800', color: '#FFF' },
  viewerSmall: { fontSize: 9, color: '#8D949D', marginTop: 2 },
  system: { marginTop: 14 },
  systemTitle: { fontSize: 12, fontWeight: '800', marginBottom: 8 },
  componentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  component: { width: '48.5%', backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 12 },
  componentWarning: { borderColor: '#F0D6A5', backgroundColor: '#FFFAF2' },
  componentIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#F5F7F9', alignItems: 'center', justifyContent: 'center' },
  componentTitle: { fontSize: 11, fontWeight: '800', marginTop: 9 },
  componentDetail: { fontSize: 9, color: C.muted, lineHeight: 13, marginTop: 3 },
  warning: { fontSize: 9, fontWeight: '800', color: '#92580A', marginTop: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '800', marginTop: 18, marginBottom: 9 },
  overviewCallout:{marginTop:10,backgroundColor:C.accentSoft,borderRadius:18,padding:12,flexDirection:'row',gap:10,alignItems:'center'},calloutTitle:{fontSize:11,fontWeight:'800'},maintenance:{gap:9},maintenanceCard:{backgroundColor:'#FFF',borderWidth:1,borderColor:C.line,borderRadius:18,padding:12,flexDirection:'row',alignItems:'center',gap:10},
  doc: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 12 },
  docIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#F5F7F9', alignItems: 'center', justifyContent: 'center' },
  docTitle: { fontSize: 11, fontWeight: '800' },
  docDetail: { fontSize: 9, color: C.muted, marginTop: 3 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(12,15,20,0.46)' },
  detailModal: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, gap: 9 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  editor: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18 },
  selectedTitle: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  specGrid: { flexDirection: 'row', gap: 7, marginTop: 12 },
  docsLabel: { fontSize: 11, fontWeight: '800', marginTop: 8 },
  editButton: { minHeight: 48, borderRadius: 15, backgroundColor: C.dark, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 7 },
  editButtonText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  inputLabel: { fontSize: 10, fontWeight: '800', color: C.muted, marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 14, backgroundColor: '#F9FAFB', padding: 12, color: C.ink },
  textArea: { minHeight: 82, textAlignVertical: 'top' },
});
