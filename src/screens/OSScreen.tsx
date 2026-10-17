import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { WorkOrder } from '../types';
import { C } from '../theme';

const rank = { 'Crítica': 0, 'Alta': 1, 'Média': 2, 'Baixa': 3 };

export function OSScreen({
  orders,
  onMachine,
  onClose,
  onTransition,
}: {
  orders: WorkOrder[];
  onMachine: (id: string) => void;
  onClose: (order: WorkOrder) => void;
  onTransition: (order: WorkOrder, action: 'schedule'|'start'|'pause'|'cancel') => Promise<boolean>;
}) {
  const [selected,setSelected]=useState<WorkOrder|null>(null);
  const open = orders.filter(o => o.status !== 'Encerrada').sort((a, b) => rank[a.priority] - rank[b.priority]);
  const critical = open.filter(o => o.priority === 'Crítica').length;

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.summary}>
        <Metric value={String(open.length)} label="OS abertas" />
        <Metric value={String(critical)} label="Críticas" />
        <Metric value="6h12" label="Downtime hoje" />
      </View>

      <View style={styles.section}><Text style={styles.sectionTitle}>Priorização</Text><Text style={styles.sectionText}>ordenada por impacto</Text></View>

      <View style={{ gap: 10 }}>
        {open.map(order => (
          <Pressable
            key={order.id}
            style={[styles.item, order.status === 'Pronta para encerrar' && styles.ready]}
            onPress={() => order.status === 'Pronta para encerrar' ? onClose(order) : setSelected(order)}
          >
            <View style={styles.top}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{order.machineId} · {order.title}</Text>
                <Text style={styles.detail}>{order.description}</Text>
              </View>
              <Priority priority={order.priority} closing={order.status === 'Pronta para encerrar'} />
            </View>
            <View style={styles.pills}>
              <Text style={styles.pill}>{order.duration}</Text>
              <Text style={styles.pill}>{order.specialty}</Text>
              <Text style={styles.pill}>{order.status}</Text>
            </View>
            <View style={styles.track}><View style={[styles.progress, { width: `${order.progress}%` }, order.status === 'Pronta para encerrar' && { backgroundColor: C.green }]} /></View>
          </Pressable>
        ))}
      </View>

      <View style={styles.analysis}>
        <Text style={styles.analysisTitle}>Análise rápida</Text>
        <View style={styles.analysisGrid}>
          <Metric value="PH-04" label="Maior impacto" />
          <Metric value="CNC-05" label="Mais reincidente" />
          <Metric value="EST-03" label="Mais perto de fechar" />
        </View>
      </View>
      <WorkOrderControl order={selected} onClose={()=>setSelected(null)} onMachine={onMachine} onTransition={onTransition} />
    </ScrollView>
  );
}
function WorkOrderControl({order,onClose,onMachine,onTransition}:{order:WorkOrder|null;onClose:()=>void;onMachine:(id:string)=>void;onTransition:(order:WorkOrder,action:'schedule'|'start'|'pause'|'cancel')=>Promise<boolean>}){const[date,setDate]=useState(new Date().toISOString());const[reason,setReason]=useState('Repriorização operacional');if(!order)return null;const run=async(action:'schedule'|'start'|'pause'|'cancel')=>{if(await onTransition(order,action))onClose();};return <Modal transparent visible animationType="slide" onRequestClose={onClose}><View style={styles.modalRoot}><Pressable style={styles.backdrop} onPress={onClose}/><View style={styles.sheet}><Text style={styles.crumb}>ORDEM DE SERVIÇO</Text><Text style={styles.modalTitle}>{order.id} · {order.title}</Text><Text style={styles.detail}>{order.description}</Text><Pressable style={styles.secondary} onPress={()=>{onMachine(order.machineId);onClose();}}><Text style={styles.secondaryText}>Abrir máquina</Text></Pressable>{order.domainStatus==='open'&&<><TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="Data ISO"/><Pressable style={styles.primary} onPress={()=>void run('schedule')}><Text style={styles.primaryText}>Agendar OS</Text></Pressable><Pressable style={styles.primary} onPress={()=>void run('start')}><Text style={styles.primaryText}>Iniciar agora</Text></Pressable></>}{order.domainStatus==='scheduled'&&<Pressable style={styles.primary} onPress={()=>void run('start')}><Text style={styles.primaryText}>Iniciar OS</Text></Pressable>}{order.domainStatus==='inProgress'&&<Pressable style={styles.primary} onPress={()=>void run('pause')}><Text style={styles.primaryText}>Pausar OS</Text></Pressable>}{order.domainStatus==='paused'&&<Pressable style={styles.primary} onPress={()=>void run('start')}><Text style={styles.primaryText}>Retomar OS</Text></Pressable>}{order.domainStatus!=='completed'&&<><TextInput style={styles.input} value={reason} onChangeText={setReason} placeholder="Motivo"/><Pressable style={styles.cancel} onPress={()=>void run('cancel')}><Text style={styles.cancelText}>Cancelar OS</Text></Pressable></>}</View></View></Modal>}

function Metric({ value, label }: { value: string; label: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}
function Priority({ priority, closing }: { priority: WorkOrder['priority']; closing: boolean }) {
  const color = closing ? C.green : priority === 'Crítica' ? C.red : priority === 'Alta' ? '#92580A' : '#5E83D7';
  const bg = closing ? C.greenSoft : priority === 'Crítica' ? C.redSoft : priority === 'Alta' ? C.accentSoft : C.blueSoft;
  return <View style={[styles.priority, { backgroundColor: bg }]}><Text style={[styles.priorityText, { color }]}>{closing ? 'Encerrar' : priority}</Text></View>;
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingTop: 4, paddingBottom: 100 },
  summary: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line, borderRadius: 17, padding: 11 },
  metricValue: { fontSize: 15, fontWeight: '800' },
  metricLabel: { fontSize: 9, color: C.muted, marginTop: 2 },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '800' },
  sectionText: { fontSize: 10, color: C.muted },
  item: { backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 14 },
  ready: { borderColor: '#CFE9DC', backgroundColor: '#FBFFFD' },
  top: { flexDirection: 'row', gap: 10 },
  title: { fontSize: 12, fontWeight: '800' },
  detail: { fontSize: 10, color: C.muted, lineHeight: 15, marginTop: 4 },
  priority: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 7, alignSelf: 'flex-start' },
  priorityText: { fontSize: 9, fontWeight: '800' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  pill: { fontSize: 9, color: '#626873', backgroundColor: '#F5F7F9', paddingHorizontal: 8, paddingVertical: 7, borderRadius: 999 },
  track: { height: 6, borderRadius: 3, backgroundColor: '#EDF0F4', overflow: 'hidden', marginTop: 12 },
  progress: { height: '100%', backgroundColor: C.accent, borderRadius: 3 },
  analysis: { marginTop: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 14 },
  analysisTitle: { fontSize: 12, fontWeight: '800', marginBottom: 9 },
  analysisGrid: { flexDirection: 'row', gap: 8 },
  modalRoot:{flex:1,justifyContent:'flex-end'},backdrop:{...StyleSheet.absoluteFill,backgroundColor:'rgba(0,0,0,.45)'},sheet:{backgroundColor:'#FFF',padding:18,borderTopLeftRadius:28,borderTopRightRadius:28,gap:9},crumb:{fontSize:9,fontWeight:'800',letterSpacing:1.1,color:C.muted},modalTitle:{fontSize:18,fontWeight:'800'},secondary:{height:42,borderWidth:1,borderColor:C.line,borderRadius:13,alignItems:'center',justifyContent:'center'},secondaryText:{fontSize:10,fontWeight:'800'},input:{borderWidth:1,borderColor:C.line,borderRadius:13,padding:11},primary:{height:46,borderRadius:13,backgroundColor:C.dark,alignItems:'center',justifyContent:'center'},primaryText:{color:'#FFF',fontSize:11,fontWeight:'800'},cancel:{alignItems:'center',padding:10},cancelText:{fontSize:10,fontWeight:'800',color:C.red},
});
